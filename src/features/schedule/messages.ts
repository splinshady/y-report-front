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

export const scheduleMessages = {
  title: "Расписание",
  open: "К расписанию",
  day: "День",
  night: "Ночь",
  period: "Период",
  monthLabel: (year: number, monthIndex: number) => `${monthNames[monthIndex]} ${year}`,
  dayLabel: (date: Date) =>
    `${date.getDate()} ${monthNamesGenitive[date.getMonth()]} ${date.getFullYear()}`,
} as const;
