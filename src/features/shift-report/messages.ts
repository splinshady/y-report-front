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

export const shiftReportMessages = {
  day: "День",
  night: "Ночь",
  mileageStart: "Пробег на начало",
  mileageEnd: "Пробег на конец",
  cashless: "Б/н",
  cash: "Нал",
  discount: "Скидка",
  tip: "Чай",
  wash: "Мойка",
  lineTime: "Время на линии",
  cashStart: "Нал начало",
  cashEnd: "Нал конец",
  shiftTotal: "Итого за смену",
  create: "Создать отчёт",
  dateLabel: (date: Date) =>
    `${date.getDate()} ${monthNamesGenitive[date.getMonth()]} ${date.getFullYear()}`,
} as const;
