const { getPool, sql } = require('../db');

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const method = req.method.toUpperCase();
    const id = context.bindingData.id;

    if (method === 'GET') {
      const result = await pool.request().query('SELECT * FROM tasks ORDER BY id');
      context.res = { status: 200, body: result.recordset };

    } else if (method === 'POST') {
      const t = req.body;
      const result = await pool.request()
        .input('id', sql.NVarChar, t.id)
        .input('title', sql.NVarChar, t.title)
        .input('category', sql.NVarChar, t.category)
        .input('priority', sql.Int, t.priority)
        .input('status', sql.NVarChar, t.status)
        .input('duration', sql.NVarChar, t.duration)
        .input('source', sql.NVarChar, t.source)
        .input('delegated', sql.NVarChar, t.delegated || '')
        .input('energy', sql.NVarChar, t.energy || '')
        .input('requester', sql.NVarChar, t.requester || '')
        .input('received', sql.NVarChar, t.received || '')
        .input('due', sql.NVarChar, t.due || '')
        .input('start_date', sql.NVarChar, t.start || '')
        .input('parent', sql.NVarChar, t.parent || '')
        .input('tags', sql.NVarChar, t.tags || '')
        .input('waiting', sql.NVarChar, t.waiting || '')
        .input('nextaction', sql.NVarChar, t.nextaction || '')
        .input('links', sql.NVarChar, t.links || '')
        .input('notes', sql.NVarChar, t.notes || '')
        .input('location', sql.NVarChar, t.location || 'notebook')
        .input('calendar_week', sql.Int, t.calendarPosition?.week || null)
        .input('calendar_day', sql.Int, t.calendarPosition?.day || null)
        .input('calendar_slot', sql.Int, t.calendarPosition?.slot || null)
        .query(`INSERT INTO tasks (id, title, category, priority, status, duration, source, delegated, energy, requester, received, due, start_date, parent, tags, waiting, nextaction, links, notes, location, calendar_week, calendar_day, calendar_slot)
                VALUES (@id, @title, @category, @priority, @status, @duration, @source, @delegated, @energy, @requester, @received, @due, @start_date, @parent, @tags, @waiting, @nextaction, @links, @notes, @location, @calendar_week, @calendar_day, @calendar_slot)`);
      context.res = { status: 201, body: { success: true } };

    } else if (method === 'PUT' && id) {
      const t = req.body;
      await pool.request()
        .input('id', sql.NVarChar, id)
        .input('title', sql.NVarChar, t.title)
        .input('category', sql.NVarChar, t.category)
        .input('priority', sql.Int, t.priority)
        .input('status', sql.NVarChar, t.status)
        .input('duration', sql.NVarChar, t.duration)
        .input('source', sql.NVarChar, t.source)
        .input('delegated', sql.NVarChar, t.delegated || '')
        .input('energy', sql.NVarChar, t.energy || '')
        .input('requester', sql.NVarChar, t.requester || '')
        .input('received', sql.NVarChar, t.received || '')
        .input('due', sql.NVarChar, t.due || '')
        .input('start_date', sql.NVarChar, t.start || '')
        .input('parent', sql.NVarChar, t.parent || '')
        .input('tags', sql.NVarChar, t.tags || '')
        .input('waiting', sql.NVarChar, t.waiting || '')
        .input('nextaction', sql.NVarChar, t.nextaction || '')
        .input('links', sql.NVarChar, t.links || '')
        .input('notes', sql.NVarChar, t.notes || '')
        .input('location', sql.NVarChar, t.location || 'notebook')
        .input('calendar_week', sql.Int, t.calendarPosition?.week || null)
        .input('calendar_day', sql.Int, t.calendarPosition?.day || null)
        .input('calendar_slot', sql.Int, t.calendarPosition?.slot || null)
        .query(`UPDATE tasks SET title=@title, category=@category, priority=@priority, status=@status, duration=@duration, source=@source, delegated=@delegated, energy=@energy, requester=@requester, received=@received, due=@due, start_date=@start_date, parent=@parent, tags=@tags, waiting=@waiting, nextaction=@nextaction, links=@links, notes=@notes, location=@location, calendar_week=@calendar_week, calendar_day=@calendar_day, calendar_slot=@calendar_slot
                WHERE id=@id`);
      context.res = { status: 200, body: { success: true } };

    } else if (method === 'DELETE' && id) {
      await pool.request()
        .input('id', sql.NVarChar, id)
        .query('DELETE FROM tasks WHERE id=@id');
      context.res = { status: 200, body: { success: true } };

    } else {
      context.res = { status: 400, body: { error: 'Invalid request' } };
    }
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
