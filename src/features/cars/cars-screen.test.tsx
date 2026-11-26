import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { type Car, type CarPhotoUpdate, type CarsApi } from "./api";
import { CarsScreen } from "./cars-screen";
import { carsMessages } from "./messages";

const firstPlate = "А111АА11";
const secondPlate = "В222ВВ22";

function createMemoryCars(initial: Car[] = []): {
  api: CarsApi;
  updates: Array<{ carId: string; plate: string; photo: CarPhotoUpdate }>;
  created: Array<{ plate: string; photo: { contentType: string; data: string } | null }>;
} {
  let cars = initial.map((car) => ({ ...car }));
  const updates: Array<{ carId: string; plate: string; photo: CarPhotoUpdate }> = [];
  const created: Array<{ plate: string; photo: { contentType: string; data: string } | null }> = [];

  const api: CarsApi = {
    list: async () => cars.map((car) => ({ ...car })),
    create: async (input) => {
      created.push(input);
      const car = { id: `car-${cars.length + 1}`, plate: input.plate, hasPhoto: input.photo != null };
      cars = [...cars, car];
      return { ...car };
    },
    update: async (carId, input) => {
      updates.push({ carId, plate: input.plate, photo: input.photo });
      const car = cars.find((item) => item.id === carId);
      if (!car) {
        throw new Error("missing");
      }
      car.plate = input.plate;
      if (input.photo.state === "replace") {
        car.hasPhoto = true;
      }
      if (input.photo.state === "remove") {
        car.hasPhoto = false;
      }
      return { ...car };
    },
    remove: async (carId) => {
      cars = cars.filter((item) => item.id !== carId);
    },
    readPhoto: async (carId) => {
      const car = cars.find((item) => item.id === carId);
      if (!car?.hasPhoto) {
        return null;
      }
      return new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });
    },
  };

  return { api, updates, created };
}

