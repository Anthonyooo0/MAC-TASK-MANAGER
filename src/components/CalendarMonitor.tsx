import React, { useMemo } from 'react';
import type { TaskData } from '../types';
import { schedule } from '../data/meetings';
import { getWeekDates, parseDurationToMinutes } from '../utils';
import TaskCard from './TaskCard';

const SLOT_HOURS = [
  { start: 8, end: 9 },
  { start: 9, end: 11 },
  { start: 11, end: 12 },
  { start: 12, end: 13 },
  { start: 13, end: 15 },
  { start: 15, end: 17 },
];

function timeToHour(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function getTaskSpan(task: TaskData) {
  if (!task.startTime || !task.endTime) return null;
  const startH = timeToHour(task.startTime);
  const endH = timeToHour(task.endTime);
  if (endH <= startH) return null;

  const slots: number[] = [];
  for (let i = 0; i < SLOT_HOURS.length; i++) {
    if (startH < SLOT_HOURS[i].end && endH > SLOT_HOURS[i].start) slots.push(i);
  }
  if (slots.length === 0) return null;

  const firstStart = SLOT_HOURS[slots[0]].start;
  const lastEnd = SLOT_HOURS[slots[slots.length - 1]].end;
  const totalH = lastEnd - firstStart;

  return {
    startSlot: slots[0],
    slotCount: slots.length,
    topPercent: ((startH - firstStart) / totalH) * 100,
    heightPercent: ((endH - startH) / totalH) * 100,
  };
}

export interface CalendarMeeting {
  id: string;
  title: string;
  day: number;      // 0=Mon, 4=Fri
  startSlot: number; // first slot it appears in
  slots: number[];   // all slot indices it spans
  duration: string;
  timeLabel: string; // e.g. "12:00 PM - 5:00 PM"
  topPercent: number;    // % offset from top of first slot row
  heightPercent: number; // % of total spanned rows
}

interface CalendarMonitorProps {
  activeWeek: number;
  onWeekChange: (week: number) => void;
  calendarTasks: TaskData[];
  outlookMeetings: CalendarMeeting[];
  onDropToCalendar: (taskId: string, day: number, slot: number) => void;
  onEditTask: (taskId: string) => void;
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const CalendarMonitor: React.FC<CalendarMonitorProps> = ({
  activeWeek, onWeekChange, calendarTasks, outlookMeetings, onDropToCalendar, onEditTask
}) => {
  const weekDates = useMemo(() => getWeekDates(activeWeek), [activeWeek]);

  const monthLabel = useMemo(() => {
    const today = new Date();
    const currentDayIndex = today.getDay() || 7;
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - currentDayIndex + 1);
    const mon = new Date(startOfThisWeek);
    mon.setDate(mon.getDate() + ((activeWeek - 1) * 7));
    return mon.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [activeWeek]);

  const saturationClasses = useMemo(() => {
    const classes: string[] = [];
    for (let day = 0; day < 5; day++) {
      let totalMinutes = 0;
      calendarTasks.forEach(t => {
        if (t.calendarPosition?.week === activeWeek && t.calendarPosition?.day === day) {
          totalMinutes += parseDurationToMinutes(t.duration);
        }
      });
      const counted = new Set<string>();
      outlookMeetings.forEach(m => {
        if (m.day === day && !counted.has(m.id)) {
          counted.add(m.id);
          totalMinutes += parseDurationToMinutes(m.duration);
        }
      });
      const ratio = totalMinutes / 480;
      if (ratio === 0) classes.push('sat-none');
      else if (ratio < 0.6) classes.push('sat-low');
      else if (ratio <= 0.8) classes.push('sat-med');
      else classes.push('sat-high');
    }
    return classes;
  }, [calendarTasks, outlookMeetings, activeWeek]);

  return (
    <div id="monitor-assembly">
      <div id="monitor">
        <div className="monitor-screen">
          <div className="month-label">
            {monthLabel}
          </div>
          <div className="week-tabs">
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                className={`tab ${activeWeek === w ? 'active' : ''}`}
                onClick={() => onWeekChange(w)}
              >
                Week {w}
              </button>
            ))}
          </div>

          <div className="calendar-container">
            <div className="calendar-header">
              <div>TIME</div>
              {DAY_NAMES.map((name, i) => (
                <div key={i} className={saturationClasses[i]}>
                  {name}
                  <span className="date-sub">{weekDates[i]}</span>
                </div>
              ))}
            </div>

            {/* Grid-based calendar with spanning meetings */}
            <div className="calendar-grid">
              {/* Drop zone cells - one per slot per day */}
              {schedule.map((slot, slotIndex) => (
                <React.Fragment key={slotIndex}>
                  <div className="time-label" style={{ gridRow: slotIndex + 1, gridColumn: 1 }}>
                    {slot.time}
                    <br />
                    <span>{slot.label}</span>
                  </div>
                  {Array.from({ length: 5 }, (_, dayIndex) => {
                    const tasksInSlot = calendarTasks.filter(
                      t => t.calendarPosition?.week === activeWeek &&
                        t.calendarPosition?.day === dayIndex &&
                        t.calendarPosition?.slot === slotIndex
                    );
                    // Check if a meeting occupies this cell (to hide drop zone content behind it)
                    const hasMeetingHere = outlookMeetings.some(
                      m => m.day === dayIndex && m.slots.includes(slotIndex)
                    );

                    return (
                      <DropZone
                        key={dayIndex}
                        day={dayIndex}
                        slot={slotIndex}
                        style={{ gridRow: slotIndex + 1, gridColumn: dayIndex + 2 }}
                        onDrop={onDropToCalendar}
                      >
                        {!hasMeetingHere && tasksInSlot.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => onEditTask(task.id)}
                          />
                        ))}
                      </DropZone>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Spanning meeting overlays */}
              {outlookMeetings.map(meeting => {
                const rowStart = meeting.startSlot + 1;
                const rowEnd = rowStart + meeting.slots.length;
                const col = meeting.day + 2;

                return (
                  <div
                    key={meeting.id}
                    className="meeting-span-wrapper"
                    style={{
                      gridRow: `${rowStart} / ${rowEnd}`,
                      gridColumn: col,
                    }}
                  >
                    <div
                      className="meeting-span"
                      style={{
                        position: 'absolute',
                        top: `${meeting.topPercent}%`,
                        height: `${meeting.heightPercent}%`,
                        left: '2px',
                        right: '2px',
                      }}
                    >
                      <strong>{meeting.title}</strong>
                      <span className="meeting-time">{meeting.timeLabel}</span>
                    </div>
                  </div>
                );
              })}

              {/* Spanning task overlays (tasks with start/end times) */}
              {calendarTasks.filter(t => t.calendarPosition?.week === activeWeek && t.startTime && t.endTime).map(task => {
                const span = getTaskSpan(task);
                if (!span || task.calendarPosition === undefined) return null;
                const col = task.calendarPosition!.day + 2;
                const rowStart = span.startSlot + 1;
                const rowEnd = rowStart + span.slotCount;

                return (
                  <div
                    key={task.id + '-span'}
                    className="meeting-span-wrapper"
                    style={{
                      gridRow: `${rowStart} / ${rowEnd}`,
                      gridColumn: col,
                    }}
                  >
                    <div
                      className="task-span"
                      style={{
                        position: 'absolute',
                        top: `${span.topPercent}%`,
                        height: `${span.heightPercent}%`,
                        left: '2px',
                        right: '2px',
                      }}
                      onClick={() => onEditTask(task.id)}
                    >
                      <strong>{task.title}</strong>
                      <span className="meeting-time">{task.startTime} - {task.endTime}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="stand-neck" />
      <div className="stand-base" />
    </div>
  );
};

const DropZone: React.FC<{
  day: number;
  slot: number;
  style: React.CSSProperties;
  onDrop: (taskId: string, day: number, slot: number) => void;
  children: React.ReactNode;
}> = ({ day, slot, style, onDrop, children }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
      style={style}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragEnter={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) onDrop(taskId, day, slot);
      }}
    >
      {children}
    </div>
  );
};

export default CalendarMonitor;
