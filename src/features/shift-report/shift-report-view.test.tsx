import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type CarsApi } from "../cars/api";
import { type ShiftReport, type ShiftReportApi } from "./api";
import { shiftReportMessages } from "./messages";
import { ShiftReportView } from "./shift-report-view";

const carId = "car-1";
const plate = "А777АА77";

const report: ShiftReport = {
  id: "report-1",
  carId,
  date: "2026-11-25",
  shift: "day",
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

const carsApi: Pick<CarsApi, "list"> = {
  list: async () => [{ id: carId, plate, hasPhoto: false }],
};

const api: ShiftReportApi = {
  async list() {
    return [report];
  },
  async readById(reportId) {
    return reportId === report.id ? report : null;
  },
  async read() {
    return report;
  },
  async create() {
    return report;
  },
  async readPhoto() {
    return new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });
  },
};

afterEach(() => {
  cleanup();
});

describe("shift report view", () => {
  it("показывает числа и фото без подписей", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    let blobIndex = 0;
    URL.createObjectURL = () => {
      blobIndex += 1;
      return `blob:report-photo-${blobIndex}`;
    };
    URL.revokeObjectURL = () => undefined;

    render(<ShiftReportView carId={carId} reportId={report.id} api={api} carsApi={carsApi} />);

    expect(await screen.findByText(plate)).toBeTruthy();
    expect(screen.getByText(shiftReportMessages.dateLabel(new Date(2026, 10, 25)))).toBeTruthy();
    expect(screen.getByText(shiftReportMessages.day)).toBeTruthy();
    const saved = (await screen.findByText("7")).closest("dl");
    expect(saved).toBeTruthy();
    await waitFor(() => {
      expect(document.querySelectorAll("img")).toHaveLength(4);
    });
    for (const image of document.querySelectorAll("img")) {
      expect(image.getAttribute("alt")).toBe("");
    }

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
});
