const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'mac-sql-server.database.windows.net',
  database: process.env.DB_NAME || 'MAC-TASk-MANAGER',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = { getPool, sql };
