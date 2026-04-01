import React, { useState, useCallback, useEffect } from 'react';
import type { TaskData, SortMode } from './types';
import { initialTasks } from './data/tasks';
import TaskPanel from './components/TaskPanel';
import CalendarMonitor from './components/CalendarMonitor';
import DelegationPanel from './components/DelegationPanel';
import EditModal from './components/EditModal';

const isDev = window.location.hostname === 'localhost';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [msalReady, setMsalReady] = useState(false);

  useEffect(() => {
    if (isDev) {
      // Skip auth locally
      setCurrentUser('anthony.jimenez@macproducts.net');
      setMsalReady(true);
      return;
    }

    // In production, use MSAL hooks via dynamic import
    import('@azure/msal-react').then(({ useMsal: _u }) => {
      // MSAL is handled by MsalProvider in main.tsx —
      // we detect auth state from the provider context via AuthWrapper
      setMsalReady(true);
    });
  }, []);

  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const [activeWeek, setActiveWeek] = useState(() => {
    const today = new Date();
    return Math.min(4, Math.ceil(today.getDate() / 7));
  });
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isNewTask, setIsNewTask] = useState(false);

  const ghostTaskIds = new Set(
    tasks.filter(t => t.location === 'calendar').map(t => t.id)
  );

  const notebookTasks = tasks.filter(t => t.location === 'notebook' || t.location === 'calendar');
  const delegationTasks = tasks.filter(t => t.location === 'delegation');
  const calendarTasks = tasks.filter(t => t.location === 'calendar');

  const handleDropToNotebook = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, location: 'notebook' as const, status: 'Not Started' as const, delegated: '', calendarPosition: undefined };
      }
      return t;
    }));
  }, []);

  const handleDropToCalendar = useCallback((taskId: string, day: number, slot: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, location: 'calendar' as const, status: 'In Progress' as const, delegated: '', calendarPosition: { week: activeWeek, day, slot } };
      }
      return t;
    }));
  }, [activeWeek]);

  const handleDropToDelegation = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, location: 'delegation' as const, status: 'Delegated' as const, calendarPosition: undefined };
      }
      return t;
    }));
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setEditingTaskId(taskId);
    setIsNewTask(false);
    setModalOpen(true);
  }, []);

  const handleAddTask = useCallback(() => {
    setEditingTaskId(null);
    setIsNewTask(true);
    setModalOpen(true);
  }, []);

  const handleSaveTask = useCallback((updatedTask: TaskData) => {
    setTasks(prev => {
      const exists = prev.find(t => t.id === updatedTask.id);
      if (exists) {
        return prev.map(t => {
          if (t.id === updatedTask.id) {
            let location = t.location;
            if (updatedTask.status === 'Delegated') location = 'delegation';
            else if (t.location === 'delegation') location = 'notebook';
            return { ...updatedTask, location, calendarPosition: location === 'delegation' ? undefined : t.calendarPosition };
          }
          return t;
        });
      } else {
        const location = updatedTask.status === 'Delegated' ? 'delegation' as const : 'notebook' as const;
        return [{ ...updatedTask, location }, ...prev];
      }
    });
  }, []);

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) || null : null;

  // Loading state
  if (!msalReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-mac-light">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <img src="/mac_logo.png" alt="MAC Logo" className="w-full h-full object-contain animate-pulse" />
          </div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated (production only)
  if (!currentUser) {
    const Login = React.lazy(() => import('./components/Login'));
    return (
      <React.Suspense fallback={<div />}>
        <Login onLogin={setCurrentUser} />
      </React.Suspense>
    );
  }

  return (
    <>
      <div className="mac-logo-container">
        <img src="/mac_logo.png" alt="MAC Products" className="h-[60px] object-contain" />
      </div>

      <div className="wall" />
      <div className="desk-surface" />

      <div className="workspace">
        <TaskPanel
          tasks={notebookTasks}
          ghostTaskIds={ghostTaskIds}
          sortMode={sortMode}
          onSortChange={setSortMode}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDrop={handleDropToNotebook}
        />

        <CalendarMonitor
          activeWeek={activeWeek}
          onWeekChange={setActiveWeek}
          calendarTasks={calendarTasks}
          onDropToCalendar={handleDropToCalendar}
          onEditTask={handleEditTask}
        />

        <DelegationPanel
          tasks={delegationTasks}
          onEditTask={handleEditTask}
          onDrop={handleDropToDelegation}
        />
      </div>

      <EditModal
        isOpen={modalOpen}
        task={editingTask}
        isNew={isNewTask}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
      />
    </>
  );
};

export default App;
