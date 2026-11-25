import { describe, expect, it } from "vitest";
import {
  approveRequest,
  assignmentsFromRequests,
  createRequest,
  dateKey,
  fillRange,
  isSelectable,
  openMonths,
} from "./selection";

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
    const outsideEntry = { shift: "night" as const, status: "draft" as const };
    const current = { [outside]: outsideEntry };
    const next = fillRange(new Date(2026, 10, 20), new Date(2027, 0, 2), "day", today, current);

    expect(next).not.toBe(current);
    expect(current).toEqual({ [outside]: outsideEntry });
    expect(next[outside]).toEqual(outsideEntry);
    expect(next[dateKey(new Date(2026, 10, 20))]).toBeUndefined();
    expect(next[dateKey(new Date(2026, 10, 25))]).toEqual({ shift: "day", status: "draft" });
    expect(next[dateKey(new Date(2026, 11, 31))]).toEqual({ shift: "day", status: "draft" });
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
    expect(Object.values(next)).toEqual([
      { shift: "night", status: "draft" },
      { shift: "night", status: "draft" },
      { shift: "night", status: "draft" },
    ]);
  });

  it("запись заменяет черновик и не трогает запрос", () => {
    const draftKey = dateKey(new Date(2026, 10, 26));
    const requestedKey = dateKey(new Date(2026, 10, 27));
    const current = {
      [draftKey]: { shift: "day" as const, status: "draft" as const },
      [requestedKey]: { shift: "night" as const, status: "requested" as const },
    };
    const next = fillRange(new Date(2026, 10, 26), new Date(2026, 10, 27), "night", today, current);

    expect(next[draftKey]).toEqual({ shift: "night", status: "draft" });
    expect(next[requestedKey]).toEqual({ shift: "night", status: "requested" });
    expect(current[draftKey]).toEqual({ shift: "day", status: "draft" });
  });

  it("создание переводит черновик в запрос и оставляет утверждённый", () => {
    const draftKey = dateKey(new Date(2026, 10, 25));
    const approvedKey = dateKey(new Date(2026, 10, 26));
    const current = {
      [draftKey]: { shift: "day" as const, status: "draft" as const },
      [approvedKey]: { shift: "night" as const, status: "approved" as const },
    };
    const next = createRequest(current);

    expect(next).not.toBe(current);
    expect(next[draftKey]).toEqual({ shift: "day", status: "requested" });
    expect(next[approvedKey]).toEqual({ shift: "night", status: "approved" });
    expect(current[draftKey].status).toBe("draft");
  });

  it("заявки из базы перекрывают черновик и оставляют остальные черновики", () => {
    const savedKey = dateKey(new Date(2026, 10, 25));
    const draftKey = dateKey(new Date(2026, 10, 26));
    const next = assignmentsFromRequests(
      [
        {
          status: "approved",
          createdByName: "Анна",
          approvedByName: "Борис",
          days: [{ date: savedKey, shift: "day" }],
        },
      ],
      {
        [savedKey]: { shift: "night", status: "draft" },
        [draftKey]: { shift: "night", status: "draft" },
      },
    );

    expect(next[savedKey]).toEqual({
      shift: "day",
      status: "approved",
      createdByName: "Анна",
      approvedByName: "Борис",
    });
    expect(next[draftKey]).toEqual({ shift: "night", status: "draft" });
  });

  it("утверждение переводит запрос и не трогает черновик", () => {
    const requestedKey = dateKey(new Date(2026, 10, 25));
    const draftKey = dateKey(new Date(2026, 10, 26));
    const current = {
      [requestedKey]: { shift: "night" as const, status: "requested" as const },
      [draftKey]: { shift: "day" as const, status: "draft" as const },
    };
    const next = approveRequest(current);

    expect(next[requestedKey]).toEqual({ shift: "night", status: "approved" });
    expect(next[draftKey]).toEqual({ shift: "day", status: "draft" });
    expect(current[requestedKey].status).toBe("requested");
  });
});
