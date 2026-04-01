export function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 30;
  let min = 0;
  const hMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mMatch = durationStr.match(/(\d+)\s*m/i);
  if (hMatch) min += parseFloat(hMatch[1]) * 60;
  if (mMatch) min += parseInt(mMatch[1]);
  return min || 30;
}

export function getPriorityLabel(priority: number): string {
  return priority === 3 ? 'High' : priority === 2 ? 'Med' : 'Low';
}

export function getWeekDates(weekNum: number): string[] {
  const today = new Date();
  const currentDayIndex = today.getDay() || 7;
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - currentDayIndex + 1);

  const mon = new Date(startOfThisWeek);
  mon.setDate(mon.getDate() + ((weekNum - 1) * 7));

  const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    days.push(d.toLocaleDateString('en-US', fmt));
  }
  return days;
}
