const { getPool, sql } = require('../db');

const ADMIN_EMAIL = 'anthony.jimenez@macproducts.net';

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const method = req.method.toUpperCase();
    const callerEmail = (req.headers['x-user-email'] || '').toLowerCase();

    if (method === 'GET') {
      // Admin-only: read access to the audit log
      if (callerEmail !== ADMIN_EMAIL) {
        context.res = { status: 403, body: { error: 'Forbidden' } };
        return;
      }
      // Optional pagination — limit to most recent 500 by default
      const limit = parseInt(req.query.limit || '500', 10);
      const result = await pool.request()
        .input('limit', sql.Int, Math.min(Math.max(limit, 1), 5000))
        .query('SELECT TOP (@limit) * FROM changelog ORDER BY created_at DESC');
      context.res = { status: 200, body: result.recordset };

    } else if (method === 'POST') {
      // Open: anyone can log their own actions (e.g. sign-in events from the frontend)
      const e = req.body || {};
      // Trust the header, not the body, so users can't spoof other accounts
      const writerEmail = callerEmail || (e.userEmail || '').toLowerCase();
      await pool.request()
        .input('user_email', sql.NVarChar, writerEmail)
        .input('task_id', sql.NVarChar, e.taskId || '')
        .input('task_title', sql.NVarChar, (e.taskTitle || '').slice(0, 500))
        .input('action', sql.NVarChar, e.action || '')
        .input('changes', sql.NVarChar, e.changes || '')
        .query(`INSERT INTO changelog (user_email, task_id, task_title, action, changes)
                VALUES (@user_email, @task_id, @task_title, @action, @changes)`);
      context.res = { status: 201, body: { success: true } };

    } else {
      context.res = { status: 400, body: { error: 'Invalid request' } };
    }
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
