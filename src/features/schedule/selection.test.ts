import { describe, expect, it } from "vitest";
import { dateKey, fillRange, isSelectable, openMonths } from "./selection";

const today = new Date(2026, 10, 25);

describe("selection", () => {
  it("открывает 25–30 ноября и декабрь, но не 24 ноября и не январь", () => {
    expect(isSelectable(new Date(2026, 10, 24), today)).toBe(false);

    for (let day = 25; day <= 30; day += 1) {
      expect(isSelectable(new Date(2026, 10, day), today)).toBe(true);
    }

    for (let day = 1; day <= 31; day += 1) {
      expect(isSelectable(new Date(2026, 11, day), today)).toBe(true);
    }

    expect(isSelectable(new Date(2027, 0, 1), today)).toBe(false);
  });

  it("сравнивает календарные даты, а не время суток", () => {
    const todayLate = new Date(2026, 10, 25, 23, 30);

    expect(isSelectable(new Date(2026, 10, 25, 0, 15), todayLate)).toBe(true);
    expect(isSelectable(new Date(2026, 10, 24, 23, 59), todayLate)).toBe(false);
    expect(isSelectable(new Date(2026, 11, 31, 23, 59), todayLate)).toBe(true);
    expect(isSelectable(new Date(2027, 0, 1, 0, 1), todayLate)).toBe(false);
  });

  it("открывает месяц сегодня и следующий", () => {
    expect(openMonths(new Date(2026, 10, 25, 21))).toEqual([
      { year: 2026, monthIndex: 10 },
      { year: 2026, monthIndex: 11 },
    ]);
    expect(openMonths(new Date(2026, 11, 31))).toEqual([
      { year: 2026, monthIndex: 11 },
      { year: 2027, monthIndex: 0 },
    ]);
    expect(isSelectable(new Date(2027, 0, 31), new Date(2026, 11, 31))).toBe(true);
    expect(isSelectable(new Date(2027, 1, 1), new Date(2026, 11, 31))).toBe(false);
  });

  it("fillRange пропускает дни вне окна и не меняет вход", () => {
    const outside = dateKey(new Date(2026, 10, 24));
    const current = { [outside]: "night" as const };
    const next = fillRange(new Date(2026, 10, 20), new Date(2027, 0, 2), "day", today, current);

    expect(next).not.toBe(current);
    expect(current).toEqual({ [outside]: "night" });
    expect(next[outside]).toBe("night");
    expect(next[dateKey(new Date(2026, 10, 20))]).toBeUndefined();
    expect(next[dateKey(new Date(2026, 10, 25))]).toBe("day");
    expect(next[dateKey(new Date(2026, 11, 31))]).toBe("day");
    expect(next[dateKey(new Date(2027, 0, 1))]).toBeUndefined();
    expect(next[dateKey(new Date(2027, 0, 2))]).toBeUndefined();
  });

  it("обратный порядок заполняет от ранней даты к поздней", () => {
    const next = fillRange(new Date(2026, 11, 2), new Date(2026, 10, 30), "night", today, {});

    expect(Object.keys(next)).toEqual([
      dateKey(new Date(2026, 10, 30)),
      dateKey(new Date(2026, 11, 1)),
      dateKey(new Date(2026, 11, 2)),
    ]);
    expect(Object.values(next)).toEqual(["night", "night", "night"]);
  });

  it("запись заменяет прежнюю смену на дне", () => {
    const key = dateKey(new Date(2026, 10, 26));
    const current = { [key]: "day" as const };
    const next = fillRange(new Date(2026, 10, 26), new Date(2026, 10, 26), "night", today, current);

    expect(next[key]).toBe("night");
    expect(current[key]).toBe("day");
  });
});
