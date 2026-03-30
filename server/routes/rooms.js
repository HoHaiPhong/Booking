const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connections');

// Lấy danh sách phòng theo region và MaKS
router.get('/', async (req, res) => {
  const { region, hotelId } = req.query;
  
  if (!region || !hotelId) {
    return res.status(400).json({ error: 'Vui lòng cung cấp region và hotelId.' });
  }

  try {
    const pool = await getPool(region);
    const result = await pool.request()
      .input('hotelId', sql.VarChar, hotelId)
      .query(`
        SELECT 
          p.MaPhong,
          p.SoPhong,
          p.MaLoai,
          p.MaKS,
          lp.TenLoai as TenLoaiPhong,
          lp.GiaNiemYet
        FROM Phong p
        LEFT JOIN LoaiPhong lp ON RTRIM(p.MaLoai) = RTRIM(lp.MaLoai)
        WHERE RTRIM(p.MaKS) = RTRIM(@hotelId)
        ORDER BY p.MaPhong ASC
      `);

    res.json({ data: result.recordset });
  } catch (err) {
    console.error(`[Rooms/GET] Lỗi tại ${region}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// Thêm phòng mới
router.post('/', async (req, res) => {
  const { region, maPhong, soPhong, maLoai, maKS } = req.body;

  if (!region || !maPhong || !soPhong || !maLoai || !maKS) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ Mã Phòng, Số Phòng, Mã Loại và Mã KS.' });
  }

  try {
    const pool = await getPool(region);
    await pool.request()
      .input('maPhong', sql.VarChar, maPhong)
      .input('soPhong', sql.VarChar, soPhong)
      .input('maLoai', sql.VarChar, maLoai)
      .input('maKS', sql.VarChar, maKS)
      .query(`
        INSERT INTO Phong (MaPhong, SoPhong, MaLoai, MaKS) 
        VALUES (@maPhong, @soPhong, @maLoai, @maKS)
      `);

    res.json({ success: true, message: 'Thêm phòng thành công.' });
  } catch (err) {
    console.error(`[Rooms/POST] Lỗi tại ${region}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// Xóa phòng
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { region } = req.query;

  if (!region) {
    return res.status(400).json({ message: 'Thiếu thông tin phân mảnh (region).' });
  }

  try {
    const pool = await getPool(region);
    await pool.request()
      .input('maPhong', sql.VarChar, id)
      .query('DELETE FROM Phong WHERE MaPhong = @maPhong');

    res.json({ success: true, message: 'Xoá phòng thành công.' });
  } catch (err) {
    console.error(`[Rooms/DELETE] Lỗi tại ${region}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
