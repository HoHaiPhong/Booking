const express = require('express');
const router = express.Router();
const { getPool, checkStatus } = require('../db/connections');

// API: Lấy trạng thái kết nối của 3 server (Dùng cho Sidebar)
router.get('/status', async (req, res) => {
  const regions = ['north', 'central', 'south'];
  const status = {};
  
  await Promise.all(regions.map(async (reg) => {
    status[reg] = await checkStatus(reg);
  }));

  res.json({
    ...status,
    checkedAt: new Date()
  });
});

/**
 * Helper để thực hiện query với retry nhẹ nếu lỗi transient
 */
async function queryWithRetry(region, sqlQuery, retries = 1) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const pool = await getPool(region);
      return await pool.request().query(sqlQuery);
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        console.warn(`[DB] Thử lại ${region} (${i+1}/${retries})...`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  throw lastErr;
}

// API: Lấy doanh thu toàn quốc (Ánh xạ chuẩn theo Dashboard.jsx)
router.get('/revenue', async (req, res) => {
  try {
    // Thử lấy từ North (thường chứa View Toàn Quốc nếu cấu hình đúng)
    const result = await queryWithRetry('north', `
      SELECT 
        Vung as MienKhuVuc, 
        DoanhThu as TongDoanhThu,
        MONTH(GETDATE()) as Thang,
        YEAR(GETDATE()) as Nam
      FROM VW_DOANHTHU_TOAN_QUOC
    `);
    
    res.json({ data: result.recordset });
  } catch (err) {
    console.error('[Dashboard/revenue] Lỗi:', err.message);
    res.json({ data: [] }); // Trả về mảng rỗng thay vì 500 để UI không bị vỡ biểu đồ
  }
});

// API: Lấy tổng hợp số phòng và trạng thái 3 miền (Ánh xạ chuẩn Dashboard.jsx)
router.get('/rooms-summary', async (req, res) => {
  const regionalData = [
    { key: 'north',   label: 'Miền Bắc',  code: 'BAC' },
    { key: 'central', label: 'Miền Trung', code: 'TRUNG' },
    { key: 'south',   label: 'Miền Nam',   code: 'NAM' }
  ];

  const results = await Promise.all(regionalData.map(async (reg) => {
    try {
      const roomResult = await queryWithRetry(reg.key, 'SELECT COUNT(*) as total FROM Phong');
      const totalRooms = roomResult.recordset[0].total || 0;
      
      // Giả lập số phòng khả dụng (0.6 - 0.9 x totalRooms)
      // Trong thực tế sẽ trừ đi số dòng trong Phiếu Đặt đang 'Đã đặt'
      const mockAvailable = Math.max(0, Math.floor(totalRooms * (0.5 + Math.random() * 0.4)));

      return {
        region: reg.key,
        label: reg.label,
        soPhongTrong: mockAvailable,
        status: 'online'
      };
    } catch (e) {
      console.error(`[Dashboard/rooms] Lỗi ${reg.key}:`, e.message);
      return {
        region: reg.key,
        label: reg.label,
        soPhongTrong: 0,
        status: 'offline'
      };
    }
  }));

  res.json({ data: results });
});

module.exports = router;
