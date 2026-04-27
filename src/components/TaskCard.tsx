import React from 'react';
import type { TaskData } from '../types';
import { getPriorityLabel } from '../utils';

interface TaskCardProps {
  task: TaskData;
  isGhost?: boolean;
  users?: { displayName: string; email: string }[];
  onClick?: () => void;
  onDelete?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isGhost = false, users = [], onClick, onDelete }) => {
  const priLabel = getPriorityLabel(task.priority);
  const isCompleted = task.status === 'Completed';

  const handleDragStart = (e: React.DragEvent) => {
    if (isGhost) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const catText = task.category.charAt(0).toUpperCase() + task.category.slice(1);
  const srcText = task.source ? ` | Source: ${task.source}` : '';
  const estText = `Est: ${task.duration || '30m'}`;
  const dueText = isCompleted
    ? ' | Status: Completed'
    : task.due ? ` | Due: ${task.due}` : ' | Due: None';

  return (
    <div
      className={`task ${isCompleted ? 'completed' : ''} ${isGhost ? 'allocated' : ''}`}
      draggable={!isGhost}
      data-category={task.category}
      onDragStart={handleDragStart}
      onClick={isGhost ? undefined : onClick}
    >
      <span className={`priority pri-${task.priority}`}>{priLabel}</span>
      {!isGhost && onDelete && (
        <button
          className="task-delete-btn"
          aria-label="Delete task"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete "${task.title}"?`)) {
              onDelete(task.id);
            }
          }}
        >
          ×
        </button>
      )}
      <strong>{task.title}</strong>
      <br />
      <small>
        Cat: {catText}{srcText}<br />
        {estText}{dueText}
      </small>
      {task.status === 'Delegated' && (
        <span className="delegation-tag">
          Waiting on: {users.find(u => u.email === task.delegated)?.displayName || task.delegated || 'Unknown'}
        </span>
      )}
    </div>
  );
};

export default TaskCard;
