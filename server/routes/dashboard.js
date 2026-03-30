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
      const hotelResult = await queryWithRetry(reg.key, 'SELECT COUNT(*) as total FROM KhachSan');
      const totalHotels = hotelResult.recordset[0].total || 0;
      
      return {
        region: reg.key,
        label: reg.label,
        soKhachSan: totalHotels,
        status: 'online'
      };
    } catch (e) {
      console.error(`[Dashboard/rooms] Lỗi ${reg.key}:`, e.message);
      return {
        region: reg.key,
        label: reg.label,
        soKhachSan: 0,
        status: 'offline'
      };
    }
  }));

  res.json({ data: results });
});

// API: Đếm Phiếu Đặt bị hủy trong năm 2025
router.get('/canceled-tickets-2025', async (req, res) => {
  const regions = ['north', 'central', 'south'];
  let totalCanceled = 0;

  // Thực thi trên từng Linked Server hoặc Trạm địa phương
  await Promise.all(regions.map(async (reg) => {
    try {
      // Câu truy vấn tính COUNT trực tiếp.
      // Nếu bạn có viết hàm Function trong SQL, hãy thay bằng: SELECT dbo.fn_DemPhieuHuy(2025) as count
      const result = await queryWithRetry(reg, `
        SELECT COUNT(*) as count 
        FROM PhieuDat 
        WHERE TrangThai = N'Đã hủy' AND YEAR(NgayDen) = 2025
      `);
      
      const count = result.recordset[0].count || 0;
      totalCanceled += count;
    } catch (err) {
      console.error(`[Dashboard/canceled] Lỗi đếm tại trạm ${reg}:`, err.message);
    }
  }));

  res.json({ data: totalCanceled });
});

module.exports = router;
