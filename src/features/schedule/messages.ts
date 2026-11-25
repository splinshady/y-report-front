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
  approveRequest: "Утвердить запрос на расписание",
  requests: "Запросы",
  previousMonth: "Предыдущий месяц",
  nextMonth: "Следующий месяц",
  monthLabel: (year: number, monthIndex: number) => `${monthNames[monthIndex]} ${year}`,
  dayLabel: (date: Date) =>
    `${date.getDate()} ${monthNamesGenitive[date.getMonth()]} ${date.getFullYear()}`,
  requestLine(date: Date, shift: ScheduleShift) {
    const shiftLabel = shift === "day" ? scheduleMessages.day : scheduleMessages.night;
    return `${scheduleMessages.dayLabel(date)}, ${shiftLabel}`;
  },
} as const;
