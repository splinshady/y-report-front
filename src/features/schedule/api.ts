import { z } from "zod";
import { apiPaths } from "../../lib/api-paths";

const scheduleShiftSchema = z.enum(["day", "night"]);

const scheduleDaySchema = z.object({
  date: z.string(),
  shift: scheduleShiftSchema,
});

const scheduleActorSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const scheduleRequestSchema = z.object({
  id: z.string(),
  taxiParkId: z.string(),
  status: z.enum(["requested", "approved", "rejected"]),
  createdBy: scheduleActorSchema,
  approvedBy: scheduleActorSchema.nullable(),
  rejectedBy: scheduleActorSchema.nullable(),
  days: z.array(scheduleDaySchema),
});

export const scheduleRequestsResponseSchema = z.object({
  requests: z.array(scheduleRequestSchema),
});

export type ScheduleRequest = z.infer<typeof scheduleRequestSchema>;

export type ScheduleApi = {
  load: () => Promise<ScheduleRequest[]>;
  create: (days: ScheduleRequest["days"]) => Promise<ScheduleRequest>;
  approve: (requestId: string) => Promise<ScheduleRequest>;
  reject: (requestId: string) => Promise<ScheduleRequest>;
  remove: (requestId: string) => Promise<void>;
};

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error("Schedule request failed");
  }

  return response.json() as Promise<unknown>;
}

export const scheduleApi: ScheduleApi = {
  async load() {
    const response = await fetch(apiPaths.scheduleRequests, { credentials: "include" });
    const body = scheduleRequestsResponseSchema.parse(await readJson(response));
    return body.requests;
  },
  async create(days) {
    const response = await fetch(apiPaths.scheduleRequests, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days }),
    });
    return scheduleRequestSchema.parse(await readJson(response));
  },
  async approve(requestId) {
    const response = await fetch(apiPaths.scheduleRequestApprove(requestId), {
      method: "POST",
      credentials: "include",
    });
    return scheduleRequestSchema.parse(await readJson(response));
  },
  async reject(requestId) {
    const response = await fetch(apiPaths.scheduleRequestReject(requestId), {
      method: "POST",
      credentials: "include",
    });
    return scheduleRequestSchema.parse(await readJson(response));
  },
  async remove(requestId) {
    const response = await fetch(apiPaths.scheduleRequestDelete(requestId), {
      method: "DELETE",
      credentials: "include",
    });
    await readJson(response);
  },
};
