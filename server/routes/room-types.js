const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connections');

// Dữ liệu danh mục nên được quản lý tập trung hoặc ưu tiên ở Trụ sở (Miền Nam)
const MASTER_REGION = 'south';

// GET: Lấy danh sách LoaiPhong
router.get('/', async (req, res) => {
  try {
    const pool = await getPool(MASTER_REGION);
    const result = await pool.request().query('SELECT * FROM LoaiPhong');
    res.json({ data: result.recordset });
  } catch (err) {
    console.error('[RoomTypes/GET]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST: Thêm Loại Phòng
router.post('/', async (req, res) => {
  const { MaLoai, TenLoai, GiaNiemYet } = req.body;
  try {
    const pool = await getPool(MASTER_REGION);
    await pool.request()
      .input('MaLoai', sql.VarChar, MaLoai)
      .input('TenLoai', sql.NVarChar, TenLoai)
      .input('GiaNiemYet', sql.Decimal(18, 2), GiaNiemYet)
      .query(`
        INSERT INTO LoaiPhong (MaLoai, TenLoai, GiaNiemYet) 
        VALUES (@MaLoai, @TenLoai, @GiaNiemYet)
      `);
    res.json({ success: true });
  } catch (err) {
    console.error('[RoomTypes/POST]', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT: Cập nhật thông tin Loại Phòng
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { TenLoai, GiaNiemYet } = req.body;
  try {
    const pool = await getPool(MASTER_REGION);
    await pool.request()
      .input('MaLoai', sql.VarChar, id)
      .input('TenLoai', sql.NVarChar, TenLoai)
      .input('GiaNiemYet', sql.Decimal(18, 2), GiaNiemYet)
      .query(`
        UPDATE LoaiPhong 
        SET TenLoai = @TenLoai, GiaNiemYet = @GiaNiemYet 
        WHERE MaLoai = @MaLoai
      `);
    res.json({ success: true });
  } catch (err) {
    console.error('[RoomTypes/PUT]', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE: Xóa Loại Phòng (Kích hoạt tr_KiemTraXoaLoaiPhong)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool(MASTER_REGION);
    await pool.request()
      .input('MaLoai', sql.VarChar, id)
      .query('DELETE FROM LoaiPhong WHERE MaLoai = @MaLoai');
    res.json({ success: true });
  } catch (err) {
    console.error('[RoomTypes/DELETE - LỖI TRIGGER]', err.message);
    // Bắt lỗi T-SQL do RAISERROR từ Trigger và trả về cho React Alert hiển thị
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
