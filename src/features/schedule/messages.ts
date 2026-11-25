const monthNames = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

const monthNamesGenitive = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

type ScheduleShift = "day" | "night";

export const scheduleMessages = {
  title: "Расписание",
  open: "К расписанию",
  day: "День",
  night: "Ночь",
  period: "Период",
  createRequest: "Создать запрос на расписание",
  confirm: "Подтвердить",
  reject: "Отклонить",
  remove: "Удалить",
  rejectedBy: "Отклонил",
  requests: "Запросы",
  createdBy: "Создал",
  approvedBy: "Утвердил",
  previousMonth: "Предыдущий месяц",
  nextMonth: "Следующий месяц",
  monthLabel: (year: number, monthIndex: number) => `${monthNames[monthIndex]} ${year}`,
  dayLabel: (date: Date) =>
    `${date.getDate()} ${monthNamesGenitive[date.getMonth()]} ${date.getFullYear()}`,
  dayAndMonth: (date: Date) => `${date.getDate()} ${monthNamesGenitive[date.getMonth()]}`,
  requestLine(date: Date, shift: ScheduleShift) {
    const shiftLabel = shift === "day" ? scheduleMessages.day : scheduleMessages.night;
    return `${scheduleMessages.dayLabel(date)}, ${shiftLabel}`;
  },
  periodLine(start: Date, end: Date, shift: ScheduleShift) {
    const shiftLabel = shift === "day" ? scheduleMessages.day : scheduleMessages.night;
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = sameYear ? scheduleMessages.dayAndMonth(start) : scheduleMessages.dayLabel(start);
    const endLabel = sameYear ? scheduleMessages.dayAndMonth(end) : scheduleMessages.dayLabel(end);
    return `${startLabel} - ${endLabel}, ${shiftLabel}`;
  },
  peopleLine(createdByName: string, approvedByName: string | null, rejectedByName: string | null = null) {
    const parts = [`${scheduleMessages.createdBy}: ${createdByName}`];
    if (approvedByName) {
      parts.push(`${scheduleMessages.approvedBy}: ${approvedByName}`);
    }
    if (rejectedByName) {
      parts.push(`${scheduleMessages.rejectedBy}: ${rejectedByName}`);
    }

    return parts.join(". ");
  },
} as const;
