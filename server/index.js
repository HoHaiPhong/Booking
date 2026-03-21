require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { closeAll } = require('./db/connections');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' })); // Cho phép React gọi API
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/customers', require('./routes/customers'));

// ── Health Check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🏨 Grand Vietnam API Server đang chạy!',
    version: '1.0.0',
    endpoints: [
      'GET  /api/dashboard/status',
      'GET  /api/dashboard/revenue',
      'GET  /api/dashboard/rooms-summary',
      'GET  /api/booking/hotels?region=BAC|TRUNG|NAM',
      'GET  /api/booking/rooms?hotelId=X&region=BAC',
      'POST /api/booking/create',
      'GET  /api/customers?search=X&page=1',
      'GET  /api/customers/:passport',
    ],
  });
});

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route không tồn tại: ${req.method} ${req.path}` });
});

// ── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
});

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🏨  Grand Vietnam API Server          ║');
  console.log(`║   🚀  Đang chạy tại port ${PORT}           ║`);
  console.log('║   📡  Kết nối 3 SQL Server Instance    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});

// ── Graceful Shutdown ──────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Server] Đang tắt, đóng tất cả kết nối DB...');
  await closeAll();
  process.exit(0);
});
