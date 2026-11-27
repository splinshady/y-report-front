import { z } from "zod";
import { apiPaths } from "../../lib/api-paths";

export const carSchema = z.object({
  id: z.string(),
  plate: z.string(),
  hasPhoto: z.boolean(),
});

export const carsResponseSchema = z.object({
  cars: z.array(carSchema),
});

export type Car = z.infer<typeof carSchema>;

export type CarPhotoFile = {
  contentType: string;
  data: string;
};

export type CarPhotoUpdate =
  | { state: "keep" }
  | { state: "remove" }
  | ({ state: "replace" } & CarPhotoFile);

export type CarsApi = {
  list: () => Promise<Car[]>;
  create: (input: { plate: string; photo: CarPhotoFile | null }) => Promise<Car>;
  update: (carId: string, input: { plate: string; photo: CarPhotoUpdate }) => Promise<Car>;
  remove: (carId: string) => Promise<void>;
  readPhoto: (carId: string) => Promise<Blob | null>;
};

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error("Car request failed");
  }

  return response.json() as Promise<unknown>;
}

export const carsApi: CarsApi = {
  async list() {
    const response = await fetch(apiPaths.cars, { credentials: "include" });
    const body = carsResponseSchema.parse(await readJson(response));
    return body.cars;
  },
  async create(input) {
    const response = await fetch(apiPaths.cars, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return carSchema.parse(await readJson(response));
  },
  async update(carId, input) {
    const response = await fetch(apiPaths.car(carId), {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return carSchema.parse(await readJson(response));
  },
  async remove(carId) {
    const response = await fetch(apiPaths.car(carId), {
      method: "DELETE",
      credentials: "include",
    });
    await readJson(response);
  },
  async readPhoto(carId) {
    const response = await fetch(apiPaths.carPhoto(carId), { credentials: "include" });
    if (!response.ok) {
      return null;
    }

    return response.blob();
  },
};
