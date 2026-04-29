let getPool, sql;
try {
  ({ getPool, sql } = require('../db'));
} catch (loadErr) {
  module.exports = async function (context) {
    context.res = { status: 500, body: { error: 'Module load failed: ' + loadErr.message } };
  };
  return;
}

async function logChange(pool, userEmail, taskId, taskTitle, action, changes) {
  try {
    await pool.request()
      .input('user_email', sql.NVarChar, userEmail || '')
      .input('task_id', sql.NVarChar, taskId || '')
      .input('task_title', sql.NVarChar, (taskTitle || '').slice(0, 500))
      .input('action', sql.NVarChar, action || '')
      .input('changes', sql.NVarChar, changes || '')
      .query('INSERT INTO changelog (user_email, task_id, task_title, action, changes) VALUES (@user_email, @task_id, @task_title, @action, @changes)');
  } catch (err) {
    // logging failure shouldn't break the request — swallow silently
    console.warn('changelog insert failed', err && err.message);
  }
}

function diffTask(oldT, newT) {
  if (!oldT) return '';
  const fields = [
    ['title', 'Title'], ['category', 'Category'], ['priority', 'Priority'],
    ['status', 'Status'], ['duration', 'Duration'], ['source', 'Source'],
    ['delegated', 'Delegated To'], ['due', 'Due'], ['location', 'Location'],
    ['notes', 'Notes'], ['pending_delegation', 'Pending'],
  ];
  const parts = [];
  for (const [k, label] of fields) {
    const ov = oldT[k] ?? '';
    const nvRaw = newT[k] ?? (newT[mapNew(k)] ?? '');
    const nv = nvRaw === null ? '' : nvRaw;
    if (String(ov) !== String(nv)) {
      parts.push(`${label}: "${ov}" → "${nv}"`);
    }
  }
  // Calendar position (compare individual coords)
  const oldCal = oldT.calendar_week != null ? `W${oldT.calendar_week} D${oldT.calendar_day} S${oldT.calendar_slot}` : 'unscheduled';
  const newCal = newT.calendarPosition?.week != null ? `W${newT.calendarPosition.week} D${newT.calendarPosition.day} S${newT.calendarPosition.slot}` : 'unscheduled';
  if (oldCal !== newCal) parts.push(`Calendar: ${oldCal} → ${newCal}`);
  return parts.join(' | ');
}
function mapNew(dbCol) {
  // map db column names back to JS field names where they differ
  if (dbCol === 'pending_delegation') return 'pendingDelegation';
  if (dbCol === 'start_time') return 'startTime';
  if (dbCol === 'end_time') return 'endTime';
  return dbCol;
}

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const method = req.method.toUpperCase();
    const id = context.bindingData.id;
    const userEmail = req.headers['x-user-email'];

    if (!userEmail) {
      context.res = { status: 401, body: { error: 'Missing x-user-email header' } };
      return;
    }

    if (method === 'GET') {
      const result = await pool.request()
        .input('user_email', sql.NVarChar, userEmail)
        .query('SELECT * FROM tasks WHERE user_email = @user_email ORDER BY id');
      context.res = { status: 200, body: result.recordset };

    } else if (method === 'POST') {
      const t = req.body;
      await pool.request()
        .input('id', sql.NVarChar, t.id)
        .input('user_email', sql.NVarChar, userEmail)
        .input('title', sql.NVarChar, t.title)
        .input('category', sql.NVarChar, t.category)
        .input('priority', sql.Int, t.priority)
        .input('status', sql.NVarChar, t.status)
        .input('duration', sql.NVarChar, t.duration || '')
        .input('start_time', sql.NVarChar, t.startTime || '')
        .input('end_time', sql.NVarChar, t.endTime || '')
        .input('source', sql.NVarChar, t.source || '')
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
        .input('calendar_week', sql.Int, t.calendarPosition?.week ?? null)
        .input('calendar_day', sql.Int, t.calendarPosition?.day ?? null)
        .input('calendar_slot', sql.Int, t.calendarPosition?.slot ?? null)
        .input('pending_delegation', sql.Bit, t.pendingDelegation ? 1 : 0)
        .input('delegated_by', sql.NVarChar, t.delegatedBy || '')
        .input('outlook_event_id', sql.NVarChar, t.outlookEventId || '')
        .query(`INSERT INTO tasks (id, user_email, title, category, priority, status, duration, start_time, end_time, source, delegated, energy, requester, received, due, start_date, parent, tags, waiting, nextaction, links, notes, location, calendar_week, calendar_day, calendar_slot, pending_delegation, delegated_by, outlook_event_id)
                VALUES (@id, @user_email, @title, @category, @priority, @status, @duration, @start_time, @end_time, @source, @delegated, @energy, @requester, @received, @due, @start_date, @parent, @tags, @waiting, @nextaction, @links, @notes, @location, @calendar_week, @calendar_day, @calendar_slot, @pending_delegation, @delegated_by, @outlook_event_id)`);

      const createAction = t.pendingDelegation ? 'Received delegated task' : 'Created task';
      const createDetails = t.source ? `Source: ${t.source}` : '';
      await logChange(pool, userEmail, t.id, t.title, createAction, createDetails);

      context.res = { status: 201, body: { success: true } };

    } else if (method === 'PUT' && id) {
      const t = req.body;

      // Fetch the existing row so we can compute a diff for the audit log
      const existing = await pool.request()
        .input('id', sql.NVarChar, id)
        .input('user_email', sql.NVarChar, userEmail)
        .query('SELECT TOP 1 * FROM tasks WHERE id=@id AND user_email=@user_email');
      const oldRow = existing.recordset[0] || null;

      const request = pool.request()
        .input('id', sql.NVarChar, id)
        .input('user_email', sql.NVarChar, userEmail)
        .input('title', sql.NVarChar, t.title)
        .input('category', sql.NVarChar, t.category)
        .input('priority', sql.Int, t.priority)
        .input('status', sql.NVarChar, t.status)
        .input('duration', sql.NVarChar, t.duration || '')
        .input('start_time', sql.NVarChar, t.startTime || '')
        .input('end_time', sql.NVarChar, t.endTime || '')
        .input('source', sql.NVarChar, t.source || '')
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
        .input('calendar_week', sql.Int, t.calendarPosition?.week ?? null)
        .input('calendar_day', sql.Int, t.calendarPosition?.day ?? null)
        .input('calendar_slot', sql.Int, t.calendarPosition?.slot ?? null)
        .input('pending_delegation', sql.Bit, t.pendingDelegation ? 1 : 0)
        .input('delegated_by', sql.NVarChar, t.delegatedBy || '')
        .input('outlook_event_id', sql.NVarChar, t.outlookEventId || '');

      // Upsert: update if exists, insert if not
      await request.query(`
        MERGE tasks AS target
        USING (SELECT @id AS id, @user_email AS user_email) AS src
        ON target.id = src.id AND target.user_email = src.user_email
        WHEN MATCHED THEN
          UPDATE SET title=@title, category=@category, priority=@priority, status=@status, duration=@duration, start_time=@start_time, end_time=@end_time, source=@source, delegated=@delegated, energy=@energy, requester=@requester, received=@received, due=@due, start_date=@start_date, parent=@parent, tags=@tags, waiting=@waiting, nextaction=@nextaction, links=@links, notes=@notes, location=@location, calendar_week=@calendar_week, calendar_day=@calendar_day, calendar_slot=@calendar_slot, pending_delegation=@pending_delegation, delegated_by=@delegated_by, outlook_event_id=@outlook_event_id
        WHEN NOT MATCHED THEN
          INSERT (id, user_email, title, category, priority, status, duration, start_time, end_time, source, delegated, energy, requester, received, due, start_date, parent, tags, waiting, nextaction, links, notes, location, calendar_week, calendar_day, calendar_slot, pending_delegation, delegated_by, outlook_event_id)
          VALUES (@id, @user_email, @title, @category, @priority, @status, @duration, @start_time, @end_time, @source, @delegated, @energy, @requester, @received, @due, @start_date, @parent, @tags, @waiting, @nextaction, @links, @notes, @location, @calendar_week, @calendar_day, @calendar_slot, @pending_delegation, @delegated_by, @outlook_event_id);
      `);

      // Log a meaningful action label based on what changed
      let action = 'Updated task';
      if (!oldRow) {
        action = 'Created task';
      } else if (!oldRow.pending_delegation && t.pendingDelegation) {
        action = 'Marked as pending delegation';
      } else if (oldRow.pending_delegation && !t.pendingDelegation) {
        action = 'Accepted delegated task';
      } else if (oldRow.status !== t.status) {
        action = `Changed status to ${t.status}`;
      } else if ((oldRow.location || '') !== (t.location || '')) {
        action = `Moved to ${t.location}`;
      }
      const details = diffTask(oldRow, t);
      await logChange(pool, userEmail, id, t.title, action, details);

      context.res = { status: 200, body: { success: true } };

    } else if (method === 'DELETE' && id) {
      // Capture the title for the log entry before we delete
      const existing = await pool.request()
        .input('id', sql.NVarChar, id)
        .input('user_email', sql.NVarChar, userEmail)
        .query('SELECT TOP 1 title FROM tasks WHERE id=@id AND user_email=@user_email');
      const oldTitle = existing.recordset[0]?.title || '(unknown)';

      await pool.request()
        .input('id', sql.NVarChar, id)
        .input('user_email', sql.NVarChar, userEmail)
        .query('DELETE FROM tasks WHERE id=@id AND user_email=@user_email');

      await logChange(pool, userEmail, id, oldTitle, 'Deleted task', '');

      context.res = { status: 200, body: { success: true } };

    } else {
      context.res = { status: 400, body: { error: 'Invalid request' } };
    }
  } catch (err) {
    context.log.error('Tasks API error:', err);
    context.res = { status: 500, body: { error: err.message, stack: err.stack } };
  }
};
