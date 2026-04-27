import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  { id: 'dev-1', title: 'Weekly Management Call', day: 0, startSlot: 0, slots: [0], duration: '1h', timeLabel: '8:00 AM - 9:00 AM', topPercent: 0, heightPercent: 100, location: 'Conference Room A', organizer: 'Edward Russnow', myResponse: 'accepted', isOnline: true, attendees: [
    { name: 'Edward Russnow', email: 'edward.russnow@macproducts.net', response: 'organizer', type: 'required' },
    { name: 'Anthony Jimenez', email: 'anthony.jimenez@macproducts.net', response: 'accepted', type: 'required' },
    { name: 'Nick Costantino', email: 'nick.costantino@macproducts.net', response: 'accepted', type: 'required' },
    { name: 'Gary Clarner', email: 'gary.clarner@macimpulse.net', response: 'tentativelyAccepted', type: 'optional' },
  ] },
  { id: 'dev-2', title: 'MEKCO Follow-up Teams Mtg', day: 2, startSlot: 4, slots: [4], duration: '1h', timeLabel: '1:00 PM - 2:00 PM', topPercent: 0, heightPercent: 50, location: 'Teams', organizer: 'Nick Costantino', myResponse: 'accepted', isOnline: true, attendees: [
    { name: 'Nick Costantino', email: 'nick.costantino@macproducts.net', response: 'organizer', type: 'required' },
    { name: 'Anthony Jimenez', email: 'anthony.jimenez@macproducts.net', response: 'accepted', type: 'required' },
  ] },
  { id: 'dev-3', title: 'Acumatica Exec Demo', day: 3, startSlot: 2, slots: [2], duration: '1h', timeLabel: '11:00 AM - 12:00 PM', topPercent: 0, heightPercent: 100, location: 'Board Room', organizer: 'Michelle Soares', myResponse: 'tentativelyAccepted', attendees: [
    { name: 'Michelle Soares', email: 'michelle.soares@macproducts.net', response: 'organizer', type: 'required' },
    { name: 'Anthony Jimenez', email: 'anthony.jimenez@macproducts.net', response: 'tentativelyAccepted', type: 'required' },
    { name: 'Butch Campbell', email: 'butch.campbell@macimpulse.net', response: 'declined', type: 'optional' },
  ] },
  { id: 'dev-4', title: 'GTA Renewal Meeting', day: 4, startSlot: 0, slots: [0, 1], duration: '3h', timeLabel: '8:00 AM - 11:00 AM', topPercent: 0, heightPercent: 100, organizer: 'Anthony Jimenez', myResponse: 'organizer', isOnline: true, attendees: [
    { name: 'Anthony Jimenez', email: 'anthony.jimenez@macproducts.net', response: 'organizer', type: 'required' },
    { name: 'Edward Russnow', email: 'edward.russnow@macproducts.net', response: 'none', type: 'required' },
  ] },
  { id: 'dev-5', title: "Anthony's Work Block", day: 1, startSlot: 3, slots: [3, 4, 5], duration: '5h', timeLabel: '12:00 PM - 5:00 PM', topPercent: 0, heightPercent: 100, myResponse: 'accepted' },
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
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Load tasks from the database on login (production) or localStorage (dev)
  useEffect(() => {
    if (!currentUser) return;

    if (isDev) {
      const saved = localStorage.getItem('mac-tasks');
      if (saved) {
        try {
          setTasks(JSON.parse(saved));
        } catch { /* ignore bad data */ }
      }
      setTasksLoaded(true);
      return;
    }

    fetch('/api/tasks', {
      headers: { 'x-user-email': currentUser },
    })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(`API responded with ${res.status}: ${t}`); });
        return res.json();
      })
      .then((rows: Record<string, unknown>[]) => {
        if (rows && rows.length > 0) {
          const mapped: TaskData[] = rows.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            userEmail: r.user_email as string,
            title: r.title as string,
            category: r.category as TaskData['category'],
            priority: r.priority as TaskData['priority'],
            status: r.status as TaskData['status'],
            duration: (r.duration as string) || '30m',
            startTime: (r.start_time as string) || '',
            endTime: (r.end_time as string) || '',
            source: (r.source as string) || '',
            delegated: (r.delegated as string) || '',
            energy: (r.energy as string) || '',
            requester: (r.requester as string) || '',
            received: (r.received as string) || '',
            due: (r.due as string) || '',
            start: (r.start_date as string) || '',
            parent: (r.parent as string) || '',
            tags: (r.tags as string) || '',
            waiting: (r.waiting as string) || '',
            nextaction: (r.nextaction as string) || '',
            links: (r.links as string) || '',
            notes: (r.notes as string) || '',
            location: (r.location as TaskData['location']) || 'notebook',
            calendarPosition: r.calendar_week != null ? {
              week: r.calendar_week as number,
              day: r.calendar_day as number,
              slot: r.calendar_slot as number,
            } : undefined,
            pendingDelegation: !!(r.pending_delegation),
            delegatedBy: (r.delegated_by as string) || '',
            outlookEventId: (r.outlook_event_id as string) || '',
          }));
          setTasks(mapped);
        } else {
          // First time user — seed initial tasks to the database
          initialTasks.forEach(task => {
            fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-user-email': currentUser },
              body: JSON.stringify(task),
            }).catch(() => {});
          });
        }
        setTasksLoaded(true);
      })
      .catch(err => {
        console.warn('Failed to load tasks from API:', err);
        setTasksLoaded(true);
      });
  }, [currentUser]);

  // Save to localStorage in dev mode whenever tasks change
  useEffect(() => {
    if (isDev && tasksLoaded) {
      localStorage.setItem('mac-tasks', JSON.stringify(tasks));
    }
  }, [tasks, tasksLoaded]);

  // Persist a task to the API (fire-and-forget in production)
  const persistTask = useCallback((task: TaskData, method: 'POST' | 'PUT' = 'PUT') => {
    if (isDev || !currentUserRef.current) return;
    const url = method === 'POST' ? '/api/tasks' : `/api/tasks/${task.id}`;
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-user-email': currentUserRef.current },
      body: JSON.stringify(task),
    })
      .then(res => { if (!res.ok) return res.text().then(t => console.error('Persist failed:', res.status, t)); })
      .catch(err => console.warn('Failed to persist task:', err));
  }, []);

  // Get a single shared MSAL instance for Graph calls
  const msalInstanceRef = useRef<import('@azure/msal-browser').PublicClientApplication | null>(null);
  const getMsal = useCallback(async () => {
    if (msalInstanceRef.current) return msalInstanceRef.current;
    const msalModule = await import('@azure/msal-browser');
    const { msalConfig } = await import('./authConfig');
    const instance = new msalModule.PublicClientApplication(msalConfig);
    await instance.initialize();
    msalInstanceRef.current = instance;
    return instance;
  }, []);

  /**
   * Sync a task's calendar state to Outlook.
   * - If task has calendarPosition and no eventId: create event, return new id
   * - If task has calendarPosition and existing eventId: update event
   * - If task has no calendarPosition (removed from calendar) but has eventId: delete event
   * Returns the (possibly new) outlookEventId so caller can persist it.
   */
  const syncTaskToOutlook = useCallback(async (task: TaskData): Promise<string> => {
    if (isDev) return task.outlookEventId || '';
    try {
      const { createTaskEvent, updateTaskEvent, deleteTaskEvent } = await import('./graphService');
      const instance = await getMsal();
      const onCalendar = task.location === 'calendar' && !!task.calendarPosition;
      const hasEvent = !!task.outlookEventId;

      if (onCalendar && task.calendarPosition) {
        const input = {
          title: task.title,
          category: task.category,
          duration: task.duration,
          notes: task.notes,
          source: task.source,
          weekNumber: task.calendarPosition.week,
          day: task.calendarPosition.day,
          slot: task.calendarPosition.slot,
        };
        if (hasEvent) {
          await updateTaskEvent(instance, task.outlookEventId!, input);
          return task.outlookEventId!;
        } else {
          const newId = await createTaskEvent(instance, input);
          return newId || '';
        }
      } else if (hasEvent) {
        await deleteTaskEvent(instance, task.outlookEventId!);
        return '';
      }
      return task.outlookEventId || '';
    } catch (err) {
      console.warn('syncTaskToOutlook error', err);
      return task.outlookEventId || '';
    }
  }, [getMsal]);

  const [activeWeek, setActiveWeek] = useState(() => {
    const today = new Date();
    return Math.min(4, Math.ceil(today.getDate() / 7));
  });
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [activeMobilePanel, setActiveMobilePanel] = useState<'notebook' | 'calendar' | 'delegation'>('calendar');

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
              location: event.location?.displayName || '',
              organizer: event.organizer?.emailAddress?.name || '',
              attendees: (event.attendees || []).map(a => ({
                name: a.emailAddress.name,
                email: a.emailAddress.address,
                response: a.status.response,
                type: a.type,
              })),
              bodyPreview: event.bodyPreview || '',
              myResponse: event.responseStatus?.response || '',
              isOnline: event.isOnlineMeeting || false,
              onlineMeetingUrl: event.onlineMeetingUrl || '',
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
    let snapshot: TaskData | null = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, location: 'notebook' as const, status: 'Not Started' as const, delegated: '', calendarPosition: undefined };
        snapshot = updated;
        persistTask(updated);
        return updated;
      }
      return t;
    }));
    // Outlook sync: task moved off calendar → delete the event
    if (snapshot) {
      syncTaskToOutlook(snapshot).then(newId => {
        if (newId !== snapshot!.outlookEventId) {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, outlookEventId: newId } : t));
          persistTask({ ...snapshot!, outlookEventId: newId });
        }
      });
    }
  }, [persistTask, syncTaskToOutlook]);

  const handleDropToCalendar = useCallback((taskId: string, day: number, slot: number) => {
    let snapshot: TaskData | null = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, location: 'calendar' as const, status: 'In Progress' as const, delegated: '', calendarPosition: { week: activeWeek, day, slot } };
        snapshot = updated;
        persistTask(updated);
        return updated;
      }
      return t;
    }));
    // Outlook sync: task placed on calendar → create or update event
    if (snapshot) {
      syncTaskToOutlook(snapshot).then(newId => {
        if (newId && newId !== snapshot!.outlookEventId) {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, outlookEventId: newId } : t));
          persistTask({ ...snapshot!, outlookEventId: newId });
        }
      });
    }
  }, [activeWeek, persistTask, syncTaskToOutlook]);

  const handleDropToDelegation = useCallback((taskId: string) => {
    let snapshot: TaskData | null = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, location: 'delegation' as const, status: 'Delegated' as const, calendarPosition: undefined };
        snapshot = updated;
        persistTask(updated);
        return updated;
      }
      return t;
    }));
    // Outlook sync: delegated tasks shouldn't block your own calendar
    if (snapshot) {
      syncTaskToOutlook(snapshot).then(newId => {
        if (newId !== snapshot!.outlookEventId) {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, outlookEventId: newId } : t));
          persistTask({ ...snapshot!, outlookEventId: newId });
        }
      });
    }
  }, [persistTask, syncTaskToOutlook]);

  // Accept a pending delegated task
  const handleAcceptDelegation = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, pendingDelegation: false };
        persistTask(updated);
        return updated;
      }
      return t;
    }));
  }, [persistTask]);

  // Decline a pending delegated task — return it to the original sender
  const handleDeclineDelegation = useCallback((taskId: string) => {
    const declinedTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));

    if (!isDev && currentUser && declinedTask) {
      // Delete from decliner's list
      fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser },
      }).catch(err => console.warn('Failed to delete declined task:', err));

      // Return task to the original sender
      if (declinedTask.delegatedBy) {
        fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': declinedTask.delegatedBy,
          },
          body: JSON.stringify({
            id: 'task-' + Date.now() + '-returned',
            title: declinedTask.title,
            category: declinedTask.category,
            priority: declinedTask.priority,
            status: 'Not Started',
            duration: declinedTask.duration,
            source: `Declined by ${currentUser}`,
            startTime: declinedTask.startTime,
            endTime: declinedTask.endTime,
            requester: declinedTask.requester,
            due: declinedTask.due,
            notes: declinedTask.notes,
            location: 'notebook',
            pendingDelegation: true,
            delegatedBy: currentUser,
          }),
        }).catch(err => console.warn('Failed to return task to sender:', err));
      }
    }
  }, [currentUser, tasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const target = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (!isDev && currentUser) {
      fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser },
      }).catch(err => console.warn('Failed to delete task:', err));

      // If this task had an Outlook event, clean it up too
      if (target?.outlookEventId) {
        import('./graphService').then(({ deleteTaskEvent }) => {
          getMsal().then(instance => deleteTaskEvent(instance, target.outlookEventId!));
        });
      }
    }
  }, [currentUser, tasks, getMsal]);

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
    let savedSnapshot: TaskData | null = null;
    setTasks(prev => {
      const exists = prev.find(t => t.id === updatedTask.id);
      let result: TaskData[];
      if (exists) {
        result = prev.map(t => {
          if (t.id === updatedTask.id) {
            let location = t.location;
            if (updatedTask.status === 'Delegated') location = 'delegation';
            else if (t.location === 'delegation') location = 'notebook';
            const saved = { ...updatedTask, location, calendarPosition: location === 'delegation' ? undefined : t.calendarPosition, outlookEventId: t.outlookEventId };
            savedSnapshot = saved;
            persistTask(saved);
            return saved;
          }
          return t;
        });
      } else {
        const location = updatedTask.status === 'Delegated' ? 'delegation' as const : 'notebook' as const;
        const saved = { ...updatedTask, location };
        persistTask(saved, 'POST');
        result = [saved, ...prev];
      }

      // Dev mode: simulate receiving a pending delegation for testing
      if (isDev && updatedTask.status === 'Delegated' && updatedTask.delegated) {
        const wasDelegated = exists?.delegated || '';
        if (updatedTask.delegated !== wasDelegated) {
          const pendingTask: TaskData = {
            id: 'task-' + Date.now() + '-pending',
            title: updatedTask.title,
            category: updatedTask.category,
            priority: updatedTask.priority,
            status: 'Not Started',
            duration: updatedTask.duration,
            source: `Delegated by ${currentUserRef.current}`,
            requester: currentUserRef.current || '',
            due: updatedTask.due,
            notes: updatedTask.notes,
            location: 'notebook',
            pendingDelegation: true,
            delegatedBy: currentUserRef.current || '',
          };
          result = [pendingTask, ...result];
        }
      }

      return result;
    });

    // After UI updates: if the task is on the calendar, push title/duration changes to Outlook
    if (savedSnapshot) {
      const snap = savedSnapshot as TaskData;
      syncTaskToOutlook(snap).then(newId => {
        if (newId !== snap.outlookEventId) {
          setTasks(prev => prev.map(t => t.id === snap.id ? { ...t, outlookEventId: newId } : t));
          persistTask({ ...snap, outlookEventId: newId });
        }
      });
    }
  }, [persistTask, syncTaskToOutlook]);

  // Handle Teams adaptive card deep links: ?action=accept|decline&taskId=...
  // Fires once tasks are loaded so we can find the referenced task.
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (!tasksLoaded || deepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const targetTaskId = params.get('taskId');
    if (!targetTaskId) return;

    deepLinkHandledRef.current = true;

    if (action === 'accept') {
      handleAcceptDelegation(targetTaskId);
    } else if (action === 'decline') {
      handleDeclineDelegation(targetTaskId);
    } else {
      handleEditTask(targetTaskId);
    }

    // Strip query params so a refresh doesn't re-run the action
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }, [tasksLoaded, handleAcceptDelegation, handleDeclineDelegation, handleEditTask]);

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
    <div className="mac-app-shell">
      <header className="mac-app-header">
        <div className="mac-app-header-left">
          <img src="/mac_logo.png" alt="MAC Products" className="mac-app-logo" />
          <div>
            <h1 className="mac-app-title">MAC Task Manager</h1>
            <p className="mac-app-subtitle">{currentUser}</p>
          </div>
        </div>
        <div className="mac-app-header-right">
          <span className="mac-app-version">V1.0.0</span>
        </div>
      </header>

      <div className="workspace" data-panel={activeMobilePanel}>
        <TaskPanel
          tasks={notebookTasks}
          ghostTaskIds={ghostTaskIds}
          sortMode={sortMode}
          users={users}
          onSortChange={setSortMode}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDrop={handleDropToNotebook}
          onAcceptDelegation={handleAcceptDelegation}
          onDeclineDelegation={handleDeclineDelegation}
          onDeleteTask={handleDeleteTask}
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
          users={users}
          onEditTask={handleEditTask}
          onDrop={handleDropToDelegation}
          onDeleteTask={handleDeleteTask}
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
        onDelete={handleDeleteTask}
      />

      {/* Mobile / Tablet Navigation Bar */}
      <nav className="mobile-nav">
        <button
          className={`mobile-nav-btn ${activeMobilePanel === 'notebook' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel('notebook')}
        >
          {notebookTasks.filter((t: TaskData) => t.pendingDelegation).length > 0 && (
            <span className="mobile-nav-badge">
              {notebookTasks.filter((t: TaskData) => t.pendingDelegation).length}
            </span>
          )}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          Tasks
        </button>
        <button
          className={`mobile-nav-btn ${activeMobilePanel === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel('calendar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Calendar
        </button>
        <button
          className={`mobile-nav-btn ${activeMobilePanel === 'delegation' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel('delegation')}
        >
          {delegationTasks.length > 0 && (
            <span className="mobile-nav-badge">{delegationTasks.length}</span>
          )}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Delegated
        </button>
      </nav>
    </div>
  );
};

export default App;
