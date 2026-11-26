export const apiPaths = {
  taxiPark: "/api/taxi-park",
  taxiParkInvite: "/api/taxi-park/invite",
  scheduleRequests: "/api/schedule/requests",
  scheduleRequestApprove: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}/approve`,
  scheduleRequestReject: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}/reject`,
  scheduleRequestDelete: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}`,
} as const;
