import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type CarsApi } from "../cars/api";
import { type ShiftReport, type ShiftReportApi, type ShiftReportInput } from "./api";
import { shiftReportMessages } from "./messages";
import { ShiftReportPage } from "./shift-report-page";

const today = new Date(2026, 10, 25);
const carId = "car-1";
const plate = "А777АА77";

const fieldLabels = {
  mileageStart: shiftReportMessages.mileageStart,
  mileageEnd: shiftReportMessages.mileageEnd,
  cashless: shiftReportMessages.cashless,
  cash: shiftReportMessages.cash,
  discount: shiftReportMessages.discount,
  tip: shiftReportMessages.tip,
  wash: shiftReportMessages.wash,
  lineTime: shiftReportMessages.lineTime,
  cashStart: shiftReportMessages.cashStart,
  cashEnd: shiftReportMessages.cashEnd,
  shiftTotal: shiftReportMessages.shiftTotal,
} as const;

type FieldKey = keyof typeof fieldLabels;

const carsApi: Pick<CarsApi, "list"> = {
  list: async () => [{ id: carId, plate, hasPhoto: false }],
};

function zeroValues(): Record<FieldKey, string> {
  return {
    mileageStart: "0",
    mileageEnd: "0",
    cashless: "0",
    cash: "0",
    discount: "0",
    tip: "0",
    wash: "0",
    lineTime: "0",
    cashStart: "0",
    cashEnd: "0",
    shiftTotal: "0",
  };
}

function createMemoryApi(options?: { failCreate?: boolean }) {
  const calls = { create: 0 };
  let lastInput: ShiftReportInput | null = null;
  let stored: ShiftReport | null = null;

  const api: ShiftReportApi = {
    async read(requestCarId, date, shift) {
      if (!stored || stored.carId !== requestCarId || stored.date !== date || stored.shift !== shift) {
        return null;
      }
      return stored;
    },
    async create(input) {
      calls.create += 1;
      lastInput = input;
      if (options?.failCreate) {
        throw new Error("failed");
      }
      stored = {
        id: "report-1",
        carId: input.carId,
        date: input.date,
        shift: input.shift,
        mileageStart: input.mileageStart,
        mileageEnd: input.mileageEnd,
        cashless: input.cashless,
        cash: input.cash,
        discount: input.discount,
        tip: input.tip,
        wash: input.wash,
        lineTime: input.lineTime,
        cashStart: input.cashStart,
        cashEnd: input.cashEnd,
        shiftTotal: input.shiftTotal,
      };
      return stored;
    },
    async readPhoto() {
      return new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });
    },
  };

  return {
    api,
    calls,
    lastInput: () => lastInput,
  };
}

function renderPage(api: ShiftReportApi) {
  render(<ShiftReportPage carId={carId} today={today} api={api} carsApi={carsApi} />);
}

function fileInputs() {
  return [...document.querySelectorAll('input[type="file"]')] as HTMLInputElement[];
}

function chooseFile(input: HTMLInputElement, name: string) {
  const file = new File(["img"], name, { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
}

function chooseFiles(count: number) {
  const inputs = fileInputs();
  for (let index = 0; index < count; index += 1) {
    const input = inputs[index];
    if (!input) {
      continue;
    }
    chooseFile(input, `photo-${index}.png`);
  }
}

function fillNumbers(values: Partial<Record<FieldKey, string>>) {
  for (const key of Object.keys(values) as FieldKey[]) {
    const value = values[key];
    if (value == null) {
      continue;
    }
    fireEvent.change(screen.getByRole("textbox", { name: fieldLabels[key] }), { target: { value } });
  }
}

afterEach(() => {
  cleanup();
});

describe("shift report page", () => {
  it("показывает дату, смену и номер машины", async () => {
    const memory = createMemoryApi();
    renderPage(memory.api);

    expect(await screen.findByText(plate)).toBeTruthy();
    expect(screen.getByText(shiftReportMessages.dateLabel(today))).toBeTruthy();
    expect(screen.getByRole("button", { name: shiftReportMessages.day })).toBeTruthy();
    expect(screen.getByRole("button", { name: shiftReportMessages.night })).toBeTruthy();
    expect(screen.getByRole("button", { name: shiftReportMessages.create }).className).toContain("min-h-touch");
    expect(fileInputs()).toHaveLength(4);
    for (const input of fileInputs()) {
      expect(input.className).toContain("min-h-touch");
    }
    expect(screen.getByRole("textbox", { name: shiftReportMessages.mileageStart }).className).toContain(
      "min-h-touch",
    );
  });

  it("пустое поле и неполное фото не создают отчёт", async () => {
    const memory = createMemoryApi();
    renderPage(memory.api);
    await screen.findByText(plate);

    fillNumbers({ ...zeroValues(), mileageStart: "" });
    chooseFiles(4);
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));
    expect(memory.calls.create).toBe(0);
    expect(document.querySelector("dl")).toBeNull();

    fillNumbers({ mileageStart: "0" });
    fireEvent.change(fileInputs()[3] as HTMLInputElement, { target: { files: [] } });
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));
    expect(memory.calls.create).toBe(0);
    expect(document.querySelector("dl")).toBeNull();
  });

  it("ноль и четыре фото сохраняют введённый итог", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    let blobIndex = 0;
    URL.createObjectURL = () => {
      blobIndex += 1;
      return `blob:report-photo-${blobIndex}`;
    };
    URL.revokeObjectURL = () => undefined;

    const memory = createMemoryApi();
    renderPage(memory.api);
    await screen.findByText(plate);

    fillNumbers({ ...zeroValues(), mileageEnd: "-1.5", shiftTotal: "7" });
    chooseFiles(4);
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.night }));
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));

    const saved = (await screen.findByText("7")).closest("dl");
    expect(saved).toBeTruthy();
    expect(within(saved as HTMLElement).getByText("-1.5")).toBeTruthy();
    expect(within(saved as HTMLElement).getAllByText("0").length).toBeGreaterThan(0);
    expect(memory.calls.create).toBe(1);
    expect(memory.lastInput()?.shift).toBe("night");
    expect(memory.lastInput()?.shiftTotal).toBe(7);
    expect(memory.lastInput()?.mileageStart).toBe(0);
    expect(memory.lastInput()?.mileageEnd).toBe(-1.5);
    expect(memory.lastInput()?.photos).toHaveLength(4);
    await waitFor(() => {
      expect(document.querySelectorAll("img")).toHaveLength(4);
    });
    for (const image of document.querySelectorAll("img")) {
      expect(image.getAttribute("alt")).toBe("");
    }

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("завтрашний день и ошибка сохранения не показывают отчёт", async () => {
    const memory = createMemoryApi({ failCreate: true });
    renderPage(memory.api);
    await screen.findByText(plate);

    fillNumbers(zeroValues());
    chooseFiles(4);
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-11-26" },
    });
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));
    expect(memory.calls.create).toBe(0);
    expect(document.querySelector("dl")).toBeNull();

    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-11-25" },
    });
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));
    await waitFor(() => {
      expect(memory.calls.create).toBe(1);
    });
    expect(document.querySelector("dl")).toBeNull();
  });
});
