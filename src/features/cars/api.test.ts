import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPaths } from "../../lib/api-paths";
import { carsApi } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("carsApi", () => {
  it("читает и пишет машины с сессионной cookie", async () => {
    const png = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url === apiPaths.cars) {
        return new Response(JSON.stringify({ id: "car-1", plate: "А123", hasPhoto: false }), { status: 201 });
      }
      if (init?.method === "PATCH" && url === apiPaths.car("car-1")) {
        return new Response(JSON.stringify({ id: "car-1", plate: "В456", hasPhoto: true }), { status: 200 });
      }
      if (init?.method === "DELETE" && url === apiPaths.car("car-1")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url === apiPaths.carPhoto("car-1")) {
        return new Response(png, { status: 200, headers: { "content-type": "image/png" } });
      }

      return new Response(JSON.stringify({ cars: [{ id: "car-1", plate: "А123", hasPhoto: true }] }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await carsApi.list()).toEqual([{ id: "car-1", plate: "А123", hasPhoto: true }]);
    const created = await carsApi.create({ plate: "А123", photo: null });
    expect(created.plate).toBe("А123");
    const updated = await carsApi.update("car-1", {
      plate: "В456",
      photo: { state: "replace", contentType: "image/png", data: "aaaa" },
    });
    expect(updated.hasPhoto).toBe(true);
    const photo = await carsApi.readPhoto("car-1");
    expect(photo).toBeInstanceOf(Blob);
    await carsApi.remove("car-1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, apiPaths.cars, { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, apiPaths.cars, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plate: "А123", photo: null }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, apiPaths.car("car-1"), {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plate: "В456",
        photo: { state: "replace", contentType: "image/png", data: "aaaa" },
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, apiPaths.carPhoto("car-1"), { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(5, apiPaths.car("car-1"), {
      method: "DELETE",
      credentials: "include",
    });
  });
});
