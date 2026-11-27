export const shiftReportNumberKeys = [
  "mileageStart",
  "mileageEnd",
  "cashless",
  "cash",
  "discount",
  "tip",
  "wash",
  "lineTime",
  "cashStart",
  "cashEnd",
  "shiftTotal",
] as const;

export const shiftReportPhotoKeys = ["photo1", "photo2", "photo3", "photo4"] as const;

export type ShiftReportNumberKey = (typeof shiftReportNumberKeys)[number];

export type ShiftReportPhotoKey = (typeof shiftReportPhotoKeys)[number];

export type ShiftReportField = "date" | ShiftReportNumberKey | ShiftReportPhotoKey;

export type ShiftReportFieldCode = "required" | "number" | "date" | "image";

export type ShiftReportFieldErrors = Partial<Record<ShiftReportField, ShiftReportFieldCode>>;

export type ShiftReportFormError = "shift" | "duplicate" | "save";

export function shiftReportDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isShiftReportDateAllowed(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function shiftReportFieldErrors(input: {
  date: string;
  numbers: Record<ShiftReportNumberKey, string>;
  photos: readonly (File | null)[];
}): ShiftReportFieldErrors {
  const fields: ShiftReportFieldErrors = {};
  const date = input.date.trim();
  if (date.length === 0) {
    fields.date = "required";
  } else if (!isShiftReportDateAllowed(date)) {
    fields.date = "date";
  }

  for (const key of shiftReportNumberKeys) {
    const value = input.numbers[key].trim();
    if (value.length === 0) {
      fields[key] = "required";
      continue;
    }
    if (!Number.isFinite(Number(value))) {
      fields[key] = "number";
    }
  }

  for (let index = 0; index < shiftReportPhotoKeys.length; index += 1) {
    const key = shiftReportPhotoKeys[index];
    if (!key) {
      continue;
    }
    const file = input.photos[index];
    if (!file) {
      fields[key] = "required";
      continue;
    }
    if (file.type.length > 0 && !file.type.startsWith("image/")) {
      fields[key] = "image";
    }
  }

  return fields;
}

export function firstShiftReportField(fields: ShiftReportFieldErrors): ShiftReportField | null {
  const order: ShiftReportField[] = ["date", ...shiftReportNumberKeys, ...shiftReportPhotoKeys];
  return order.find((key) => fields[key] != null) ?? null;
}
