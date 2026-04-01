import React from 'react';
import type { TaskData, SortMode } from '../types';
import TaskCard from './TaskCard';

interface TaskPanelProps {
  tasks: TaskData[];
  ghostTaskIds: Set<string>;
  sortMode: SortMode;
  users: { displayName: string; email: string }[];
  onSortChange: (mode: SortMode) => void;
  onAddTask: () => void;
  onEditTask: (taskId: string) => void;
  onDrop: (taskId: string) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks, ghostTaskIds, sortMode, users, onSortChange, onAddTask, onEditTask, onDrop
}) => {
  const [isHovering, setIsHovering] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => setIsHovering(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onDrop(taskId);
  };

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (b.status === 'Completed' && a.status !== 'Completed') return -1;

    const srcA = (a.source || '').toLowerCase();
    const srcB = (b.source || '').toLowerCase();

    if (sortMode === 'priority-desc') return b.priority - a.priority || srcA.localeCompare(srcB);
    if (sortMode === 'priority-asc') return a.priority - b.priority || srcA.localeCompare(srcB);
    if (sortMode === 'source') return srcA.localeCompare(srcB) || b.priority - a.priority;
    // default: by id
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  return (
    <div id="task-panel" className="side-panel">
      <h2 className="flex items-center justify-center gap-2">
        <img src="/mac_logo.png" alt="MAC" className="w-6 h-6 object-contain" />
        MAC Task List Manager
      </h2>

      <div className="panel-actions">
        <button className="btn-add-task" onClick={onAddTask}>+ Add New Task</button>
        <div className="sort-controls">
          <label>Sort By:</label>
          <select
            value={sortMode}
            onChange={e => onSortChange(e.target.value as SortMode)}
          >
            <option value="default">Default</option>
            <option value="priority-desc">Priority (High - Low)</option>
            <option value="priority-asc">Priority (Low - High)</option>
            <option value="source">Source (A - Z)</option>
          </select>
        </div>
      </div>

      <div
        className={`task-list-container ${isHovering ? 'return-hover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {sortedTasks.map(task => {
          const isGhost = ghostTaskIds.has(task.id);
          return (
            <TaskCard
              key={task.id + (isGhost ? '-ghost' : '')}
              task={task}
              isGhost={isGhost}
              users={users}
              onClick={() => onEditTask(task.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TaskPanel;
