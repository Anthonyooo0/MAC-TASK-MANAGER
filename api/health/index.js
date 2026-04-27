const ADMIN_EMAIL = 'anthony.jimenez@macproducts.net';

module.exports = async function (context, req) {
  const userEmail = (req.headers['x-user-email'] || '').toLowerCase();
  if (userEmail !== ADMIN_EMAIL) {
    context.res = { status: 403, body: { error: 'Forbidden' } };
    return;
  }

  const env = {
    DB_SERVER: process.env.DB_SERVER || '(not set)',
    DB_NAME: process.env.DB_NAME || '(not set)',
    DB_USER: process.env.DB_USER ? '(set)' : '(not set)',
    DB_PASSWORD: process.env.DB_PASSWORD ? '(set)' : '(not set)',
    NODE_VERSION: process.version,
  };

  let dbStatus = 'unknown';
  let dbError = null;
  let taskCount = null;
  let mssqlVersion = null;

  try {
    const sql = require('mssql');
    mssqlVersion = require('mssql/package.json').version;

    const pool = await sql.connect({
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: { encrypt: true, trustServerCertificate: false },
    });

    const result = await pool.request().query('SELECT COUNT(*) AS count FROM tasks');
    taskCount = result.recordset[0].count;
    dbStatus = 'connected';
    await pool.close();
  } catch (err) {
    dbStatus = 'failed';
    dbError = { message: err.message, code: err.code, stack: err.stack };
  }

  context.res = {
    status: 200,
    body: { env, dbStatus, dbError, taskCount, mssqlVersion },
  };
};
