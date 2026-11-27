import { z } from "zod";
import { apiPaths } from "../../lib/api-paths";

const shiftReportShiftSchema = z.enum(["day", "night"]);

export const shiftReportSchema = z.object({
  id: z.string(),
  carId: z.string(),
  date: z.string(),
  shift: shiftReportShiftSchema,
  mileageStart: z.number(),
  mileageEnd: z.number(),
  cashless: z.number(),
  cash: z.number(),
  discount: z.number(),
  tip: z.number(),
  wash: z.number(),
  lineTime: z.number(),
  cashStart: z.number(),
  cashEnd: z.number(),
  shiftTotal: z.number(),
});

export type ShiftReport = z.infer<typeof shiftReportSchema>;

export type ShiftReportShift = ShiftReport["shift"];

export type ShiftReportPhotoFile = {
  contentType: string;
  data: string;
};

export type ShiftReportInput = {
  carId: string;
  date: string;
  shift: ShiftReportShift;
  mileageStart: number;
  mileageEnd: number;
  cashless: number;
  cash: number;
  discount: number;
  tip: number;
  wash: number;
  lineTime: number;
  cashStart: number;
  cashEnd: number;
  shiftTotal: number;
  photos: [
    ShiftReportPhotoFile,
    ShiftReportPhotoFile,
    ShiftReportPhotoFile,
    ShiftReportPhotoFile,
  ];
};

export type ShiftReportApi = {
  read: (carId: string, date: string, shift: ShiftReportShift) => Promise<ShiftReport | null>;
  create: (input: ShiftReportInput) => Promise<ShiftReport>;
  readPhoto: (reportId: string, slot: 1 | 2 | 3 | 4) => Promise<Blob | null>;
};

export function shiftReportDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isShiftReportDateAllowed(value: string, today: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }

  return value <= shiftReportDateKey(today);
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error("Shift report request failed");
  }

  return response.json() as Promise<unknown>;
}

export const shiftReportApi: ShiftReportApi = {
  async read(carId, date, shift) {
    const response = await fetch(apiPaths.shiftReport(carId, date, shift), { credentials: "include" });
    if (response.status === 404) {
      return null;
    }

    return shiftReportSchema.parse(await readJson(response));
  },
  async create(input) {
    const response = await fetch(apiPaths.shiftReports, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return shiftReportSchema.parse(await readJson(response));
  },
  async readPhoto(reportId, slot) {
    const response = await fetch(apiPaths.shiftReportPhoto(reportId, slot), { credentials: "include" });
    if (!response.ok) {
      return null;
    }

    return response.blob();
  },
};
