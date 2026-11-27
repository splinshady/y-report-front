import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type CarsApi } from "../cars/api";
import { ShiftReportRequestError, type ShiftReport, type ShiftReportApi, type ShiftReportInput } from "./api";
import { type ShiftReportFieldErrors, type ShiftReportFormError } from "./field-errors";
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

function createMemoryApi(options?: {
  failure?: { fields?: ShiftReportFieldErrors; form?: Exclude<ShiftReportFormError, "save"> | null };
}) {
  const calls = { create: 0 };
  let lastInput: ShiftReportInput | null = null;
  let stored: ShiftReport | null = null;

  const api: ShiftReportApi = {
    async list() {
      return stored ? [stored] : [];
    },
    async readById(reportId) {
      return stored?.id === reportId ? stored : null;
    },
    async read(requestCarId, date, shift) {
      if (!stored || stored.carId !== requestCarId || stored.date !== date || stored.shift !== shift) {
        return null;
      }
      return stored;
    },
    async create(input) {
      calls.create += 1;
      lastInput = input;
      if (options?.failure) {
        throw new ShiftReportRequestError(options.failure.fields ?? {}, options.failure.form ?? null);
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

function renderPage(api: ShiftReportApi, onCreated?: (reportId: string) => void) {
  render(<ShiftReportPage carId={carId} today={today} api={api} carsApi={carsApi} onCreated={onCreated} />);
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
    const mileageStart = screen.getByRole("textbox", { name: shiftReportMessages.mileageStart });
    expect(memory.calls.create).toBe(0);
    expect(mileageStart.getAttribute("aria-invalid")).toBe("true");
    expect(mileageStart.className).toContain("border-danger");
    expect(screen.getByText(shiftReportMessages.fieldError.required)).toBeTruthy();

    fireEvent.change(mileageStart, { target: { value: "0" } });
    expect(mileageStart.getAttribute("aria-invalid")).toBe("false");
    expect(mileageStart.className).not.toContain("border-danger");

    fireEvent.change(fileInputs()[3] as HTMLInputElement, { target: { files: [] } });
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));
    expect(memory.calls.create).toBe(0);
    expect(fileInputs()[3]?.getAttribute("aria-invalid")).toBe("true");
    expect(fileInputs()[3]?.className).toContain("border-danger");
    expect(screen.getByText(shiftReportMessages.photoMissing)).toBeTruthy();
  });

  it("нечисло подсвечивается и правится без повторной отправки", async () => {
    const memory = createMemoryApi();
    renderPage(memory.api);
    await screen.findByText(plate);

    fillNumbers({ ...zeroValues(), cash: "нет" });
    chooseFiles(4);
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));

    const cash = screen.getByRole("textbox", { name: shiftReportMessages.cash });
    expect(memory.calls.create).toBe(0);
    expect(cash.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(shiftReportMessages.fieldError.number)).toBeTruthy();

    fireEvent.change(cash, { target: { value: "20" } });
    expect(cash.getAttribute("aria-invalid")).toBe("false");
    expect(screen.queryByText(shiftReportMessages.fieldError.number)).toBeNull();
  });

  it("ошибка поля с сервера подсвечивает это поле", async () => {
    const memory = createMemoryApi({ failure: { fields: { cash: "number" } } });
    renderPage(memory.api);
    await screen.findByText(plate);

    fillNumbers(zeroValues());
    chooseFiles(4);
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));

    const cash = await screen.findByRole("textbox", { name: shiftReportMessages.cash });
    await waitFor(() => {
      expect(memory.calls.create).toBe(1);
    });
    expect(cash.getAttribute("aria-invalid")).toBe("true");
    expect(cash.className).toContain("border-danger");
    expect(screen.getByText(shiftReportMessages.fieldError.number)).toBeTruthy();
  });

  it("ноль и четыре фото сохраняют введённый итог и не показывают отчёт", async () => {
    const memory = createMemoryApi();
    await memory.api.create({
      carId,
      date: "2026-11-25",
      shift: "day",
      mileageStart: 9,
      mileageEnd: 9,
      cashless: 9,
      cash: 9,
      discount: 9,
      tip: 9,
      wash: 9,
      lineTime: 9,
      cashStart: 9,
      cashEnd: 9,
      shiftTotal: 9,
      photos: [
        { contentType: "image/png", data: "aa" },
        { contentType: "image/png", data: "bb" },
        { contentType: "image/png", data: "cc" },
        { contentType: "image/png", data: "dd" },
      ],
    });
    memory.calls.create = 0;
    const opened: string[] = [];
    renderPage(memory.api, (reportId) => {
      opened.push(reportId);
    });
    await screen.findByText(plate);
    expect(document.querySelector("dl")).toBeNull();
    expect(document.querySelector("img")).toBeNull();

    fillNumbers({ ...zeroValues(), mileageEnd: "-1.5", shiftTotal: "7" });
    chooseFiles(4);
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.night }));
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));

    await waitFor(() => {
      expect(memory.calls.create).toBe(1);
      expect(opened).toEqual(["report-1"]);
    });
    expect(memory.lastInput()?.shift).toBe("night");
    expect(memory.lastInput()?.shiftTotal).toBe(7);
    expect(memory.lastInput()?.mileageStart).toBe(0);
    expect(memory.lastInput()?.mileageEnd).toBe(-1.5);
    expect(memory.lastInput()?.photos).toHaveLength(4);
    expect(document.querySelector("dl")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });

  it("будущий день уходит на сервер, ошибка смены показывается на форме", async () => {
    const memory = createMemoryApi({ failure: { form: "shift" } });
    renderPage(memory.api);
    await screen.findByText(plate);

    fillNumbers(zeroValues());
    chooseFiles(4);
    const date = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(date, { target: { value: "2026-11-26" } });
    fireEvent.click(screen.getByRole("button", { name: shiftReportMessages.create }));
    await waitFor(() => {
      expect(memory.calls.create).toBe(1);
    });
    expect(memory.lastInput()?.date).toBe("2026-11-26");
    expect(screen.queryByText(shiftReportMessages.fieldError.date)).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(shiftReportMessages.formError.shift);
    expect(date.className).toContain("border-danger");
  });
});
