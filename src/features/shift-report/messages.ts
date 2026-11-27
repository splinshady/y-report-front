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

function dateLabel(date: Date): string {
  return `${date.getDate()} ${monthNamesGenitive[date.getMonth()]} ${date.getFullYear()}`;
}

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
  fieldError: {
    required: "Заполните поле",
    number: "Введите число",
    date: "Введите дату",
    image: "Нужно изображение",
  },
  photoMissing: "Добавьте фото",
  formError: {
    shift: "На эту смену нет утверждённой заявки",
    duplicate: "Отчёт на эту смену уже есть",
    save: "Не удалось сохранить отчёт",
  },
  dateLabel,
  summary: (date: Date, shift: "day" | "night") =>
    `${dateLabel(date)}, ${shift === "day" ? "День" : "Ночь"}`,
} as const;
