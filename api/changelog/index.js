const { getPool, sql } = require('../db');

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const method = req.method.toUpperCase();

    if (method === 'GET') {
      const result = await pool.request().query('SELECT * FROM changelog ORDER BY created_at DESC');
      context.res = { status: 200, body: result.recordset };

    } else if (method === 'POST') {
      const e = req.body;
      await pool.request()
        .input('user_email', sql.NVarChar, e.userEmail)
        .input('task_id', sql.NVarChar, e.taskId)
        .input('task_title', sql.NVarChar, e.taskTitle)
        .input('action', sql.NVarChar, e.action)
        .input('changes', sql.NVarChar, e.changes)
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
