import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type ScheduleApi, type ScheduleRequest } from "./api";
import { scheduleMessages } from "./messages";
import { SchedulePage } from "./schedule-page";

const today = new Date(2026, 10, 25);
const creatorName = "Анна";
const approverName = "Борис";

function createMemoryApi(initial: ScheduleRequest[] = []): ScheduleApi {
  let requests = initial.map((request) => structuredClone(request));

  return {
    load: async () => requests.map((request) => structuredClone(request)),
    create: async (days) => {
      const request: ScheduleRequest = {
        id: `request-${requests.length + 1}`,
        taxiParkId: "default",
        status: "requested",
        createdBy: { id: "creator", name: creatorName },
        approvedBy: null,
        rejectedBy: null,
        days,
      };
      requests = [...requests, request];
      return structuredClone(request);
    },
    approve: async (requestId: string) => {
      const request = requests.find((item) => item.id === requestId);
      if (!request || request.status !== "requested") {
        throw new Error("none");
      }

      const updated: ScheduleRequest = {
        ...request,
        status: "approved",
        approvedBy: { id: "approver", name: approverName },
      };
      requests = requests.map((item) => (item.id === requestId ? updated : item));
      return structuredClone(updated);
    },
    reject: async (requestId: string) => {
      const request = requests.find((item) => item.id === requestId);
      if (!request || request.status === "rejected") {
        throw new Error("none");
      }

      const updated: ScheduleRequest = {
        ...request,
        status: "rejected",
        rejectedBy: { id: "approver", name: approverName },
      };
      requests = requests.map((item) => (item.id === requestId ? updated : item));
      return structuredClone(updated);
    },
    remove: async (requestId: string) => {
      if (!requests.some((item) => item.id === requestId)) {
        throw new Error("missing");
      }

      requests = requests.filter((item) => item.id !== requestId);
    },
  };
}

async function renderSchedule(api: ScheduleApi = createMemoryApi(), canApprove = true) {
  render(<SchedulePage today={today} api={api} canApprove={canApprove} />);
  await act(async () => {
    await Promise.resolve();
  });
}

async function settle() {
  await act(async () => {
    for (let step = 0; step < 8; step += 1) {
      await Promise.resolve();
    }
  });
}

function dayButton(date: Date) {
  return screen.getByRole("button", { name: scheduleMessages.dayLabel(date) });
}

function modeButton(name: string) {
  return screen.getByRole("button", { name });
}

function showMonth(year: number, monthIndex: number) {
  const label = scheduleMessages.monthLabel(year, monthIndex);
  if (screen.queryByText(label)) {
    return;
  }

  const next = modeButton(scheduleMessages.nextMonth);
  if (next.getAttribute("aria-disabled") !== "true") {
    fireEvent.click(next);
  }

  if (!screen.queryByText(label)) {
    fireEvent.click(modeButton(scheduleMessages.previousMonth));
  }
}

