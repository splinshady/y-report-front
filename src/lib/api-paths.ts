const scheduleRequestsPath = "/api/schedule/requests";

export const apiPaths = {
  taxiPark: "/api/taxi-park",
  taxiParkInvite: "/api/taxi-park/invite",
  cars: "/api/cars",
  car: (carId: string) => `/api/cars/${encodeURIComponent(carId)}`,
  carPhoto: (carId: string) => `/api/cars/${encodeURIComponent(carId)}/photo`,
  scheduleRequests: scheduleRequestsPath,
  scheduleRequestsForCar: (carId: string) =>
    `${scheduleRequestsPath}?carId=${encodeURIComponent(carId)}`,
  scheduleRequestApprove: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}/approve`,
  scheduleRequestReject: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}/reject`,
  scheduleRequestDelete: (requestId: string) =>
    `/api/schedule/requests/${encodeURIComponent(requestId)}`,
} as const;
