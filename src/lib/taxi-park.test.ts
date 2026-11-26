import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPaths } from "./api-paths";
import {
  createTaxiPark,
  inviteWorker,
  loadTaxiParkMembership,
  taxiParkMembershipResponseSchema,
} from "./taxi-park";

afterEach(() => {
  vi.unstubAllGlobals();
});

const membership = {
  taxiParkId: "park-1",
  name: "North",
  role: "owner" as const,
};

describe("taxi park client", () => {
  it("принимает пустое членство и роль владельца или работника", () => {
    expect(taxiParkMembershipResponseSchema.parse({ membership: null })).toEqual({ membership: null });
    expect(taxiParkMembershipResponseSchema.parse({ membership })).toEqual({ membership });
    expect(
      taxiParkMembershipResponseSchema.safeParse({
        membership: { ...membership, role: "admin" },
      }).success,
    ).toBe(false);
  });

  it("читает членство с сессионной cookie и не отправляет пустое название", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url === apiPaths.taxiPark) {
        return new Response(JSON.stringify({ membership }), { status: 201 });
      }
      if (init?.method === "POST" && url === apiPaths.taxiParkInvite) {
        return new Response(
          JSON.stringify({ membership: { ...membership, role: "worker" } }),
          { status: 201 },
        );
      }
      return new Response(JSON.stringify({ membership: null }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await loadTaxiParkMembership()).toBeNull();
    await expect(createTaxiPark("   ")).rejects.toThrow("invalid");
    expect(await createTaxiPark("  North  ")).toEqual(membership);
    expect(await inviteWorker("user-2")).toMatchObject({ role: "worker" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, apiPaths.taxiPark, { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, apiPaths.taxiPark, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "North" }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, apiPaths.taxiParkInvite, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-2" }),
    });
  });
});