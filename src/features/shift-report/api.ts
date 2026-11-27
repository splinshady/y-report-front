import { z } from "zod";
import { apiPaths } from "../../lib/api-paths";
import { type ShiftReportFieldErrors, type ShiftReportFormError } from "./field-errors";

export { isShiftReportDateAllowed, shiftReportDateKey } from "./field-errors";

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

export const shiftReportListSchema = z.object({
  reports: z.array(shiftReportSchema),
});

const shiftReportFieldCodeSchema = z.enum(["required", "number", "date", "image"]);

const shiftReportFieldsSchema = z.object({
  date: shiftReportFieldCodeSchema.optional(),
  mileageStart: shiftReportFieldCodeSchema.optional(),
  mileageEnd: shiftReportFieldCodeSchema.optional(),
  cashless: shiftReportFieldCodeSchema.optional(),
  cash: shiftReportFieldCodeSchema.optional(),
  discount: shiftReportFieldCodeSchema.optional(),
  tip: shiftReportFieldCodeSchema.optional(),
  wash: shiftReportFieldCodeSchema.optional(),
  lineTime: shiftReportFieldCodeSchema.optional(),
  cashStart: shiftReportFieldCodeSchema.optional(),
  cashEnd: shiftReportFieldCodeSchema.optional(),
  shiftTotal: shiftReportFieldCodeSchema.optional(),
  photo1: shiftReportFieldCodeSchema.optional(),
  photo2: shiftReportFieldCodeSchema.optional(),
  photo3: shiftReportFieldCodeSchema.optional(),
  photo4: shiftReportFieldCodeSchema.optional(),
});

export const shiftReportErrorSchema = z.object({
  error: z.enum(["unauthorized", "forbidden", "invalid", "conflict", "missing"]),
  fields: shiftReportFieldsSchema.optional(),
  form: z.enum(["shift", "duplicate"]).optional(),
});

export class ShiftReportRequestError extends Error {
  readonly fields: ShiftReportFieldErrors;
  readonly form: Exclude<ShiftReportFormError, "save"> | null;

  constructor(fields: ShiftReportFieldErrors, form: Exclude<ShiftReportFormError, "save"> | null) {
    super("Shift report request failed");
    this.name = "ShiftReportRequestError";
    this.fields = fields;
    this.form = form;
  }
}

export type ShiftReportApi = {
  list: (carId: string) => Promise<ShiftReport[]>;
  readById: (reportId: string) => Promise<ShiftReport | null>;
  read: (carId: string, date: string, shift: ShiftReportShift) => Promise<ShiftReport | null>;
  create: (input: ShiftReportInput) => Promise<ShiftReport>;
  readPhoto: (reportId: string, slot: 1 | 2 | 3 | 4) => Promise<Blob | null>;
};

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error("Shift report request failed");
  }

  return response.json() as Promise<unknown>;
}

export const shiftReportApi: ShiftReportApi = {
  async list(carId) {
    const response = await fetch(apiPaths.shiftReportsForCar(carId), { credentials: "include" });
    return shiftReportListSchema.parse(await readJson(response)).reports;
  },
  async readById(reportId) {
    const response = await fetch(apiPaths.shiftReportById(reportId), { credentials: "include" });
    if (response.status === 404) {
      return null;
    }

    return shiftReportSchema.parse(await readJson(response));
  },
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
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const parsed = shiftReportErrorSchema.safeParse(body);
      const fields = parsed.success ? (parsed.data.fields ?? {}) : {};
      const form = parsed.success ? (parsed.data.form ?? null) : null;
      throw new ShiftReportRequestError(fields, form);
    }

    return shiftReportSchema.parse(await response.json());
  },
  async readPhoto(reportId, slot) {
    const response = await fetch(apiPaths.shiftReportPhoto(reportId, slot), { credentials: "include" });
    if (!response.ok) {
      return null;
    }

    return response.blob();
  },
};
