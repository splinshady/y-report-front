import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPaths } from "../../lib/api-paths";
import { isShiftReportDateAllowed, shiftReportApi, shiftReportSchema, type ShiftReportInput } from "./api";

const today = new Date(2026, 10, 25);

const savedReport = {
  id: "report-1",
  carId: "car-1",
  date: "2026-11-25",
  shift: "day" as const,
  mileageStart: 0,
  mileageEnd: -1.5,
  cashless: 10,
  cash: 20,
  discount: 1,
  tip: 2,
  wash: 3,
  lineTime: 8.5,
  cashStart: 50,
  cashEnd: 70,
  shiftTotal: 7,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shiftReportApi", () => {
  it("сегодня и раньше проходят, завтра нет", () => {
    expect(isShiftReportDateAllowed("2026-11-25", today)).toBe(true);
    expect(isShiftReportDateAllowed("2026-11-24", today)).toBe(true);
    expect(isShiftReportDateAllowed("2026-11-26", today)).toBe(false);
  });

  it("читает и пишет отчёт с сессионной cookie", async () => {
    const png = new Uint8Array([1, 2, 3]);
    const photos: ShiftReportInput["photos"] = [
      { contentType: "image/png", data: "aaaa" },
      { contentType: "image/png", data: "bbbb" },
      { contentType: "image/png", data: "cccc" },
      { contentType: "image/png", data: "dddd" },
    ];
    const input = {
      carId: "car-1",
      date: "2026-11-25",
      shift: "day" as const,
      mileageStart: savedReport.mileageStart,
      mileageEnd: savedReport.mileageEnd,
      cashless: savedReport.cashless,
      cash: savedReport.cash,
      discount: savedReport.discount,
      tip: savedReport.tip,
      wash: savedReport.wash,
      lineTime: savedReport.lineTime,
      cashStart: savedReport.cashStart,
      cashEnd: savedReport.cashEnd,
      shiftTotal: savedReport.shiftTotal,
      photos,
    };
    const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
      const url = String(request);
      if (init?.method === "POST" && url === apiPaths.shiftReports) {
        return new Response(JSON.stringify(savedReport), { status: 201 });
      }
      if (url === apiPaths.shiftReportPhoto("report-1", 1)) {
        return new Response(png, { status: 200, headers: { "content-type": "image/png" } });
      }
      if (url === apiPaths.shiftReport("car-1", "2026-11-26", "night")) {
        return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
      }

      return new Response(JSON.stringify(savedReport), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(shiftReportSchema.parse(await shiftReportApi.read("car-1", "2026-11-25", "day"))).toEqual(savedReport);
    expect(await shiftReportApi.read("car-1", "2026-11-26", "night")).toBeNull();
    expect(await shiftReportApi.create(input)).toEqual(savedReport);
    const photo = await shiftReportApi.readPhoto("report-1", 1);
    expect(photo).toBeInstanceOf(Blob);

    expect(fetchMock).toHaveBeenNthCalledWith(1, apiPaths.shiftReport("car-1", "2026-11-25", "day"), {
      credentials: "include",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, apiPaths.shiftReport("car-1", "2026-11-26", "night"), {
      credentials: "include",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, apiPaths.shiftReports, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, apiPaths.shiftReportPhoto("report-1", 1), {
      credentials: "include",
    });
  });
});
