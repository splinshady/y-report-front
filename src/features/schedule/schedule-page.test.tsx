import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { scheduleMessages } from "./messages";
import { SchedulePage } from "./schedule-page";

const today = new Date(2026, 10, 25);

function renderSchedule() {
  render(<SchedulePage today={today} />);
}

function dayButton(date: Date) {
  return screen.getByRole("button", { name: scheduleMessages.dayLabel(date) });
}

function modeButton(name: string) {
  return screen.getByRole("button", { name });
}

function showMonth(year: number, monthIndex: number) {
  fireEvent.click(modeButton(scheduleMessages.monthLabel(year, monthIndex)));
}

describe("SchedulePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("прошедший день недоступен, сегодня ставит день и повтор снимает", () => {
    renderSchedule();

    expect(screen.getByRole("heading", { name: scheduleMessages.title })).toBeTruthy();

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
    expect(todayButton.className).toContain("bg-tile-blue");
    expect(todayButton.className).not.toContain("bg-tile-lilac");

    fireEvent.click(todayButton);
    expect(todayButton.className).not.toContain("bg-tile-blue");
    expect(todayButton.className).not.toContain("bg-tile-lilac");
  });

  it("смена на ночь заменяет дневную", () => {
    renderSchedule();

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

    fireEvent.click(todayButton);
    expect(todayButton.className).toContain("bg-tile-lilac");
    expect(todayButton.className).not.toContain("bg-tile-blue");
  });

  it("переключает только текущий и следующий месяц", () => {
    renderSchedule();

    const november = modeButton(scheduleMessages.monthLabel(2026, 10));
    const december = modeButton(scheduleMessages.monthLabel(2026, 11));
    expect(november.getAttribute("aria-pressed")).toBe("true");
    expect(december.getAttribute("aria-pressed")).toBe("false");
    expect(november.className).toContain("min-h-touch");
    expect(december.className).toContain("min-h-touch");
    expect(screen.queryByRole("button", { name: scheduleMessages.monthLabel(2027, 0) })).toBeNull();

    fireEvent.click(december);
    expect(december.getAttribute("aria-pressed")).toBe("true");
    expect(november.getAttribute("aria-pressed")).toBe("false");
    expect((dayButton(new Date(2026, 11, 1)) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: scheduleMessages.dayLabel(new Date(2027, 0, 1)) })).toBeNull();
  });

  it("период не начинается с недоступного дня и не заканчивается им", () => {
    renderSchedule();

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

  it("период с 25 по 27 ноября ставит день и выключает режим", () => {
    renderSchedule();

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

  it("период заполняет от ранней даты, если вторая раньше", () => {
    renderSchedule();

    fireEvent.click(modeButton(scheduleMessages.period));
    fireEvent.click(dayButton(new Date(2026, 10, 27)));
    fireEvent.click(dayButton(new Date(2026, 10, 25)));

    expect(modeButton(scheduleMessages.period).getAttribute("aria-pressed")).toBe("false");

    for (const dayOfMonth of [25, 26, 27]) {
      expect(dayButton(new Date(2026, 10, dayOfMonth)).className).toContain("bg-tile-blue");
    }
  });

  it("выключение периода до второго нажатия сбрасывает начало", () => {
    renderSchedule();

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

  it("период с 30 ноября по 2 декабря заполняет эти дни и пропускает 24 ноября", () => {
    renderSchedule();

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

  it("создание запроса красит дни и пишет их в список, утверждение меняет цвет", () => {
    renderSchedule();

    const create = modeButton(scheduleMessages.createRequest);
    const approve = modeButton(scheduleMessages.approveRequest);
    expect((create as HTMLButtonElement).disabled).toBe(true);
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    expect(create.className).toContain("min-h-touch");
    expect(approve.className).toContain("min-h-touch");

    fireEvent.click(dayButton(today));
    fireEvent.click(modeButton(scheduleMessages.night));
    fireEvent.click(dayButton(new Date(2026, 10, 26)));

    expect((create as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(create);

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
    expect(screen.getByRole("list", { name: scheduleMessages.requests }).className).toContain("md:w-80");
    expect(screen.getByRole("list", { name: scheduleMessages.requests }).parentElement?.className).toContain(
      "md:flex-row",
    );

    fireEvent.click(dayCell);
    fireEvent.click(nightCell);
    expect(dayCell.className).toContain("bg-tile-sage");
    expect(nightCell.className).toContain("bg-tile-rose");
    expect((create as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(approve);
    expect(dayCell.className).toContain("bg-approved-day");
    expect(nightCell.className).toContain("bg-approved-night");
    expect(dayLine.className).toContain("bg-approved-day");
    expect(nightLine.className).toContain("bg-approved-night");
    expect((approve as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(dayButton(new Date(2026, 10, 27)));
    expect(dayButton(new Date(2026, 10, 27)).className).toContain("bg-tile-lilac");
    expect(screen.queryByText(scheduleMessages.requestLine(new Date(2026, 10, 27), "night"))).toBeNull();

    fireEvent.click(modeButton(scheduleMessages.day));
    fireEvent.click(dayCell);
    fireEvent.click(nightCell);
    expect(dayCell.className).toContain("bg-approved-day");
    expect(nightCell.className).toContain("bg-approved-night");
  });

  it("стрелки не открывают месяц раньше текущего и позже следующего", () => {
    renderSchedule();

    const previous = modeButton(scheduleMessages.previousMonth);
    expect(previous.className).toContain("min-h-touch");
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByRole("columnheader")).toBeNull();

    fireEvent.click(previous);
    expect(screen.queryByRole("button", { name: scheduleMessages.dayLabel(new Date(2026, 9, 31)) })).toBeNull();
    expect(modeButton(scheduleMessages.monthLabel(2026, 10)).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(modeButton(scheduleMessages.nextMonth));
    expect(modeButton(scheduleMessages.monthLabel(2026, 11)).getAttribute("aria-pressed")).toBe("true");
    expect(modeButton(scheduleMessages.nextMonth).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(modeButton(scheduleMessages.nextMonth));
    expect(screen.queryByRole("button", { name: scheduleMessages.dayLabel(new Date(2027, 0, 1)) })).toBeNull();
  });

  it("день запроса не начинает период, а список хранит дни другого месяца", () => {
    renderSchedule();

    fireEvent.click(modeButton(scheduleMessages.period));
    fireEvent.click(dayButton(new Date(2026, 10, 30)));
    showMonth(2026, 11);
    fireEvent.click(dayButton(new Date(2026, 11, 2)));
    fireEvent.click(modeButton(scheduleMessages.createRequest));

    const lines = [
      scheduleMessages.requestLine(new Date(2026, 10, 30), "day"),
      scheduleMessages.requestLine(new Date(2026, 11, 1), "day"),
      scheduleMessages.requestLine(new Date(2026, 11, 2), "day"),
    ];
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(lines);
    expect(screen.getAllByRole("listitem")[0]?.className).toContain("bg-tile-sage");

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
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(lines);
  });
});
