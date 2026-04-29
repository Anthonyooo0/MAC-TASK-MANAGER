import React, { useEffect, useState } from 'react';

export interface ChangelogEntry {
  id: number;
  created_at: string;
  user_email: string;
  task_id: string;
  task_title: string;
  action: string;
  changes: string;
}

interface AdminLogModalProps {
  isOpen: boolean;
  currentUser: string;
  onClose: () => void;
}

const AdminLogModal: React.FC<AdminLogModalProps> = ({ isOpen, currentUser, onClose }) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch('/api/changelog?limit=1000', {
      headers: { 'x-user-email': currentUser },
    })
      .then(async res => {
        if (res.status === 403) throw new Error('Forbidden — admin only');
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      })
      .then((rows: ChangelogEntry[]) => setEntries(rows))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const filtered = entries.filter(e => {
    if (filterUser && !e.user_email.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterAction && !e.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
    return true;
  });

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const distinctUsers = Array.from(new Set(entries.map(e => e.user_email))).filter(Boolean).sort();

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="edit-modal open admin-log-modal">
        <div className="modal-header">
          <h3>Admin Activity Log</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <div style={{ padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid #eee', background: '#fafbfd' }}>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 12, fontFamily: 'inherit' }}>
              <option value="">All users ({distinctUsers.length})</option>
              {distinctUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="text" placeholder="Filter by action…" value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 12, fontFamily: 'inherit', flex: 1 }}
            />
            <span style={{ fontSize: 11, color: '#636e72', fontFamily: 'Space Mono, monospace' }}>
              {filtered.length} / {entries.length}
            </span>
          </div>

          {loading && <div style={{ padding: 30, textAlign: 'center', color: '#636e72' }}>Loading…</div>}
          {error && <div style={{ padding: 30, textAlign: 'center', color: '#c0392b' }}>{error}</div>}

          {!loading && !error && (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="admin-log-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Task</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#636e72' }}>No entries</td></tr>
                  )}
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td className="cell-time">{fmtTime(e.created_at)}</td>
                      <td className="cell-user">{e.user_email}</td>
                      <td><span className="action-badge">{e.action}</span></td>
                      <td className="cell-task">{e.task_title || <span style={{ color: '#aaa' }}>—</span>}</td>
                      <td className="cell-changes">{e.changes || <span style={{ color: '#aaa' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminLogModal;
