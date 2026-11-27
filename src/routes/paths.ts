export const paths = {
  home: "/",
  schedule: "/schedule",
  reports: "/reports",
  carReports: "/reports/$carId",
  shiftReportCreate: "/reports/$carId/new",
  shiftReportView: "/reports/$carId/$reportId",
  settings: "/settings",
  account: "/account",
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;
