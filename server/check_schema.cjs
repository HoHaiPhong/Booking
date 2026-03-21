require('dotenv').config();
const { getPool } = require('./db/connections');
async function check() {
  try {
    const pool = await getPool('BAC');
    console.log('--- Columns in ChiNhanh ---');
    const cn = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ChiNhanh'");
    console.log(JSON.stringify(cn.recordset));
    
    console.log('\n--- Columns in KhachSan ---');
    const ks = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'KhachSan'");
    console.log(JSON.stringify(ks.recordset));
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
