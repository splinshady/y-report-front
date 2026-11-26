import { z } from "zod";
import { apiPaths } from "./api-paths";

export const taxiParkMembershipSchema = z.object({
  taxiParkId: z.string(),
  name: z.string(),
  role: z.enum(["owner", "worker"]),
});

export const taxiParkMembershipResponseSchema = z.object({
  membership: taxiParkMembershipSchema.nullable(),
});

export type TaxiParkMembership = z.infer<typeof taxiParkMembershipSchema>;

async function readMembership(response: Response): Promise<TaxiParkMembership | null> {
  if (!response.ok) {
    throw new Error("Taxi park request failed");
  }

  return taxiParkMembershipResponseSchema.parse(await response.json()).membership;
}

export async function loadTaxiParkMembership(): Promise<TaxiParkMembership | null> {
  const response = await fetch(apiPaths.taxiPark, { credentials: "include" });
  return readMembership(response);
}

export async function createTaxiPark(name: string): Promise<TaxiParkMembership> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("invalid");
  }

  const response = await fetch(apiPaths.taxiPark, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: trimmed }),
  });
  const membership = await readMembership(response);
  if (!membership) {
    throw new Error("Taxi park was not created");
  }

  return membership;
}

export async function inviteWorker(userId: string): Promise<TaxiParkMembership> {
  const response = await fetch(apiPaths.taxiParkInvite, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const membership = await readMembership(response);
  if (!membership) {
    throw new Error("Worker was not invited");
  }

  return membership;
}
