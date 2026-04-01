import React, { useMemo } from 'react';
import type { TaskData } from '../types';
import { schedule } from '../data/meetings';
import { getWeekDates, parseDurationToMinutes } from '../utils';


const SLOT_HOURS = [
  { start: 8, end: 9 },
  { start: 9, end: 11 },
  { start: 11, end: 12 },
  { start: 12, end: 13 },
  { start: 13, end: 15 },
  { start: 15, end: 17 },
];

/** Calculate task span from its drop slot + duration */
function getTaskSpan(task: TaskData) {
  const dropSlot = task.calendarPosition?.slot;
  if (dropSlot === undefined) return null;

  // Parse duration to hours
  const durStr = task.duration || '30m';
  let durationHours = 0;
  const hMatch = durStr.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mMatch = durStr.match(/(\d+)\s*m/i);
  if (hMatch) durationHours += parseFloat(hMatch[1]);
  if (mMatch) durationHours += parseInt(mMatch[1]) / 60;
  if (durationHours === 0) durationHours = 0.5;

  const startH = SLOT_HOURS[dropSlot].start;
  const endH = startH + durationHours;

  // Find all slots this task spans
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
    heightPercent: (Math.min(endH, lastEnd) - startH) / totalH * 100,
    timeLabel: formatHour(startH) + ' - ' + formatHour(endH),
  };
}

function formatHour(h: number): string {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  const period = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${hr12}:${min.toString().padStart(2, '0')} ${period}`;
}

export interface MeetingAttendee {
  name: string;
  email: string;
  response: string; // none, organizer, accepted, declined, tentativelyAccepted
  type: string;     // required, optional
}

export interface CalendarMeeting {
  id: string;
  title: string;
  day: number;
  startSlot: number;
  slots: number[];
  duration: string;
  timeLabel: string;
  topPercent: number;
  heightPercent: number;
  // Extra details for hover
  location?: string;
  organizer?: string;
  attendees?: MeetingAttendee[];
  bodyPreview?: string;
  myResponse?: string;
  isOnline?: boolean;
  onlineMeetingUrl?: string;
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

const RESPONSE_LABELS: Record<string, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
  tentativelyAccepted: 'Tentative',
  organizer: 'Organizer',
  none: 'No response',
};

const RESPONSE_COLORS: Record<string, string> = {
  accepted: '#27ae60',
  declined: '#e74c3c',
  tentativelyAccepted: '#f39c12',
  organizer: '#3182ce',
  none: '#95a5a6',
};

const MeetingBlock: React.FC<{ meeting: CalendarMeeting }> = ({ meeting }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className="meeting-span"
      style={{
        position: 'absolute',
        top: `${meeting.topPercent}%`,
        height: `${meeting.heightPercent}%`,
        left: '2px',
        right: '2px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <strong>{meeting.title}</strong>
      <span className="meeting-time">{meeting.timeLabel}</span>

      {hovered && (
        <div className="meeting-tooltip">
          <div className="meeting-tooltip-title">{meeting.title}</div>
          <div className="meeting-tooltip-time">{meeting.timeLabel} ({meeting.duration})</div>

          {meeting.location && (
            <div className="meeting-tooltip-row">
              <span className="meeting-tooltip-label">Location</span>
              <span>{meeting.location}</span>
            </div>
          )}

          {meeting.organizer && (
            <div className="meeting-tooltip-row">
              <span className="meeting-tooltip-label">Organizer</span>
              <span>{meeting.organizer}</span>
            </div>
          )}

          {meeting.myResponse && (
            <div className="meeting-tooltip-row">
              <span className="meeting-tooltip-label">Your RSVP</span>
              <span style={{ color: RESPONSE_COLORS[meeting.myResponse] || '#636e72', fontWeight: 700 }}>
                {RESPONSE_LABELS[meeting.myResponse] || meeting.myResponse}
              </span>
            </div>
          )}

          {meeting.isOnline && (
            <div className="meeting-tooltip-row">
              <span className="meeting-tooltip-label">Online</span>
              <span style={{ color: '#3182ce' }}>Teams Meeting</span>
            </div>
          )}

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="meeting-tooltip-attendees">
              <span className="meeting-tooltip-label">Attendees ({meeting.attendees.length})</span>
              <div className="meeting-tooltip-list">
                {meeting.attendees.map((a, i) => (
                  <div key={i} className="meeting-tooltip-attendee">
                    <span
                      className="attendee-dot"
                      style={{ background: RESPONSE_COLORS[a.response] || '#95a5a6' }}
                    />
                    <span className="attendee-name">{a.name || a.email.split('@')[0]}</span>
                    <span className="attendee-status">{RESPONSE_LABELS[a.response] || a.response}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {meeting.bodyPreview && (
            <div className="meeting-tooltip-body">{meeting.bodyPreview}</div>
          )}
        </div>
      )}
    </div>
  );
};

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
                    return (
                      <DropZone
                        key={dayIndex}
                        day={dayIndex}
                        slot={slotIndex}
                        style={{ gridRow: slotIndex + 1, gridColumn: dayIndex + 2 }}
                        onDrop={onDropToCalendar}
                      />
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
                    <MeetingBlock meeting={meeting} />
                  </div>
                );
              })}

              {/* Spanning task overlays based on duration */}
              {calendarTasks.filter(t => t.calendarPosition?.week === activeWeek).map(task => {
                const span = getTaskSpan(task);
                if (!span || !task.calendarPosition) return null;
                const col = task.calendarPosition.day + 2;
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
                      <span className="meeting-time">{span.timeLabel} ({task.duration})</span>
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
  children?: React.ReactNode;
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
