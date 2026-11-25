import { useState } from "react";
import { PageTitle } from "../../components/ui/type";
import { scheduleMessages } from "./messages";
import {
  dateFromKey,
  dateKey,
  fillRange,
  isSelectable,
  openMonths,
  type CalendarMonth,
  type ScheduleAssignments,
  type Shift,
} from "./selection";

const shiftModes = [
  { id: "day", label: scheduleMessages.day },
  { id: "night", label: scheduleMessages.night },
] as const;

function modeClassName(pressed: boolean): string {
  return [
    "flex min-h-touch min-w-0 flex-1 items-center justify-center border-0 px-2 text-center font-sans text-body tracking-body",
    pressed ? "bg-surface font-medium text-ink" : "bg-transparent text-muted",
  ].join(" ");
}

function dayClassName(options: {
  shift: Shift | undefined;
  marked: boolean;
  selectable: boolean;
}): string {
  const classes = [
    "flex min-h-touch w-full min-w-0 items-center justify-center border-0 p-0 font-sans",
    options.selectable ? "text-ink" : "text-muted",
  ];

  if (options.shift === "day") {
    classes.push("bg-tile-blue");
  } else if (options.shift === "night") {
    classes.push("bg-tile-lilac");
  } else {
    classes.push("bg-transparent");
  }

  if (options.marked) {
    classes.push("ring-2", "ring-inset", "ring-ink");
  }

  return classes.join(" ");
}

function isSameMonth(left: CalendarMonth, right: CalendarMonth): boolean {
  return left.year === right.year && left.monthIndex === right.monthIndex;
}

function leadingEmptyCells(month: CalendarMonth): number {
  const weekday = new Date(month.year, month.monthIndex, 1).getDay();
  return (weekday + 6) % 7;
}

function monthLength(month: CalendarMonth): number {
  return new Date(month.year, month.monthIndex + 1, 0).getDate();
}

export function SchedulePage({ today }: { today: Date }) {
  const months = openMonths(today);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(months[0]);
  const [shift, setShift] = useState<Shift>("day");
  const [period, setPeriod] = useState(false);
  const [rangeStartKey, setRangeStartKey] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ScheduleAssignments>({});

  function togglePeriod() {
    if (period) {
      setRangeStartKey(null);
      setPeriod(false);
      return;
    }

    setPeriod(true);
  }

  function selectDay(date: Date) {
    if (!isSelectable(date, today)) {
      return;
    }

    const key = dateKey(date);

    if (period) {
      if (rangeStartKey == null) {
        setRangeStartKey(key);
        return;
      }

      setAssignments((current) => fillRange(dateFromKey(rangeStartKey), date, shift, today, current));
      setRangeStartKey(null);
      setPeriod(false);
      return;
    }

    setAssignments((current) => {
      if (current[key] === shift) {
        const next: Record<string, Shift> = { ...current };
        delete next[key];
        return next;
      }

      return { ...current, [key]: shift };
    });
  }

  const blanks = leadingEmptyCells(visibleMonth);
  const days = monthLength(visibleMonth);

  return (
    <section className="font-sans">
      <PageTitle>{scheduleMessages.title}</PageTitle>
      <div className="mt-6 flex w-full gap-2">
        {months.map((month) => {
          const pressed = isSameMonth(month, visibleMonth);
          return (
            <button
              key={`${month.year}-${month.monthIndex}`}
              type="button"
              aria-pressed={pressed}
              className={modeClassName(pressed)}
              onClick={() => setVisibleMonth(month)}
            >
              {scheduleMessages.monthLabel(month.year, month.monthIndex)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex w-full gap-2">
        {shiftModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={shift === mode.id}
            className={modeClassName(shift === mode.id)}
            onClick={() => setShift(mode.id)}
          >
            {mode.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={period}
          className={modeClassName(period)}
          onClick={togglePeriod}
        >
          {scheduleMessages.period}
        </button>
      </div>
      <div className="mt-4 grid w-full grid-cols-7">
        {Array.from({ length: blanks }, (_, index) => (
          <div key={`blank-${visibleMonth.year}-${visibleMonth.monthIndex}-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const date = new Date(visibleMonth.year, visibleMonth.monthIndex, index + 1);
          const key = dateKey(date);
          const selectable = isSelectable(date, today);
          const assigned = assignments[key];
          const marked = period && rangeStartKey === key;

          return (
            <button
              key={key}
              type="button"
              disabled={!selectable}
              aria-label={scheduleMessages.dayLabel(date)}
              aria-pressed={marked ? true : undefined}
              className={dayClassName({ shift: assigned, marked, selectable })}
              onClick={() => selectDay(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}
