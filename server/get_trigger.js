const { getPool, closeAll } = require('./db/connections');

async function checkTriggers() {
  try {
    const pool = await getPool('north');
    const result = await pool.request().query(`
      SELECT 
        tr.name AS TriggerName, 
        te.type_desc AS EventType, 
        m.definition AS Statement
      FROM sys.triggers tr
      INNER JOIN sys.trigger_events te ON te.object_id = tr.object_id
      INNER JOIN sys.sql_modules m ON m.object_id = tr.object_id
      INNER JOIN sys.tables t ON tr.parent_id = t.object_id
      WHERE t.name IN ('PhieuDat', 'ChiTietDat', 'KhachHang', 'Phong')
    `);
    
    console.log("Triggers found:", result.recordset.length);
    result.recordset.forEach(r => {
      console.log('--- TRIGGER:', r.TriggerName);
      console.log(r.Statement);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await closeAll();
  }
}

checkTriggers();
