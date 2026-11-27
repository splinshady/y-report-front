const scheduleRequestsPath = "/api/schedule/requests";
const shiftReportsPath = "/api/shift-reports";

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
  shiftReports: shiftReportsPath,
  shiftReportsForCar: (carId: string) =>
    `${shiftReportsPath}?carId=${encodeURIComponent(carId)}`,
  shiftReportById: (reportId: string) =>
    `${shiftReportsPath}/${encodeURIComponent(reportId)}`,
  shiftReport: (carId: string, date: string, shift: string) =>
    `${shiftReportsPath}?carId=${encodeURIComponent(carId)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`,
  shiftReportPhoto: (reportId: string, slot: number) =>
    `${shiftReportsPath}/${encodeURIComponent(reportId)}/photos/${encodeURIComponent(String(slot))}`,
} as const;
