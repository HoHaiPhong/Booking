const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connections');

// GET /staying-danang: Query khách lưu trú ở Đà Nẵng
router.get('/staying-danang', async (req, res) => {
  try {
    // Theo nghiệp vụ: Đà Nẵng thuộc Miền Trung -> Kết nối Central Server
    const pool = await getPool('central');
    
    // Tìm các Phiếu Đặt đang ở trạng thái 'DangO'
    // Lưu ý: Tùy scheme bảng KhachHang mà cột Tên khách có thể là 'HoTen' hoặc 'HoKhach' + 'TenKhach'
    // Ở đây ta dùng cách an toàn là chọn các cột cần thiết và join.
    const result = await pool.request().query(`
      SELECT 
        pd.MaPhieu, 
        k.Passport as TenKhach, -- Fallback nếu bảng tách HoKhach, TenKhach
        ks.TenKS as TenKhachSan, 
        FORMAT(pd.NgayDen, 'dd/MM/yyyy') as NgayDen
      FROM PhieuDat pd
      JOIN KhachSan ks ON pd.MaKS = ks.MaKS
      JOIN KhachHang k ON pd.MaKH = k.MaKH
      WHERE pd.TrangThai = N'DangO' 
        -- Có thể thêm điều kiện lọc KS ở Đà Nẵng nếu cần: AND ks.DiaChi LIKE N'%Đà Nẵng%'
    `);
    
    // Map data lại xíu để UI hiển thị đẹp (nếu bảng KhachHang có cả HoKhach và TenKhach)
    // Front-end yêu cầu các trường: MaPhieu, TenKhach, TenKhachSan, NgayDen
    res.json({ data: result.recordset });
  } catch (err) {
    console.error('[Reception/Danang]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /checkin: Thực thi SP CheckInKhachHang
router.post('/checkin', async (req, res) => {
  const { MaKH } = req.body;
  if (!MaKH) return res.status(400).json({ message: 'Thiếu MaKH' });

  try {
    // Có thể đứng từ Trạm bất kỳ (ví dụ Miền Bắc hoặc Trung) gọi SP
    const pool = await getPool('north'); 

    // Thực thi Stored Procedure: usp_CheckInKhachHang
    const result = await pool.request()
      .input('MaKH', sql.VarChar, MaKH)
      .execute('usp_CheckInKhachHang');

    // SPusp_CheckInKhachHang trả về 1 dòng: HoTen, DiemTichLuy, XepHang
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin điểm thưởng từ Miền Nam cho KH này.' });
    }

    res.json({ data: result.recordset[0] });
  } catch (err) {
    console.error('[Reception/Checkin SP]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
