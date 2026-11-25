export const apiPaths = {
  scheduleRequests: "/api/schedule/requests",
  scheduleRequestApprove: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}/approve`,
  scheduleRequestReject: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}/reject`,
  scheduleRequestDelete: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}`,
} as const;
