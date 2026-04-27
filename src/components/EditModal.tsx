import React, { useState, useEffect } from 'react';
import type { TaskData } from '../types';

export interface MacUser {
  displayName: string;
  email: string;
}

const UserSearchInput: React.FC<{
  value: string;
  users: MacUser[];
  onChange: (val: string) => void;
}> = ({ value, users, onChange }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedUser = users.find(u => u.email === value);
  const displayValue = selectedUser ? `${selectedUser.displayName} (${selectedUser.email.split('@')[0]})` : search;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={open ? search : displayValue}
        placeholder="Search by name or email..."
        onFocus={() => { setOpen(true); setSearch(''); }}
        onChange={e => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && filtered.length > 0 && (
        <div className="user-dropdown">
          {filtered.map(u => (
            <div
              key={u.email}
              className={`user-dropdown-item ${u.email === value ? 'active' : ''}`}
              onMouseDown={() => { onChange(u.email); setSearch(''); setOpen(false); }}
            >
              <span className="user-dropdown-name">{u.displayName}</span>
              <span className="user-dropdown-email">{u.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function parseDuration(dur: string): { hours: number; mins: number } {
  let hours = 0, mins = 0;
  const hMatch = dur.match(/(\d+)\s*h/i);
  const mMatch = dur.match(/(\d+)\s*m/i);
  if (hMatch) hours = parseInt(hMatch[1]);
  if (mMatch) mins = parseInt(mMatch[1]);
  if (!hMatch && !mMatch) mins = 30;
  return { hours, mins };
}

function formatDuration(hours: number, mins: number): string {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.length > 0 ? parts.join(' ') : '0m';
}

const DurationPicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const parsed = parseDuration(value || '30m');
  const [hours, setHours] = useState(parsed.hours);
  const [mins, setMins] = useState(parsed.mins);

  useEffect(() => {
    const p = parseDuration(value || '30m');
    setHours(p.hours);
    setMins(p.mins);
  }, [value]);

  const update = (h: number, m: number) => {
    setHours(h);
    setMins(m);
    onChange(formatDuration(h, m));
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select value={hours} onChange={e => update(Number(e.target.value), mins)} style={{ flex: 1 }}>
        {Array.from({ length: 13 }, (_, i) => (
          <option key={i} value={i}>{i} hr{i !== 1 ? 's' : ''}</option>
        ))}
      </select>
      <select value={mins} onChange={e => update(hours, Number(e.target.value))} style={{ flex: 1 }}>
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
          <option key={m} value={m}>{m} min</option>
        ))}
      </select>
    </div>
  );
};

interface EditModalProps {
  isOpen: boolean;
  task: TaskData | null;
  isNew: boolean;
  currentUser: string;
  users: MacUser[];
  onClose: () => void;
  onSave: (task: TaskData) => void;
  onDelete?: (taskId: string) => void;
}

const defaultTask: TaskData = {
  id: '',
  title: '',
  category: 'project',
  priority: 1,
  status: 'Not Started',
  duration: '30m',
  source: '',
  delegated: '',
  energy: 'Routine Admin',
  requester: '',
  received: new Date().toISOString().split('T')[0],
  due: '',
  start: '',
  parent: '',
  tags: '',
  waiting: '',
  nextaction: '',
  links: '',
  notes: '',
  location: 'notebook',
};

const EditModal: React.FC<EditModalProps> = ({ isOpen, task, isNew, currentUser, users, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState<TaskData>(defaultTask);

  useEffect(() => {
    if (task) {
      setForm({ ...defaultTask, ...task });
    } else {
      setForm({ ...defaultTask, id: 'task-' + Date.now() });
    }
  }, [task, isOpen]);

  const set = (field: keyof TaskData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value } as TaskData));
  };

  const handleSave = async () => {
    let status = form.status;
    let delegated = form.delegated || '';

    if (delegated.trim() !== '' && status === 'Not Started') status = 'Delegated';
    if (status === 'Not Started' || status === 'In Progress') delegated = '';

    const finalTask: TaskData = {
      ...form,
      title: form.title || 'Untitled Task',
      status,
      delegated,
    };

    // Send email notification if newly delegated
    const wasDelegated = task?.delegated || '';
    const isDelegatedNow = finalTask.status === 'Delegated' && finalTask.delegated;
    const delegateChanged = isDelegatedNow && finalTask.delegated !== wasDelegated;

    if (delegateChanged && finalTask.delegated) {
      const assignee = users.find(u => u.email === finalTask.delegated);
      const delegatedTaskId = 'task-' + Date.now() + '-delegated';

      // Create task in the assignee's task list via API
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': finalTask.delegated,
          },
          body: JSON.stringify({
            id: delegatedTaskId,
            title: finalTask.title,
            category: finalTask.category,
            priority: finalTask.priority,
            status: 'Not Started',
            duration: finalTask.duration,
            source: `Delegated by ${currentUser}`,
            startTime: finalTask.startTime,
            endTime: finalTask.endTime,
            requester: currentUser,
            due: finalTask.due,
            notes: finalTask.notes,
            location: 'notebook',
            pendingDelegation: true,
            delegatedBy: currentUser,
          }),
        });
      } catch (err) {
        console.warn('Failed to create task for assignee:', err);
      }

      // Send notifications (email + Teams adaptive card) — production only
      if (window.location.hostname !== 'localhost') {
        try {
          const { sendDelegationEmail, sendTeamsDelegationCard } = await import('../graphService');
          const msalModule = await import('@azure/msal-browser');
          const { msalConfig } = await import('../authConfig');

          const instance = new msalModule.PublicClientApplication(msalConfig);
          await instance.initialize();

          // Fire both in parallel — email + Teams card
          await Promise.allSettled([
            sendDelegationEmail(
              instance,
              finalTask.delegated,
              assignee?.displayName || '',
              finalTask.title,
              currentUser,
            ),
            sendTeamsDelegationCard(instance, finalTask.delegated, {
              taskId: delegatedTaskId,
              taskTitle: finalTask.title,
              toName: assignee?.displayName || finalTask.delegated.split('@')[0],
              assignedBy: currentUser,
              priority: finalTask.priority,
              due: finalTask.due,
              category: finalTask.category,
              duration: finalTask.duration,
            }),
          ]);
        } catch (err) {
          console.warn('Failed to send notifications:', err);
        }
      }
    }

    onSave(finalTask);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`edit-modal ${isOpen ? 'open' : ''}`}>
        <div className="modal-header">
          <h3>{isNew ? 'Create New Task' : 'Task Details Dashboard'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label>Task Title</label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Enter task name..." />
            </div>

            <div className="section-title">Context & Status</div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="project">Project</option>
                <option value="admin">Admin</option>
                <option value="initiative">Initiative</option>
                <option value="activity">Activity</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority Level</label>
              <select value={form.priority} onChange={e => set('priority', Number(e.target.value))}>
                <option value={3}>High</option>
                <option value={2}>Medium</option>
                <option value={1}>Low</option>
              </select>
            </div>
            <div className="form-group">
              <label>Current Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Delegated">Delegated (Moves to Outbox)</option>
                <option value="Waiting on Someone">Waiting on Blockers</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Delegated To</label>
              <UserSearchInput
                value={form.delegated || ''}
                users={users}
                onChange={val => set('delegated', val)}
              />
            </div>

            <div className="section-title">Time Blocking & Dates</div>
            <div className="form-group">
              <label>Energy Required</label>
              <select value={form.energy || 'Routine Admin'} onChange={e => set('energy', e.target.value)}>
                <option value="High Focus">High Focus</option>
                <option value="Collaborative">Collaborative</option>
                <option value="Routine Admin">Routine Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration</label>
              <DurationPicker
                value={form.duration}
                onChange={val => set('duration', val)}
              />
            </div>
            <div className="form-group">
              <label>Source / Channel</label>
              <input type="text" value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g., Email, Slack, Meeting" />
            </div>
            <div className="form-group">
              <label>Requester</label>
              <input type="text" value={form.requester || ''} onChange={e => set('requester', e.target.value)} placeholder="Who asked for this?" />
            </div>
            <div className="form-group">
              <label>Received Date</label>
              <input type="date" value={form.received || ''} onChange={e => set('received', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="text" value={form.due || ''} onChange={e => set('due', e.target.value)} placeholder="e.g. Jul 27, 2026 or Friday" />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.start || ''} onChange={e => set('start', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Waiting On (Blocker)</label>
              <input type="text" value={form.waiting || ''} onChange={e => set('waiting', e.target.value)} placeholder="Who/what are you waiting for?" />
            </div>

            <div className="section-title">Actionability & Execution</div>
            <div className="form-group">
              <label>Parent Goal / Sub-Project</label>
              <input type="text" value={form.parent || ''} onChange={e => set('parent', e.target.value)} placeholder="What bigger initiative is this tied to?" />
            </div>
            <div className="form-group">
              <label>Tags / Keywords</label>
              <input type="text" value={form.tags || ''} onChange={e => set('tags', e.target.value)} placeholder="e.g., #budget, #Q3" />
            </div>
            <div className="form-group full">
              <label>Next Physical Action</label>
              <input type="text" value={form.nextaction || ''} onChange={e => set('nextaction', e.target.value)} placeholder="What is the literal next step?" />
            </div>
            <div className="form-group full">
              <label>Reference Links</label>
              <input type="url" value={form.links || ''} onChange={e => set('links', e.target.value)} placeholder="https://docs.google.com/..." />
            </div>
            <div className="form-group full">
              <label>Description & Notes</label>
              <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Drop extra details here..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && onDelete && (
            <button
              className="btn-delete"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this task?')) {
                  onDelete(form.id);
                  onClose();
                }
              }}
            >
              Delete Task
            </button>
          )}
          <button className="btn-save" onClick={handleSave}>Save Task Data</button>
        </div>
      </div>
    </>
  );
};

export default EditModal;