describe("SchedulePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("прошедший день недоступен, сегодня ставит день и повтор снимает", async () => {
    await renderSchedule();

    expect(screen.getByRole("heading", { name: scheduleMessages.title })).toBeTruthy();
    expect(document.querySelector("[data-slot=calendar]")).toBeTruthy();

    const past = dayButton(new Date(2026, 10, 24));
    expect((past as HTMLButtonElement).disabled).toBe(true);
    expect(past.textContent).toBe("24");
    fireEvent.click(past);
    expect(past.className).not.toContain("bg-tile-blue");
    expect(past.className).not.toContain("bg-tile-lilac");

    const todayButton = dayButton(today);
    expect((todayButton as HTMLButtonElement).disabled).toBe(false);
    expect(todayButton.className).toContain("min-h-touch");
    expect(todayButton.className).not.toContain("bg-link");
    expect(todayButton.className).not.toContain("bg-tile-blue");

    fireEvent.click(todayButton);
    expect(dayButton(today).className).toContain("bg-tile-blue");
    expect(dayButton(today).className).not.toContain("bg-tile-lilac");

    fireEvent.click(dayButton(today));
    expect(dayButton(today).className).not.toContain("bg-tile-blue");
    expect(dayButton(today).className).not.toContain("bg-tile-lilac");
  });

  it("смена на ночь заменяет дневную", async () => {
    await renderSchedule();

    const todayButton = dayButton(today);
    fireEvent.click(todayButton);

    const dayMode = modeButton(scheduleMessages.day);
    const nightMode = modeButton(scheduleMessages.night);
    expect(dayMode.getAttribute("aria-pressed")).toBe("true");
    expect(nightMode.getAttribute("aria-pressed")).toBe("false");
    expect(dayMode.className).toContain("min-h-touch");
    expect(nightMode.className).toContain("min-h-touch");

    fireEvent.click(nightMode);
    expect(dayMode.getAttribute("aria-pressed")).toBe("false");
    expect(nightMode.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(dayButton(today));
    expect(dayButton(today).className).toContain("bg-tile-lilac");
    expect(dayButton(today).className).not.toContain("bg-tile-blue");
  });

  it("переключает только текущий и следующий месяц", async () => {
    await renderSchedule();

    expect(screen.queryByRole("button", { name: scheduleMessages.monthLabel(2026, 10) })).toBeNull();
    expect(screen.queryByRole("button", { name: scheduleMessages.monthLabel(2026, 11) })).toBeNull();
    expect(screen.getByText(scheduleMessages.monthLabel(2026, 10))).toBeTruthy();

    fireEvent.click(modeButton(scheduleMessages.nextMonth));
    expect(screen.getByText(scheduleMessages.monthLabel(2026, 11))).toBeTruthy();
    expect((dayButton(new Date(2026, 11, 1)) as HTMLButtonElement).disabled).toBe(false);
    expect((dayButton(new Date(2027, 0, 1)) as HTMLButtonElement).disabled).toBe(true);
  });

  it("период не начинается с недоступного дня и не заканчивается им", async () => {
    await renderSchedule();

    const period = modeButton(scheduleMessages.period);
    expect(period.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(period);

    fireEvent.click(dayButton(new Date(2026, 10, 24)));
    fireEvent.click(dayButton(new Date(2026, 10, 20)));
    expect(period.getAttribute("aria-pressed")).toBe("true");
    expect(dayButton(new Date(2026, 10, 24)).className).not.toContain("ring-ink");
    expect(dayButton(new Date(2026, 10, 24)).className).not.toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 10, 20)).getAttribute("aria-pressed")).not.toBe("true");

    fireEvent.click(dayButton(today));
    expect(dayButton(today).className).toContain("ring-ink");
    expect(dayButton(today).getAttribute("aria-pressed")).toBe("true");
    expect(dayButton(today).className).not.toContain("bg-tile-blue");

    fireEvent.click(dayButton(new Date(2026, 10, 24)));
    expect(period.getAttribute("aria-pressed")).toBe("true");
    expect(dayButton(today).className).toContain("ring-ink");
    expect(dayButton(today).className).not.toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 10, 26)).className).not.toContain("bg-tile-blue");
  });

  it("период с 25 по 27 ноября ставит день и выключает режим", async () => {
    await renderSchedule();

    const period = modeButton(scheduleMessages.period);
    fireEvent.click(period);
    fireEvent.click(dayButton(new Date(2026, 10, 25)));
    fireEvent.click(dayButton(new Date(2026, 10, 27)));

    expect(period.getAttribute("aria-pressed")).toBe("false");

    for (const dayOfMonth of [25, 26, 27]) {
      const button = dayButton(new Date(2026, 10, dayOfMonth));
      expect(button.className).toContain("bg-tile-blue");
      expect(button.className).not.toContain("bg-tile-lilac");
      expect(button.getAttribute("aria-pressed")).not.toBe("true");
    }

    expect(dayButton(new Date(2026, 10, 28)).className).not.toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 10, 24)).className).not.toContain("bg-tile-blue");
  });

  it("период заполняет от ранней даты, если вторая раньше", async () => {
    await renderSchedule();

    fireEvent.click(modeButton(scheduleMessages.period));
    fireEvent.click(dayButton(new Date(2026, 10, 27)));
    fireEvent.click(dayButton(new Date(2026, 10, 25)));

    expect(modeButton(scheduleMessages.period).getAttribute("aria-pressed")).toBe("false");

    for (const dayOfMonth of [25, 26, 27]) {
      expect(dayButton(new Date(2026, 10, dayOfMonth)).className).toContain("bg-tile-blue");
    }
  });

  it("выключение периода до второго нажатия сбрасывает начало", async () => {
    await renderSchedule();

    const period = modeButton(scheduleMessages.period);
    fireEvent.click(period);
    fireEvent.click(dayButton(today));
    expect(dayButton(today).className).toContain("ring-ink");

    fireEvent.click(period);
    expect(period.getAttribute("aria-pressed")).toBe("false");
    expect(dayButton(today).className).not.toContain("ring-ink");
    expect(dayButton(today).className).not.toContain("bg-tile-blue");

    fireEvent.click(dayButton(today));
    expect(dayButton(today).className).toContain("bg-tile-blue");
    expect(period.getAttribute("aria-pressed")).toBe("false");
  });

  it("период с 30 ноября по 2 декабря заполняет эти дни и пропускает 24 ноября", async () => {
    await renderSchedule();

    fireEvent.click(modeButton(scheduleMessages.period));
    fireEvent.click(dayButton(new Date(2026, 10, 30)));
    showMonth(2026, 11);
    fireEvent.click(dayButton(new Date(2026, 11, 2)));

    expect(modeButton(scheduleMessages.period).getAttribute("aria-pressed")).toBe("false");
    expect(dayButton(new Date(2026, 11, 1)).className).toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 11, 2)).className).toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 11, 3)).className).not.toContain("bg-tile-blue");

    showMonth(2026, 10);
    expect(dayButton(new Date(2026, 10, 30)).className).toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 10, 29)).className).not.toContain("bg-tile-blue");
    expect(dayButton(new Date(2026, 10, 24)).className).not.toContain("bg-tile-blue");
    expect((dayButton(new Date(2026, 10, 24)) as HTMLButtonElement).disabled).toBe(true);
  });

  it("создание запроса красит дни и пишет их в список, утверждение меняет цвет", async () => {
    await renderSchedule();

    const create = modeButton(scheduleMessages.createRequest);
    expect((create as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: scheduleMessages.confirm })).toBeNull();
    expect(create.className).toContain("min-h-touch");
    expect(create.className).toContain("bg-accent");
    expect(create.className).not.toContain("bg-link");

    fireEvent.click(dayButton(today));
    fireEvent.click(modeButton(scheduleMessages.night));
    fireEvent.click(dayButton(new Date(2026, 10, 26)));

    expect((create as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(create);
    await settle();

    const dayCell = dayButton(today);
    const nightCell = dayButton(new Date(2026, 10, 26));
    expect(dayCell.className).toContain("bg-tile-sage");
    expect(dayCell.className).not.toContain("bg-tile-blue");
    expect(nightCell.className).toContain("bg-tile-rose");
    expect(nightCell.className).not.toContain("bg-tile-lilac");

    const dayLine = screen.getByText(scheduleMessages.requestLine(today, "day"));
    const nightLine = screen.getByText(scheduleMessages.requestLine(new Date(2026, 10, 26), "night"));
    expect(dayLine.className).toContain("bg-tile-sage");
    expect(nightLine.className).toContain("bg-tile-rose");
    expect(dayLine.closest("li")).not.toBe(nightLine.closest("li"));
    expect(screen.getAllByText(scheduleMessages.peopleLine(creatorName, null))).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: scheduleMessages.confirm })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: scheduleMessages.reject })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: scheduleMessages.remove })).toHaveLength(2);
    const requests = screen.getByRole("list", { name: scheduleMessages.requests });
    expect(requests.parentElement?.className).toContain("md:flex-row");
    expect(requests.parentElement?.querySelector("[data-slot=calendar]")).toBeTruthy();
    expect(requests.parentElement?.contains(create)).toBe(true);

    fireEvent.click(dayCell);
    fireEvent.click(nightCell);
    expect(dayCell.className).toContain("bg-tile-sage");
    expect(nightCell.className).toContain("bg-tile-rose");
    expect((create as HTMLButtonElement).disabled).toBe(true);

    const dayRequest = screen.getByText(scheduleMessages.requestLine(today, "day")).closest("li");
    fireEvent.click(within(dayRequest as HTMLElement).getByRole("button", { name: scheduleMessages.confirm }));
    await settle();
    expect(dayButton(today).className).toContain("bg-approved-day");
    expect(dayButton(new Date(2026, 10, 26)).className).toContain("bg-tile-rose");
    expect(screen.getByText(scheduleMessages.requestLine(today, "day")).className).toContain("bg-approved-day");
    expect(screen.getByText(scheduleMessages.peopleLine(creatorName, approverName))).toBeTruthy();
    const approvedRequest = screen.getByText(scheduleMessages.requestLine(today, "day")).closest("li");
    expect(
      (within(approvedRequest as HTMLElement).getByRole("button", { name: scheduleMessages.confirm }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getAllByRole("button", { name: scheduleMessages.confirm })).toHaveLength(2);

    const nightRequest = screen.getByText(scheduleMessages.requestLine(new Date(2026, 10, 26), "night")).closest("li");
    fireEvent.click(within(nightRequest as HTMLElement).getByRole("button", { name: scheduleMessages.confirm }));
    await settle();
    expect(dayButton(new Date(2026, 10, 26)).className).toContain("bg-approved-night");
    expect(screen.getByText(scheduleMessages.requestLine(new Date(2026, 10, 26), "night")).className).toContain(
      "bg-approved-night",
    );
    expect(screen.getAllByText(scheduleMessages.peopleLine(creatorName, approverName))).toHaveLength(2);
    expect(
      screen
        .getAllByRole("button", { name: scheduleMessages.confirm })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);

    fireEvent.click(dayButton(new Date(2026, 10, 27)));
    expect(dayButton(new Date(2026, 10, 27)).className).toContain("bg-tile-lilac");
    expect(screen.queryByText(scheduleMessages.requestLine(new Date(2026, 10, 27), "night"))).toBeNull();

    fireEvent.click(modeButton(scheduleMessages.day));
    fireEvent.click(dayButton(today));
    fireEvent.click(dayButton(new Date(2026, 10, 26)));
    expect(dayButton(today).className).toContain("bg-approved-day");
    expect(dayButton(new Date(2026, 10, 26)).className).toContain("bg-approved-night");
  });

  it("стрелки не открывают месяц раньше текущего и позже следующего", async () => {
    await renderSchedule();

    const previous = modeButton(scheduleMessages.previousMonth);
    expect(previous.className).toContain("min-h-touch");
    expect(screen.queryByRole("columnheader")).toBeNull();

    fireEvent.click(previous);
    expect(screen.getByText(scheduleMessages.monthLabel(2026, 10))).toBeTruthy();
    expect((dayButton(new Date(2026, 9, 31)) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(modeButton(scheduleMessages.nextMonth));
    expect(screen.getByText(scheduleMessages.monthLabel(2026, 11))).toBeTruthy();
    fireEvent.click(modeButton(scheduleMessages.nextMonth));
    expect(screen.getByText(scheduleMessages.monthLabel(2026, 11))).toBeTruthy();
    expect((dayButton(new Date(2027, 0, 1)) as HTMLButtonElement).disabled).toBe(true);
  });

  it("день запроса не начинает период, а список хранит дни другого месяца", async () => {
    await renderSchedule();

    fireEvent.click(modeButton(scheduleMessages.period));
    fireEvent.click(dayButton(new Date(2026, 10, 30)));
    showMonth(2026, 11);
    fireEvent.click(dayButton(new Date(2026, 11, 2)));
    fireEvent.click(modeButton(scheduleMessages.createRequest));
    await settle();

    const request = screen.getByRole("listitem");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    const periodLabel = scheduleMessages.periodLine(new Date(2026, 10, 30), new Date(2026, 11, 2), "day");
    expect(periodLabel).toBe("30 ноября - 2 декабря, День");
    expect(request.textContent).toContain(periodLabel);
    expect(request.textContent).not.toContain(scheduleMessages.requestLine(new Date(2026, 11, 1), "day"));
    expect(request.textContent).toContain(scheduleMessages.peopleLine(creatorName, null));
    expect(within(request).getAllByRole("button", { name: scheduleMessages.confirm })).toHaveLength(1);
    expect(within(request).getAllByRole("button", { name: scheduleMessages.reject })).toHaveLength(1);
    expect(within(request).getAllByRole("button", { name: scheduleMessages.remove })).toHaveLength(1);
    expect(screen.getByText(periodLabel).className).toContain("bg-tile-sage");
    const requestText = request.textContent;

    showMonth(2026, 10);
    const period = modeButton(scheduleMessages.period);
    const requested = dayButton(new Date(2026, 10, 30));
    fireEvent.click(period);
    fireEvent.click(requested);
    expect(period.getAttribute("aria-pressed")).toBe("true");
    expect(requested.className).not.toContain("ring-ink");
    expect(requested.getAttribute("aria-pressed")).not.toBe("true");
    expect(requested.className).toContain("bg-tile-sage");

    fireEvent.click(dayButton(new Date(2026, 10, 28)));
    fireEvent.click(requested);
    expect(period.getAttribute("aria-pressed")).toBe("true");
    expect(dayButton(new Date(2026, 10, 28)).className).toContain("ring-ink");
    expect(dayButton(new Date(2026, 10, 29)).className).not.toContain("bg-tile-blue");
    expect(screen.getByRole("listitem").textContent).toBe(requestText);
  });

  it("показывает создателя и утвердившего сохранённой заявки", async () => {
    await renderSchedule(
      createMemoryApi([
        {
          id: "saved",
          taxiParkId: "default",
          status: "approved",
          createdBy: { id: "creator", name: creatorName },
          approvedBy: { id: "approver", name: approverName },
          rejectedBy: null,
          days: [{ date: "2026-11-25", shift: "day" }],
        },
      ]),
    );

    expect(dayButton(today).className).toContain("bg-approved-day");
    const saved = screen.getByRole("listitem");
    expect(saved.textContent).toContain(scheduleMessages.requestLine(today, "day"));
    expect(saved.textContent).toContain(scheduleMessages.peopleLine(creatorName, approverName));
    expect(within(saved).getByRole("button", { name: scheduleMessages.confirm })).toBeTruthy();
    expect(within(saved).getByRole("button", { name: scheduleMessages.reject })).toBeTruthy();
    expect(within(saved).getByRole("button", { name: scheduleMessages.remove })).toBeTruthy();
  });

  it("работник не видит подтверждение, отклонение и удаление остаются", async () => {
    await renderSchedule(
      createMemoryApi([
        {
          id: "saved",
          taxiParkId: "park-1",
          status: "requested",
          createdBy: { id: "creator", name: creatorName },
          approvedBy: null,
          rejectedBy: null,
          days: [{ date: "2026-11-25", shift: "day" }],
        },
      ]),
      false,
    );

    const request = screen.getByRole("listitem");
    expect(within(request).queryByRole("button", { name: scheduleMessages.confirm })).toBeNull();
    expect(within(request).getByRole("button", { name: scheduleMessages.reject })).toBeTruthy();
    expect(within(request).getByRole("button", { name: scheduleMessages.remove })).toBeTruthy();

    fireEvent.click(within(request).getByRole("button", { name: scheduleMessages.reject }));
    await settle();
    expect(screen.getByText(scheduleMessages.peopleLine(creatorName, null, approverName))).toBeTruthy();
    expect(screen.queryByRole("button", { name: scheduleMessages.confirm })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: scheduleMessages.remove }));
    await settle();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
