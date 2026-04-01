import React, { useMemo } from 'react';
import type { TaskData } from '../types';
import { presetMeetings, schedule } from '../data/meetings';
import { getWeekDates, parseDurationToMinutes } from '../utils';
import TaskCard from './TaskCard';

interface CalendarMonitorProps {
  activeWeek: number;
  onWeekChange: (week: number) => void;
  calendarTasks: TaskData[];
  onDropToCalendar: (taskId: string, day: number, slot: number) => void;
  onEditTask: (taskId: string) => void;
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const CalendarMonitor: React.FC<CalendarMonitorProps> = ({
  activeWeek, onWeekChange, calendarTasks, onDropToCalendar, onEditTask
}) => {
  const weekDates = useMemo(() => getWeekDates(activeWeek), [activeWeek]);

  // Current month name from the active week's Monday
  const monthLabel = useMemo(() => {
    const today = new Date();
    const currentDayIndex = today.getDay() || 7;
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - currentDayIndex + 1);
    const mon = new Date(startOfThisWeek);
    mon.setDate(mon.getDate() + ((activeWeek - 1) * 7));
    return mon.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [activeWeek]);

  // Calculate saturation per day
  const saturationClasses = useMemo(() => {
    const classes: string[] = [];
    for (let day = 0; day < 5; day++) {
      let totalMinutes = 0;
      // Count calendar tasks on this day
      calendarTasks.forEach(t => {
        if (t.calendarPosition?.week === activeWeek && t.calendarPosition?.day === day) {
          totalMinutes += parseDurationToMinutes(t.duration);
        }
      });
      // Count preset meetings on this day
      presetMeetings.forEach(m => {
        if (m.week === activeWeek && m.day === day) {
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
  }, [calendarTasks, activeWeek]);

  return (
    <div id="monitor-assembly">
      <div id="monitor">
        <div className="monitor-screen">
          {/* Month Label */}
          <div className="month-label">
            {monthLabel}
          </div>
          {/* Week Tabs */}
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
            {/* Header */}
            <div className="calendar-header">
              <div>TIME</div>
              {DAY_NAMES.map((name, i) => (
                <div key={i} className={saturationClasses[i]}>
                  {name}
                  <span className="date-sub">{weekDates[i]}</span>
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {schedule.map((slot, slotIndex) => (
              <div className="calendar-row" key={slotIndex}>
                <div className="time-label">
                  {slot.time}
                  <br />
                  <span>{slot.label}</span>
                </div>
                {Array.from({ length: 5 }, (_, dayIndex) => {
                  const meeting = presetMeetings.find(
                    m => m.week === activeWeek && m.day === dayIndex && m.slot === slotIndex
                  );
                  const tasksInSlot = calendarTasks.filter(
                    t => t.calendarPosition?.week === activeWeek &&
                      t.calendarPosition?.day === dayIndex &&
                      t.calendarPosition?.slot === slotIndex
                  );

                  return (
                    <DropZone
                      key={dayIndex}
                      day={dayIndex}
                      slot={slotIndex}
                      onDrop={onDropToCalendar}
                    >
                      {meeting && (
                        <div className="preset-meeting" data-duration={meeting.duration}>
                          {meeting.title}
                        </div>
                      )}
                      {tasksInSlot.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => onEditTask(task.id)}
                        />
                      ))}
                    </DropZone>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="stand-neck" />
      <div className="stand-base" />
    </div>
  );
};

// Drop zone sub-component
const DropZone: React.FC<{
  day: number;
  slot: number;
  onDrop: (taskId: string, day: number, slot: number) => void;
  children: React.ReactNode;
}> = ({ day, slot, onDrop, children }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
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
