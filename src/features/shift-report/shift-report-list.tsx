import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { paths } from "../../routes/paths";
import { type CarsApi } from "../cars/api";
import { type ShiftReport, type ShiftReportApi } from "./api";
import { shiftReportMessages } from "./messages";

const createLinkClassName =
  "inline-flex min-h-touch items-center justify-center rounded-pill bg-link px-5 font-sans text-body tracking-body text-white";

const reportLinkClassName =
  "flex min-h-touch items-center font-sans text-body tracking-body text-ink";

function calendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function ShiftReportList({
  carId,
  api,
  carsApi,
}: {
  carId: string;
  api: ShiftReportApi;
  carsApi: Pick<CarsApi, "list">;
}) {
  const [plate, setPlate] = useState<string | null>(null);
  const [reports, setReports] = useState<ShiftReport[]>([]);

  useEffect(() => {
    let active = true;
    carsApi
      .list()
      .then((cars) => {
        if (!active) {
          return;
        }
        setPlate(cars.find((car) => car.id === carId)?.plate ?? null);
      })
      .catch(() => undefined);

    api
      .list(carId)
      .then((loaded) => {
        if (active) {
          setReports(loaded);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [api, carId, carsApi]);

  return (
    <div className="flex flex-col gap-4">
      {plate ? <p className="font-sans text-body tracking-body text-ink">{plate}</p> : null}
      <Link to={paths.shiftReportCreate} params={{ carId }} className={createLinkClassName}>
        {shiftReportMessages.create}
      </Link>
      <div className="flex flex-col gap-2">
        {reports.map((report) => {
          const date = calendarDate(report.date);
          if (!date) {
            return null;
          }

          return (
            <Link
              key={report.id}
              to={paths.shiftReportView}
              params={{ carId, reportId: report.id }}
              className={reportLinkClassName}
            >
              {shiftReportMessages.summary(date, report.shift)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
