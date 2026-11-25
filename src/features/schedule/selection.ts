export type Shift = "day" | "night";

export type ScheduleAssignments = Readonly<Record<string, Shift>>;

export type CalendarMonth = {
  year: number;
  monthIndex: number;
};

function dateValue(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dateFromKey(key: string): Date {
  const [yearText, monthText, dayText] = key.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function windowEnd(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() + 2, 0);
}

export function isSelectable(date: Date, today: Date): boolean {
  const value = dateValue(date);
  return value >= dateValue(today) && value <= dateValue(windowEnd(today));
}

export function openMonths(today: Date): readonly [CalendarMonth, CalendarMonth] {
  const current: CalendarMonth = {
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  };
  const next = new Date(current.year, current.monthIndex + 1, 1);

  return [current, { year: next.getFullYear(), monthIndex: next.getMonth() }];
}

function datesFromEarlier(start: Date, end: Date): Date[] {
  const ordered = dateValue(start) <= dateValue(end) ? [start, end] : [end, start];
  const cursor = new Date(ordered[0].getFullYear(), ordered[0].getMonth(), ordered[0].getDate());
  const last = dateValue(ordered[1]);
  const dates: Date[] = [];

  while (dateValue(cursor) <= last) {
    dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function fillRange(
  start: Date,
  end: Date,
  shift: Shift,
  today: Date,
  current: ScheduleAssignments,
): ScheduleAssignments {
  const next: Record<string, Shift> = { ...current };

  for (const date of datesFromEarlier(start, end)) {
    if (isSelectable(date, today)) {
      next[dateKey(date)] = shift;
    }
  }

  return next;
}
