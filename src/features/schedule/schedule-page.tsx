import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type DayButtonProps, type Modifiers } from "react-day-picker";
import { Calendar } from "../../components/ui/calendar";
import { PageTitle } from "../../components/ui/type";
import { type CarsApi } from "../cars/api";
import { CarsScreen } from "../cars/cars-screen";
import { type ScheduleApi, type ScheduleRequest } from "./api";
import { scheduleMessages } from "./messages";
import {
  assignmentsFromRequests,
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
    "inline-flex min-h-touch items-center justify-center border-0 bg-transparent px-3 font-sans text-body tracking-body",
    pressed ? "font-medium text-ink" : "text-muted",
  ].join(" ");
}

function actionClassName(): string {
  return "inline-flex min-h-touch items-center justify-center rounded-pill bg-accent px-4 font-sans text-body tracking-body text-white disabled:opacity-40";
}

function quietActionClassName(): string {
  return "inline-flex min-h-touch items-center justify-center rounded-pill border border-border bg-surface px-4 font-sans text-body tracking-body text-ink disabled:opacity-40";
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

function requestSummary(days: readonly { date: string; shift: Shift }[]) {
  const sorted = [...days].sort((left, right) => left.date.localeCompare(right.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return null;
  }

  const shift = first.shift;
  if (sorted.length === 1) {
    return {
      text: scheduleMessages.requestLine(dateFromKey(first.date), shift),
      shift,
    };
  }

  return {
    text: scheduleMessages.periodLine(dateFromKey(first.date), dateFromKey(last.date), shift),
    shift,
  };
}

function datesWith(assignments: ScheduleAssignments, status: ShiftStatus, shift: Shift): Date[] {
  return Object.entries(assignments)
    .filter(([, assignment]) => assignment.status === status && assignment.shift === shift)
    .map(([key]) => dateFromKey(key));
}

function visibleAssignments(requests: readonly ScheduleRequest[], drafts: ScheduleAssignments) {
  return assignmentsFromRequests(
    requests.flatMap((request) => {
      if (request.status === "rejected") {
        return [];
      }

      return [
        {
          status: request.status,
          createdByName: request.createdBy.name,
          approvedByName: request.approvedBy?.name ?? null,
          days: request.days,
        },
      ];
    }),
    drafts,
  );
}

type DraftGroup = {
  id: string;
  days: Record<string, Shift>;
};

function assignmentsFromGroups(groups: readonly DraftGroup[]): ScheduleAssignments {
  const drafts: Record<string, Assignment> = {};
  for (const group of groups) {
    for (const [date, groupShift] of Object.entries(group.days)) {
      drafts[date] = { shift: groupShift, status: "draft" };
    }
  }
  return drafts;
}

function orderedDates(start: Date, end: Date): Date[] {
  const forward = start.getTime() <= end.getTime();
  const from = forward ? start : end;
  const to = forward ? end : start;
  const dates: Date[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = to.getTime();

  while (cursor.getTime() <= last) {
    dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function requestDays(group: DraftGroup) {
  return Object.entries(group.days)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, groupShift]) => ({ date, shift: groupShift }));
}

export function SchedulePage({
  today,
  api,
  carsApi,
  canManageCars,
  canApprove,
}: {
  today: Date;
  api: ScheduleApi;
  carsApi: CarsApi;
  canManageCars: boolean;
  canApprove: boolean;
}) {
  const months = openMonths(today);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(months[0]);
  const [shift, setShift] = useState<Shift>("day");
  const [period, setPeriod] = useState(false);
  const [rangeStartKey, setRangeStartKey] = useState<string | null>(null);
  const [serverRequests, setServerRequests] = useState<ScheduleRequest[]>([]);
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const loadId = useRef(0);
  const drafts = assignmentsFromGroups(groups);
  const assignments = visibleAssignments(serverRequests, drafts);
  const hasDraft = Object.keys(drafts).length > 0;
  const visibleMonthIndex = months.findIndex(
    (month) => month.year === visibleMonth.year && month.monthIndex === visibleMonth.monthIndex,
  );
  const previousOpenMonth = visibleMonthIndex > 0 ? months[visibleMonthIndex - 1] : null;
  const nextOpenMonth = visibleMonthIndex >= 0 && visibleMonthIndex < months.length - 1 ? months[visibleMonthIndex + 1] : null;

  useEffect(() => {
    const id = loadId.current + 1;
    loadId.current = id;
    setServerRequests([]);
    setGroups([]);
    setRangeStartKey(null);
    setPeriod(false);

    if (!selectedCarId) {
      return;
    }

    let active = true;
    void api
      .load(selectedCarId)
      .then((loaded) => {
        if (active && loadId.current === id) {
          setServerRequests(loaded);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [api, selectedCarId]);

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

      const filled = fillRange(
        dateFromKey(rangeStartKey),
        date,
        shift,
        today,
        visibleAssignments(serverRequests, assignmentsFromGroups(groups)),
      );
      const days: Record<string, Shift> = {};
      for (const rangeDate of orderedDates(dateFromKey(rangeStartKey), date)) {
        const rangeKey = dateKey(rangeDate);
        const assignment = filled[rangeKey];
        if (assignment?.status === "draft") {
          days[rangeKey] = assignment.shift;
        }
      }

      if (Object.keys(days).length > 0) {
        setGroups((current) => {
          const kept = current
            .map((group) => {
              const nextDays = { ...group.days };
              for (const dayKey of Object.keys(days)) {
                delete nextDays[dayKey];
              }
              return { ...group, days: nextDays };
            })
            .filter((group) => Object.keys(group.days).length > 0);
          return [...kept, { id: crypto.randomUUID(), days }];
        });
      }
      setRangeStartKey(null);
      setPeriod(false);
      return;
    }

    setGroups((current) => {
      const visible = visibleAssignments(serverRequests, assignmentsFromGroups(current))[key];
      if (visible && visible.status !== "draft") {
        return current;
      }

      const owner = current.find((group) => key in group.days);
      if (owner?.days[key] === shift) {
        return current
          .map((group) => {
            if (group.id !== owner.id) {
              return group;
            }
            const nextDays = { ...group.days };
            delete nextDays[key];
            return { ...group, days: nextDays };
          })
          .filter((group) => Object.keys(group.days).length > 0);
      }

      if (owner) {
        return current.map((group) =>
          group.id === owner.id ? { ...group, days: { ...group.days, [key]: shift } } : group,
        );
      }

      return [...current, { id: crypto.randomUUID(), days: { [key]: shift } }];
    });
  }

  async function reloadRequests(id: number) {
    if (!selectedCarId) {
      return;
    }
    const loaded = await api.load(selectedCarId).catch(() => null);
    if (loaded && loadId.current === id) {
      setServerRequests(loaded);
    }
  }

  async function submitRequest() {
    const carId = selectedCarId;
    const pending = groups.filter((group) => Object.keys(group.days).length > 0);
    if (!carId || pending.length === 0 || saving) {
      return;
    }

    const id = loadId.current + 1;
    loadId.current = id;
    setSaving(true);
    const created: ScheduleRequest[] = [];
    const createdGroupIds: string[] = [];
    try {
      for (const group of pending) {
        created.push(await api.create(carId, requestDays(group)));
        createdGroupIds.push(group.id);
      }

      if (loadId.current !== id) {
        return;
      }

      setServerRequests((current) => [...current, ...created]);
      setGroups((current) => current.filter((group) => !createdGroupIds.includes(group.id)));
      setRangeStartKey(null);
      setPeriod(false);
    } catch {
      if (created.length > 0 && loadId.current === id) {
        setServerRequests((current) => [...current, ...created]);
        setGroups((current) => current.filter((group) => !createdGroupIds.includes(group.id)));
      }
      await reloadRequests(id);
    } finally {
      if (loadId.current === id) {
        setSaving(false);
      }
    }
  }

  async function changeRequest(requestId: string, action: "approve" | "reject" | "remove") {
    if (saving) {
      return;
    }

    const id = loadId.current + 1;
    loadId.current = id;
    setSaving(true);
    try {
      if (action === "remove") {
        await api.remove(requestId);
        if (loadId.current === id) {
          setServerRequests((current) => current.filter((request) => request.id !== requestId));
        }
        return;
      }

      const updated = action === "approve" ? await api.approve(requestId) : await api.reject(requestId);
      if (loadId.current === id) {
        setServerRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
      }
    } catch {
      await reloadRequests(id);
    } finally {
      if (loadId.current === id) {
        setSaving(false);
      }
    }
  }

  return (
    <section className="font-sans">
      <PageTitle>{scheduleMessages.title}</PageTitle>
      <div className="mt-6">
        <CarsScreen
          api={carsApi}
          canManage={canManageCars}
          selectedId={selectedCarId}
          onSelect={setSelectedCarId}
        />
      </div>
      {selectedCarId ? (
      <div className="mt-6 flex w-full flex-col gap-8 md:flex-row md:items-start">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-1">
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
            <button type="button" aria-pressed={period} className={modeClassName(period)} onClick={togglePeriod}>
              {scheduleMessages.period}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={actionClassName()}
              disabled={!hasDraft || saving}
              onClick={() => void submitRequest()}
            >
              {scheduleMessages.createRequest}
            </button>
          </div>
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center text-ink disabled:opacity-40"
              aria-label={scheduleMessages.previousMonth}
              disabled={previousOpenMonth == null}
              onClick={() => {
                if (previousOpenMonth) {
                  setVisibleMonth(previousOpenMonth);
                }
              }}
            >
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </button>
            <p className="min-w-0 flex-1 text-center font-medium text-ink">
              {scheduleMessages.monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
            </p>
            <button
              type="button"
              className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center text-ink disabled:opacity-40"
              aria-label={scheduleMessages.nextMonth}
              disabled={nextOpenMonth == null}
              onClick={() => {
                if (nextOpenMonth) {
                  setVisibleMonth(nextOpenMonth);
                }
              }}
            >
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
          <Calendar
          className="w-full bg-transparent p-0 shadow-none [--cell-size:var(--spacing-touch)]"
          showOutsideDays
          hideWeekdays
          weekStartsOn={1}
          month={new Date(visibleMonth.year, visibleMonth.monthIndex, 1)}
          onMonthChange={(month) => {
            const next = months.find(
              (item) => item.year === month.getFullYear() && item.monthIndex === month.getMonth(),
            );
            if (next) {
              setVisibleMonth(next);
            }
          }}
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
          classNames={{
            root: "w-full",
            months: "flex w-full flex-col gap-2",
            month: "flex w-full flex-col gap-2",
            month_grid: "w-full",
            week: "mt-1 grid w-full grid-cols-7",
            day: "min-w-0 w-full p-0 text-center",
            nav: "hidden",
            month_caption: "hidden",
          }}
          components={{
            DayButton: ScheduleDayButton,
            Nav: () => <></>,
            MonthCaption: () => <></>,
          }}
        />
        </div>
        <ul aria-label={scheduleMessages.requests} className="flex w-full min-w-0 flex-1 flex-col gap-3 md:max-w-sm">
          {serverRequests.map((request) => {
            const summary = requestSummary(request.days);
            return (
            <li key={request.id} className="flex flex-col gap-3 rounded-card bg-surface p-3 font-sans text-ink">
              {summary ? (
                <p
                  className={`rounded-lg px-3 py-2 ${
                    request.status === "rejected"
                      ? "text-muted"
                      : assignmentClassName({ shift: summary.shift, status: request.status })
                  }`}
                >
                  {summary.text}
                </p>
              ) : null}
              <p>
                {scheduleMessages.peopleLine(
                  request.createdBy.name,
                  request.approvedBy?.name ?? null,
                  request.rejectedBy?.name ?? null,
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {canApprove ? (
                  <button
                    type="button"
                    className={actionClassName()}
                    disabled={saving || request.status !== "requested"}
                    onClick={() => void changeRequest(request.id, "approve")}
                  >
                    {scheduleMessages.confirm}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={quietActionClassName()}
                  disabled={saving || request.status === "rejected"}
                  onClick={() => void changeRequest(request.id, "reject")}
                >
                  {scheduleMessages.reject}
                </button>
                <button
                  type="button"
                  className={quietActionClassName()}
                  disabled={saving}
                  onClick={() => void changeRequest(request.id, "remove")}
                >
                  {scheduleMessages.remove}
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      </div>
      ) : null}
    </section>
  );
}
