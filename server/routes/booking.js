const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connections');

// API: Lấy danh sách Tỉnh/Thành phố (TenCN) từ bảng ChiNhanh
router.get('/provinces', async (req, res) => {
  const { region } = req.query; // region: 'BAC', 'TRUNG', 'NAM'
  try {
    const pool = await getPool(region);
    // Lấy DISTINCT TenCN (đóng vai trò Tỉnh/Thành)
    const result = await pool.request()
      .query('SELECT DISTINCT TenCN FROM ChiNhanh');
    
    res.json({ data: result.recordset.map(cn => ({ 
      MaTinh: cn.TenCN,  // Dùng tên làm ID vì nó là cấp cha
      TenTinh: cn.TenCN 
    })) });
  } catch (err) {
    console.error(`[Booking/provinces] Lỗi region ${region}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy danh sách Quận/Huyện (DiaChi) theo Tỉnh/Thành
router.get('/districts', async (req, res) => {
  const { region, provinceId } = req.query; // provinceId ở đây là TenCN
  try {
    const pool = await getPool(region);
    // Lấy MaCN và DiaChi (Quận/Huyện)
    const result = await pool.request()
      .input('provinceName', sql.NVarChar, provinceId)
      .query('SELECT MaCN, DiaChi FROM ChiNhanh WHERE TenCN = @provinceName');
    
    res.json({ data: result.recordset.map(cn => ({ 
      MaQuan: cn.MaCN,   // Dùng MaCN làm ID để lọc khách sạn ở bước sau
      TenQuan: cn.DiaChi 
    })) });
  } catch (err) {
    console.error(`[Booking/districts] Lỗi tỉnh ${provinceId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy danh sách khách sạn theo Chi Nhánh (MaCN) - đóng vai trò Quận/Huyện
router.get('/hotels', async (req, res) => {
  const { region, districtId } = req.query; // districtId ở đây chính là MaCN
  try {
    const pool = await getPool(region);
    const result = await pool.request()
      .input('maCN', sql.VarChar, districtId)
      .query(`
        SELECT 
          MaKS as MaKhachSan, 
          TenKS as TenKhachSan, 
          DiaChi as ThanhPho,
          3 as SaoXep
        FROM KhachSan
        WHERE MaCN = @maCN OR @maCN IS NULL
      `);
    res.json({ data: result.recordset });
  } catch (err) {
    console.error(`[Booking/hotels] Lỗi branch ${districtId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy danh sách loại phòng (Group by LoaiPhong)
router.get('/rooms', async (req, res) => {
  const { region, hotelId } = req.query;
  try {
    const pool = await getPool(region);
    const result = await pool.request()
      .input('hotelId', sql.VarChar, hotelId)
      .query(`
        SELECT 
          lp.MaLoai,
          lp.TenLoai as LoaiPhong, 
          lp.GiaNiemYet as GiaPhong,
          COUNT(p.MaPhong) as SoLuongTrong,
          N'Phòng tiêu chuẩn Grand Vietnam' as MoTa
        FROM Phong p
        JOIN LoaiPhong lp ON RTRIM(p.MaLoai) = RTRIM(lp.MaLoai)
        WHERE RTRIM(p.MaKS) = RTRIM(@hotelId)
        GROUP BY lp.MaLoai, lp.TenLoai, lp.GiaNiemYet
      `);
    res.json({ data: result.recordset });
  } catch (err) {
    console.error(`[Booking/rooms] Lỗi hotel ${hotelId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Tạo phiếu đặt phòng mới (Tự động gán phòng theo loại)
router.post('/create', async (req, res) => {
  const { region, hotelId, tenKhach, passport, roomTypeId, ngayNhanPhong, ngayTraPhong } = req.body;
  
  try {
    const pool = await getPool(region);
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    try {
      // 1. Tìm 1 phòng trống của Loại phòng này
      const roomPick = await transaction.request()
        .input('hotelId', sql.VarChar, hotelId)
        .input('maLoai', sql.VarChar, roomTypeId)
        .query(`
          SELECT TOP 1 MaPhong FROM Phong 
          WHERE MaKS = @hotelId AND MaLoai = @maLoai
          AND MaPhong NOT IN (
             SELECT MaPhong FROM ChiTietDat ctd 
             JOIN PhieuDat pd ON ctd.MaPhieu = pd.MaPhieu
             WHERE pd.MaKS = @hotelId AND pd.TrangThai <> N'Đã hủy'
          )
        `);
      
      if (roomPick.recordset.length === 0) {
        throw new Error('Rất tiếc, đã hết phòng loại này!');
      }
      const maPhong = roomPick.recordset[0].MaPhong;

      // 2. Kiểm tra hoặc tạo Khách hàng
      let customerResult = await transaction.request()
        .input('passport', sql.VarChar, passport)
        .query('SELECT MaKH FROM KhachHang WHERE Passport = @passport');
      
      let maKH;
      if (customerResult.recordset.length === 0) {
        maKH = 'KH' + Date.now().toString().slice(-8);
        await transaction.request()
          .input('maKH', sql.VarChar, maKH)
          .input('passport', sql.VarChar, passport)
          .query('INSERT INTO KhachHang (MaKH, Passport) VALUES (@maKH, @passport)');
      } else {
        maKH = customerResult.recordset[0].MaKH;
      }

      // 3. Tạo Phiếu Đặt
      const maPhieu = 'PD' + Date.now().toString().slice(-8);
      
      // Lấy giá loại phòng để tính tiền sơ bộ (tính tại server cho an toàn)
      const lpInfo = await transaction.request()
        .input('maLoai', sql.VarChar, roomTypeId)
        .query('SELECT GiaNiemYet FROM LoaiPhong WHERE MaLoai = @maLoai');
      
      const start = new Date(ngayNhanPhong);
      const end = new Date(ngayTraPhong);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const tongTien = lpInfo.recordset[0].GiaNiemYet * Math.max(1, nights);

      await transaction.request()
        .input('maPhieu', sql.VarChar, maPhieu)
        .input('ngayDen', sql.Date, ngayNhanPhong)
        .input('ngayDi', sql.Date, ngayTraPhong)
        .input('tongTien', sql.Decimal(18, 2), tongTien)
        .input('maKH', sql.VarChar, maKH)
        .input('maKS', sql.VarChar, hotelId)
        .query(`
          INSERT INTO PhieuDat (MaPhieu, NgayDen, NgayDi, TongTien, TrangThai, MaKH, MaKS) 
          VALUES (@maPhieu, @ngayDen, @ngayDi, @tongTien, N'Đã đặt', @maKH, @maKS)
        `);

      // 4. Tạo Chi Tiết Đặt
      const maCT = 'CT' + Date.now().toString().slice(-8);
      await transaction.request()
        .input('maCT', sql.VarChar, maCT)
        .input('maPhieu', sql.VarChar, maPhieu)
        .input('maPhong', sql.VarChar, maPhong)
        .query('INSERT INTO ChiTietDat (MaChiTietDat, MaPhieu, MaPhong, SoLuongPhong) VALUES (@maCT, @maPhieu, @maPhong, 1)');

      await transaction.commit();
      res.json({ data: { maPhieuDat: maPhieu, maPhong: maPhong } });
    } catch (err) {
      if (transaction._isStarted) await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('[Booking/create] Lỗi:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