function Harness({
  api,
  canManage,
}: {
  api: CarsApi;
  canManage: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return <CarsScreen api={api} canManage={canManage} selectedId={selectedId} onSelect={setSelectedId} />;
}

async function renderCars(api: CarsApi, canManage = true) {
  render(<Harness api={api} canManage={canManage} />);
  await act(async () => {
    for (let step = 0; step < 8; step += 1) {
      await Promise.resolve();
    }
  });
}

async function settle() {
  await act(async () => {
    for (let step = 0; step < 8; step += 1) {
      await Promise.resolve();
    }
  });
}

describe("CarsScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("владелец добавляет машину без фото, пустой номер не создаёт", async () => {
    const memory = createMemoryCars([{ id: "car-1", plate: firstPlate, hasPhoto: false }]);
    await renderCars(memory.api);

    const addForm = screen.getByRole("form", { name: carsMessages.addCar });
    expect(within(addForm).getByRole("textbox", { name: carsMessages.plate })).toBeTruthy();
    expect(within(addForm).getByLabelText(carsMessages.photo)).toBeTruthy();
    const add = within(addForm).getByRole("button", { name: carsMessages.addCar });
    expect(add.className).toContain("min-h-touch");

    fireEvent.change(within(addForm).getByRole("textbox", { name: carsMessages.plate }), {
      target: { value: "   " },
    });
    fireEvent.click(add);
    await settle();
    expect(memory.created).toEqual([]);
    expect(screen.getAllByRole("button", { name: firstPlate })).toHaveLength(1);

    fireEvent.change(within(addForm).getByRole("textbox", { name: carsMessages.plate }), {
      target: { value: "  В456  " },
    });
    fireEvent.click(add);
    await settle();

    expect(memory.created).toEqual([{ plate: "В456", photo: null }]);
    expect(screen.getByRole("button", { name: "В456" })).toBeTruthy();
    expect(screen.getByRole("button", { name: firstPlate })).toBeTruthy();
  });

  it("у выбранной машины сохраняется номер, фото остаётся, заменяется или снимается очисткой", async () => {
    const memory = createMemoryCars([{ id: "car-1", plate: firstPlate, hasPhoto: true }]);
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => "blob:car-photo";
    URL.revokeObjectURL = () => undefined;

    try {
    await renderCars(memory.api);
    const carButton = screen.getByRole("button", { name: firstPlate });
    expect(carButton.querySelector("img")?.getAttribute("src")).toBe("blob:car-photo");

    fireEvent.click(carButton);
    const editForm = screen.getByRole("form", { name: carsMessages.save });
    fireEvent.click(within(editForm).getByRole("button", { name: carsMessages.save }));
    await settle();
    expect(memory.updates.at(-1)?.photo).toEqual({ state: "keep" });
    expect(screen.getByRole("button", { name: firstPlate })).toBeTruthy();

    const file = new File(["photo"], "car.png", { type: "image/png" });
    const editAfterKeep = screen.getByRole("form", { name: carsMessages.save });
    const photoInput = within(editAfterKeep).getByLabelText(carsMessages.photo);
    Object.defineProperty(photoInput, "files", { configurable: true, value: [file] });
    fireEvent.change(photoInput);
    const plateInput = within(editAfterKeep).getByRole("textbox", { name: carsMessages.plate });
    fireEvent.change(plateInput, { target: { value: "  В456  " } });
    fireEvent.click(within(editAfterKeep).getByRole("button", { name: carsMessages.save }));
    await settle();

    const replaced = memory.updates.at(-1);
    expect(replaced?.plate).toBe("В456");
    expect(replaced?.photo.state).toBe("replace");
    if (replaced?.photo.state === "replace") {
      expect(replaced.photo.contentType).toBe("image/png");
      expect(replaced.photo.data.length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: "В456" })).toBeTruthy();

    const editAfterReplace = screen.getByRole("form", { name: carsMessages.save });
    fireEvent.click(within(editAfterReplace).getByRole("button", { name: carsMessages.photo }));
    fireEvent.click(within(editAfterReplace).getByRole("button", { name: carsMessages.save }));
    await settle();
    expect(memory.updates.at(-1)?.photo).toEqual({ state: "remove" });
    expect(screen.getByRole("button", { name: "В456" }).querySelector("img")).toBeNull();
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("удаление машины убирает её из списка", async () => {
    const memory = createMemoryCars([{ id: "car-1", plate: firstPlate, hasPhoto: false }]);
    await renderCars(memory.api);
    fireEvent.click(screen.getByRole("button", { name: firstPlate }));
    fireEvent.click(screen.getByRole("button", { name: carsMessages.deleteCar }));
    await settle();

    expect(screen.queryByRole("button", { name: firstPlate })).toBeNull();
    expect(screen.queryByRole("button", { name: carsMessages.save })).toBeNull();
    expect(screen.queryByRole("button", { name: carsMessages.deleteCar })).toBeNull();
    expect(screen.getByRole("button", { name: carsMessages.addCar })).toBeTruthy();
  });

  it("работник выбирает машину и не видит добавление, сохранение и удаление", async () => {
    const memory = createMemoryCars([
      { id: "car-1", plate: firstPlate, hasPhoto: false },
      { id: "car-2", plate: secondPlate, hasPhoto: false },
    ]);
    await renderCars(memory.api, false);

    expect(screen.queryByRole("button", { name: carsMessages.addCar })).toBeNull();
    expect(screen.queryByRole("button", { name: carsMessages.save })).toBeNull();
    expect(screen.queryByRole("button", { name: carsMessages.deleteCar })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();

    const first = screen.getByRole("button", { name: firstPlate });
    const second = screen.getByRole("button", { name: secondPlate });
    expect(first.getAttribute("aria-pressed")).toBe("false");
    expect(second.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(second);
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(first.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: carsMessages.save })).toBeNull();
  });
});
