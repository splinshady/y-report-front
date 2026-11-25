import { useState } from "react";
import { type DayButtonProps, type Modifiers } from "react-day-picker";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import { PageTitle } from "../../components/ui/type";
import { scheduleMessages } from "./messages";
import {
  approveRequest,
  createRequest,
  dateFromKey,
  dateKey,
  fillRange,
  isSelectable,
  openMonths,
  type Assignment,
  type CalendarMonth,
  type ScheduleAssignments,
  type Shift,
  type ShiftStatus,
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

export function assignmentClassName(assignment: Assignment | undefined): string {
  if (assignment?.status === "draft" && assignment.shift === "day") {
    return "bg-tile-blue";
  }
  if (assignment?.status === "draft" && assignment.shift === "night") {
    return "bg-tile-lilac";
  }
  if (assignment?.status === "requested" && assignment.shift === "day") {
    return "bg-tile-sage";
  }
  if (assignment?.status === "requested" && assignment.shift === "night") {
    return "bg-tile-rose";
  }
  if (assignment?.status === "approved" && assignment.shift === "day") {
    return "bg-approved-day";
  }
  if (assignment?.status === "approved" && assignment.shift === "night") {
    return "bg-approved-night";
  }
  return "bg-transparent";
}

function assignmentFromModifiers(modifiers: Modifiers): Assignment | undefined {
  const pairs: Array<[string, Assignment]> = [
    ["draftDay", { shift: "day", status: "draft" }],
    ["draftNight", { shift: "night", status: "draft" }],
    ["requestedDay", { shift: "day", status: "requested" }],
    ["requestedNight", { shift: "night", status: "requested" }],
    ["approvedDay", { shift: "day", status: "approved" }],
    ["approvedNight", { shift: "night", status: "approved" }],
  ];

  for (const [name, assignment] of pairs) {
    if (modifiers[name]) {
      return assignment;
    }
  }

  return undefined;
}

function ScheduleDayButton({ day, modifiers, ...props }: DayButtonProps) {
  const classes = [
    "flex min-h-touch w-full min-w-0 items-center justify-center border-0 p-0 font-sans",
    props.disabled ? "text-muted" : "text-ink",
    assignmentClassName(assignmentFromModifiers(modifiers)),
  ];

  if (modifiers.periodStart) {
    classes.push("ring-2", "ring-inset", "ring-ink");
  }

  return (
    <button
      {...props}
      aria-label={scheduleMessages.dayLabel(day.date)}
      aria-pressed={modifiers.periodStart ? true : undefined}
      className={classes.join(" ")}
    >
      {day.date.getDate()}
    </button>
  );
}

function isSameMonth(left: CalendarMonth, right: CalendarMonth): boolean {
  return left.year === right.year && left.monthIndex === right.monthIndex;
}

function datesWith(assignments: ScheduleAssignments, status: ShiftStatus, shift: Shift): Date[] {
  return Object.entries(assignments)
    .filter(([, assignment]) => assignment.status === status && assignment.shift === shift)
    .map(([key]) => dateFromKey(key));
}

export function SchedulePage({ today }: { today: Date }) {
  const months = openMonths(today);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(months[0]);
  const [shift, setShift] = useState<Shift>("day");
  const [period, setPeriod] = useState(false);
  const [rangeStartKey, setRangeStartKey] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ScheduleAssignments>({});
  const hasDraft = Object.values(assignments).some((assignment) => assignment.status === "draft");
  const hasRequested = Object.values(assignments).some((assignment) => assignment.status === "requested");
  const requestRows = Object.entries(assignments)
    .filter(([, assignment]) => assignment.status === "requested" || assignment.status === "approved")
    .sort(([left], [right]) => left.localeCompare(right));

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
    const existing = assignments[key];
    if (existing && existing.status !== "draft") {
      return;
    }

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
      const currentDay = current[key];
      if (currentDay && currentDay.status !== "draft") {
        return current;
      }

      if (currentDay?.shift === shift) {
        const next: Record<string, Assignment> = { ...current };
        delete next[key];
        return next;
      }

      return { ...current, [key]: { shift, status: "draft" } };
    });
  }

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
      <div className="mt-4 flex w-full flex-col gap-2">
        <Button
          className="w-full"
          disabled={!hasDraft}
          onClick={() => {
            setAssignments((current) => createRequest(current));
            setRangeStartKey(null);
            setPeriod(false);
          }}
        >
          {scheduleMessages.createRequest}
        </Button>
        <Button
          className="w-full"
          disabled={!hasRequested}
          onClick={() => setAssignments((current) => approveRequest(current))}
        >
          {scheduleMessages.approveRequest}
        </Button>
      </div>
      <div className="mt-4 flex w-full flex-col gap-4 md:flex-row md:items-start">
        <Calendar
          className="min-w-0 flex-1"
          month={new Date(visibleMonth.year, visibleMonth.monthIndex, 1)}
          onMonthChange={(month) => {
            const next = months.find(
              (item) => item.year === month.getFullYear() && item.monthIndex === month.getMonth(),
            );
            if (next) {
              setVisibleMonth(next);
            }
          }}
          startMonth={new Date(months[0].year, months[0].monthIndex, 1)}
          endMonth={new Date(months[1].year, months[1].monthIndex, 1)}
          disabled={(date) => !isSelectable(date, today)}
          onDayClick={selectDay}
          labels={{
            labelPrevious: () => scheduleMessages.previousMonth,
            labelNext: () => scheduleMessages.nextMonth,
            labelGrid: (date) => scheduleMessages.monthLabel(date.getFullYear(), date.getMonth()),
          }}
          formatters={{
            formatCaption: (month) => scheduleMessages.monthLabel(month.getFullYear(), month.getMonth()),
          }}
          modifiers={{
            draftDay: datesWith(assignments, "draft", "day"),
            draftNight: datesWith(assignments, "draft", "night"),
            requestedDay: datesWith(assignments, "requested", "day"),
            requestedNight: datesWith(assignments, "requested", "night"),
            approvedDay: datesWith(assignments, "approved", "day"),
            approvedNight: datesWith(assignments, "approved", "night"),
            periodStart: rangeStartKey ? [dateFromKey(rangeStartKey)] : [],
          }}
          components={{ DayButton: ScheduleDayButton }}
        />
        <ul aria-label={scheduleMessages.requests} className="flex w-full min-w-0 flex-col gap-2 md:w-80">
          {requestRows.map(([key, assignment]) => (
            <li
              key={key}
              className={`flex min-h-touch items-center px-3 font-sans text-ink ${assignmentClassName(assignment)}`}
            >
              {scheduleMessages.requestLine(dateFromKey(key), assignment.shift)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
