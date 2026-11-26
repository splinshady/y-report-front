import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPaths } from "../../lib/api-paths";
import { scheduleApi } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scheduleApi", () => {
  it("читает и пишет заявки с сессионной cookie", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url === apiPaths.scheduleRequests) {
        return new Response(
          JSON.stringify({
            id: "request-1",
            taxiParkId: "default",
            carId: "car-1",
            status: "requested",
            createdBy: { id: "user-1", name: "Анна" },
            approvedBy: null,
            rejectedBy: null,
            days: [{ date: "2026-11-25", shift: "day" }],
          }),
          { status: 201 },
        );
      }

      if (url === apiPaths.scheduleRequestApprove("request-1")) {
        return new Response(
          JSON.stringify({
            id: "request-1",
            taxiParkId: "default",
            carId: "car-1",
            status: "approved",
            createdBy: { id: "user-1", name: "Анна" },
            approvedBy: { id: "user-2", name: "Борис" },
            rejectedBy: null,
            days: [{ date: "2026-11-25", shift: "day" }],
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ requests: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await scheduleApi.load("car-1")).toEqual([]);
    const created = await scheduleApi.create("car-1", [{ date: "2026-11-25", shift: "day" }]);
    expect(created.createdBy.name).toBe("Анна");
    expect(created.carId).toBe("car-1");
    const approved = await scheduleApi.approve("request-1");
    expect(approved.approvedBy?.name).toBe("Борис");

    expect(fetchMock).toHaveBeenNthCalledWith(1, apiPaths.scheduleRequestsForCar("car-1"), {
      credentials: "include",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, apiPaths.scheduleRequests, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ carId: "car-1", days: [{ date: "2026-11-25", shift: "day" }] }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, apiPaths.scheduleRequestApprove("request-1"), {
      method: "POST",
      credentials: "include",
    });
  });
});
