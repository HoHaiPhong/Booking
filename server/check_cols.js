const sql = require('mssql');
require('dotenv').config();

const config = {
  server: '127.0.0.1',
  port: 58208,
  database: 'GRANDVN_NORTH',
  user: 'grandvietnam',
  password: '123456',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function check() {
  try {
    await sql.connect(config);
    const result = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'KhachHang'");
    console.log(JSON.stringify(result.recordset, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

check();
