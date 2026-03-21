const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connections');

// API: Tìm kiếm khách hàng toàn quốc (Tra cứu song song 3 miền)
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const regions = ['north', 'central', 'south'];
  
  try {
    const results = await Promise.all(regions.map(async (reg) => {
      try {
        const pool = await getPool(reg);
        const request = pool.request();
        let query = 'SELECT MaKH, Passport FROM KhachHang';
        
        if (search) {
          request.input('search', sql.VarChar, `%${search}%`);
          query += ' WHERE Passport LIKE @search OR MaKH LIKE @search';
        }
        
        const result = await request.query(query);
        return result.recordset.map(row => ({
          MaKH:        row.MaKH,
          SoPassport:  row.Passport,
          HoKhach:     '',
          TenKhach:    row.Passport,
          SoDienThoai: null,
          region: reg
        }));
      } catch (e) {
        console.error(`[Customers] Lỗi ${reg}:`, e.message);
        return [];
      }
    }));

    const allCustomers = results.flat();
    const uniqueCustomers = [];
    const seenPassports = new Set();
    for (const c of allCustomers) {
      if (!seenPassports.has(c.SoPassport)) {
        seenPassports.add(c.SoPassport);
        uniqueCustomers.push(c);
      }
    }

    const total = uniqueCustomers.length;
    const totalPages = Math.max(1, Math.ceil(total / parseInt(limit)));
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paged = uniqueCustomers.slice(start, start + parseInt(limit));

    res.json({
      data: paged,
      pagination: { total, totalPages, page: parseInt(page) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy lịch sử đặt phòng của 1 khách hàng theo Passport
router.get('/:passport', async (req, res) => {
  const { passport } = req.params;
  const regions = ['north', 'central', 'south'];

  try {
    const allBookings = await Promise.all(regions.map(async (reg) => {
      try {
        const pool = await getPool(reg);
        const bookings = await pool.request()
          .input('passport', sql.VarChar, passport)
          .query(`
            SELECT pd.MaPhieu, pd.NgayDen, pd.NgayDi, pd.TongTien, pd.TrangThai, ks.TenKS 
            FROM PhieuDat pd
            JOIN KhachHang kh ON pd.MaKH = kh.MaKH
            JOIN KhachSan ks ON pd.MaKS = ks.MaKS
            WHERE kh.Passport = @passport
            ORDER BY pd.NgayDen DESC
          `);
        return bookings.recordset.map(row => ({ ...row, region: reg }));
      } catch (e) {
        return [];
      }
    }));

    const lichSu = allBookings.flat().sort((a, b) => new Date(b.NgayDen) - new Date(a.NgayDen));
    const khach = {
      SoPassport:  passport,
      HoKhach:     '',
      TenKhach:    passport,
      SoDienThoai: null
    };

    res.json({ data: { khach, lichSu } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
