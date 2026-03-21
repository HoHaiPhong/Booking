require('dotenv').config();
const sql = require('mssql');

/**
 * Tách cấu hình từ environment variables.
 * Nếu có PORT => dùng kết nối trực tiếp qua TCP (không cần SQL Browser).
 */
function makeConfig(server, database, user, password, port) {
  // Nếu server là tên máy cục bộ => dùng '127.0.0.1' để tránh lỗi DNS
  const localNames = ['PHONG', 'localhost', '.', '127.0.0.1'];
  const host = localNames.includes((server || '').toUpperCase()) ? '127.0.0.1' : server;

  const config = {
    server: host,
    database: database,
    user: user,
    password: password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };

  if (port) {
    config.port = parseInt(port);
  }

  return config;
}

const configs = {
  north: makeConfig(
    process.env.DB_NORTH_SERVER,
    process.env.DB_NORTH_DATABASE,
    process.env.DB_NORTH_USER,
    process.env.DB_NORTH_PASSWORD,
    process.env.DB_NORTH_PORT
  ),
  central: makeConfig(
    process.env.DB_CENTRAL_SERVER,
    process.env.DB_CENTRAL_DATABASE,
    process.env.DB_CENTRAL_USER,
    process.env.DB_CENTRAL_PASSWORD,
    process.env.DB_CENTRAL_PORT
  ),
  south: makeConfig(
    process.env.DB_SOUTH_SERVER,
    process.env.DB_SOUTH_DATABASE,
    process.env.DB_SOUTH_USER,
    process.env.DB_SOUTH_PASSWORD,
    process.env.DB_SOUTH_PORT
  ),
};

// Cache pool và thời gian lỗi (tránh retry storm)
const pools = {};
const lastError = {};
const RETRY_COOLDOWN_MS = 10000;

/**
 * Chuyển đổi mã miền từ Frontend (BAC, TRUNG, NAM) sang key cấu hình (north, central, south)
 */
function mapRegion(input) {
  const m = (input || '').toLowerCase();
  if (['north', 'bac'].includes(m)) return 'north';
  if (['central', 'trung'].includes(m)) return 'central';
  if (['south', 'nam'].includes(m)) return 'south';
  return m;
}

/**
 * Lấy connection pool theo miền
 */
async function getPool(regionInput) {
  const region = mapRegion(regionInput);
  if (!configs[region]) {
    throw new Error(`Không tìm thấy cấu hình cho region: ${regionInput}`);
  }

  // Nếu pool còn tồn tại và kết nối, dùng lại ngay
  if (pools[region] && pools[region].connected) {
    return pools[region];
  }

  // Giải phóng pool cũ nếu bị ngắt
  if (pools[region]) {
    try { await pools[region].close(); } catch (_) {}
    pools[region] = null;
  }

  // Cooldown 5s sau lỗi để tránh reconnect storm
  if (lastError[region] && Date.now() - lastError[region] < 5000) {
    throw new Error(`Server ${region} đang offline (cooldown).`);
  }

  const cfg = configs[region];
  const label = `${cfg.server}:${cfg.port || '1433'}`;
  try {
    console.log(`[DB] Kết nối ${region.toUpperCase()} -> ${label}`);
    const pool = new sql.ConnectionPool(cfg);
    pools[region] = await pool.connect();
    delete lastError[region];
    console.log(`[DB] ✅ Kết nối ${region.toUpperCase()} thành công!`);
    return pools[region];
  } catch (err) {
    console.error(`[DB] ❌ Lỗi kết nối ${region.toUpperCase()}:`, err.message);
    lastError[region] = Date.now();
    pools[region] = null;
    throw err;
  }
}

/**
 * Kiểm tra trạng thái kết nối
 */
async function checkStatus(regionInput) {
  const region = mapRegion(regionInput);
  try {
    const pool = await getPool(region);
    await pool.request().query('SELECT 1 AS ok');
    return 'online';
  } catch (err) {
    return 'offline';
  }
}

/**
 * Đóng tất cả pool khi tắt server
 */
async function closeAll() {
  for (const region of Object.keys(pools)) {
    try {
      if (pools[region]) await pools[region].close();
      console.log(`[DB] Đã đóng pool ${region}`);
    } catch (e) { /* ignore */ }
  }
}

module.exports = { getPool, checkStatus, closeAll, sql };
