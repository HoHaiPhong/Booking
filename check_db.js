const { getPool } = require('./server/db/connections');
async function check() {
  try {
    const pool = await getPool('BAC');
    const res = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('TinhThanh', 'QuanHuyen')");
    console.log(JSON.stringify(res.recordset));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
