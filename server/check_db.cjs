require('dotenv').config();
const { getPool } = require('./db/connections');
async function check() {
  try {
    const pool = await getPool('BAC');
    console.log('Checking tables...');
    const res = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('TinhThanh', 'QuanHuyen', 'KhachSan')");
    console.log(JSON.stringify(res.recordset));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
