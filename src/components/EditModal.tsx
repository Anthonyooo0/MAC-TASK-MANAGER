import React, { useState, useEffect } from 'react';
import type { TaskData } from '../types';

export interface MacUser {
  displayName: string;
  email: string;
}

interface EditModalProps {
  isOpen: boolean;
  task: TaskData | null;
  isNew: boolean;
  currentUser: string;
  users: MacUser[];
  onClose: () => void;
  onSave: (task: TaskData) => void;
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

const EditModal: React.FC<EditModalProps> = ({ isOpen, task, isNew, currentUser, users, onClose, onSave }) => {
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
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: finalTask.delegated,
            toName: assignee?.displayName || '',
            taskTitle: finalTask.title,
            assignedBy: currentUser,
          }),
        });
      } catch (err) {
        console.warn('Failed to send notification:', err);
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
            <div className="form-group">
              <label>Delegated To</label>
              <select value={form.delegated || ''} onChange={e => set('delegated', e.target.value)}>
                <option value="">-- Select User --</option>
                {users.map(u => (
                  <option key={u.email} value={u.email}>
                    {u.displayName} ({u.email.split('@')[0]})
                  </option>
                ))}
              </select>
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
              <label>Est. Duration</label>
              <input type="text" value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="e.g., 30m, 1h, 2.5h" />
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
          <button className="btn-save" onClick={handleSave}>Save Task Data</button>
        </div>
      </div>
    </>
  );
};

export default EditModal;
