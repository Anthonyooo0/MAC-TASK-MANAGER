import React from 'react';
import type { TaskData } from '../types';
import TaskCard from './TaskCard';

interface DelegationPanelProps {
  tasks: TaskData[];
  users: { displayName: string; email: string }[];
  onEditTask: (taskId: string) => void;
  onDrop: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const DelegationPanel: React.FC<DelegationPanelProps> = ({ tasks, users, onEditTask, onDrop, onDeleteTask }) => {
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

  return (
    <div id="delegation-panel" className="side-panel">
      <h2>Delegated Outbox</h2>
      <div
        className={`task-list-container ${isHovering ? 'return-hover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            users={users}
            onClick={() => onEditTask(task.id)}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
};

export default DelegationPanel;
