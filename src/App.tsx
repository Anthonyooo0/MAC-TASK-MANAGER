import React, { useState, useCallback, useEffect } from 'react';
import type { TaskData, SortMode } from './types';
import { initialTasks } from './data/tasks';
import TaskPanel from './components/TaskPanel';
import CalendarMonitor from './components/CalendarMonitor';
import type { CalendarMeeting } from './components/CalendarMonitor';
import DelegationPanel from './components/DelegationPanel';
import EditModal from './components/EditModal';
import type { MacUser } from './components/EditModal';
import { getWeekStartDate } from './utils';

const isDev = window.location.hostname === 'localhost';

// Sample meetings for local dev
const devMeetings: CalendarMeeting[] = [
  { id: 'dev-1', title: 'Weekly Management Call', day: 0, startSlot: 0, slots: [0], duration: '1h', timeLabel: '8:00 AM - 9:00 AM', topPercent: 0, heightPercent: 100 },
  { id: 'dev-2', title: 'MEKCO Follow-up Teams Mtg', day: 2, startSlot: 4, slots: [4], duration: '1h', timeLabel: '1:00 PM - 2:00 PM', topPercent: 0, heightPercent: 50 },
  { id: 'dev-3', title: 'Acumatica Exec Demo', day: 3, startSlot: 2, slots: [2], duration: '1h', timeLabel: '11:00 AM - 12:00 PM', topPercent: 0, heightPercent: 100 },
  { id: 'dev-4', title: 'GTA Renewal Meeting', day: 4, startSlot: 0, slots: [0, 1], duration: '3h', timeLabel: '8:00 AM - 11:00 AM', topPercent: 0, heightPercent: 100 },
  { id: 'dev-5', title: "Anthony's Work Block", day: 1, startSlot: 3, slots: [3, 4, 5], duration: '5h', timeLabel: '12:00 PM - 5:00 PM', topPercent: 0, heightPercent: 100 },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [msalReady, setMsalReady] = useState(false);
  const [outlookMeetings, setOutlookMeetings] = useState<CalendarMeeting[]>(isDev ? devMeetings : []);
  const [users, setUsers] = useState<MacUser[]>([]);

  useEffect(() => {
    if (isDev) {
      setCurrentUser('anthony.jimenez@macproducts.net');
      setUsers([
        { displayName: 'Anthony Jimenez', email: 'anthony.jimenez@macproducts.net' },
        { displayName: 'Juan Ortiz', email: 'juan.ortiz@macproducts.net' },
        { displayName: 'Edward Russnow', email: 'edward.russnow@macproducts.net' },
        { displayName: 'Nick Garcia', email: 'nick.garcia@macproducts.net' },
        { displayName: 'Angel C. Leon', email: 'angel.leon@macproducts.net' },
      ]);
      setMsalReady(true);
      return;
    }
    import('@azure/msal-react').then(() => setMsalReady(true));
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

  // Fetch Outlook calendar events when week changes (production only)
  useEffect(() => {
    if (isDev || !currentUser) return;

    async function loadOutlookEvents() {
      try {
        const { fetchCalendarEvents, mapEventToCalendarSlot } = await import('./graphService');
        const msalModule = await import('@azure/msal-browser');
        const { msalConfig } = await import('./authConfig');

        const instance = new msalModule.PublicClientApplication(msalConfig);
        await instance.initialize();

        const weekStart = getWeekStartDate(activeWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 5);

        const events = await fetchCalendarEvents(instance, weekStart, weekEnd);
        const mapped: CalendarMeeting[] = [];

        events.forEach(event => {
          if (event.isAllDay) return;
          const result = mapEventToCalendarSlot(event);
          if (result) {
            mapped.push({
              id: event.id,
              title: event.subject,
              day: result.day,
              startSlot: result.startSlot,
              slots: result.slots,
              duration: result.duration,
              timeLabel: result.timeLabel,
              topPercent: result.topPercent,
              heightPercent: result.heightPercent,
            });
          }
        });

        setOutlookMeetings(mapped);
      } catch (err) {
        console.warn('Failed to load Outlook events:', err);
      }
    }

    loadOutlookEvents();
  }, [activeWeek, currentUser]);

  // Fetch org users for delegation dropdown (production only)
  useEffect(() => {
    if (isDev || !currentUser) return;

    async function loadUsers() {
      try {
        const { fetchOrgUsers } = await import('./graphService');
        const msalModule = await import('@azure/msal-browser');
        const { msalConfig } = await import('./authConfig');

        const instance = new msalModule.PublicClientApplication(msalConfig);
        await instance.initialize();

        const orgUsers = await fetchOrgUsers(instance);
        setUsers(orgUsers);
      } catch (err) {
        console.warn('Failed to load org users:', err);
      }
    }

    loadUsers();
  }, [currentUser]);

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
          outlookMeetings={outlookMeetings}
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
        currentUser={currentUser}
        users={users}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
      />
    </>
  );
};

export default App;
