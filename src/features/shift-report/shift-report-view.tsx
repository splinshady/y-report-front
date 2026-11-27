import { useEffect, useState } from "react";
import { type CarsApi } from "../cars/api";
import { type ShiftReport, type ShiftReportApi } from "./api";
import { shiftReportMessages } from "./messages";

const numberFields = [
  { key: "mileageStart", label: shiftReportMessages.mileageStart },
  { key: "mileageEnd", label: shiftReportMessages.mileageEnd },
  { key: "cashless", label: shiftReportMessages.cashless },
  { key: "cash", label: shiftReportMessages.cash },
  { key: "discount", label: shiftReportMessages.discount },
  { key: "tip", label: shiftReportMessages.tip },
  { key: "wash", label: shiftReportMessages.wash },
  { key: "lineTime", label: shiftReportMessages.lineTime },
  { key: "cashStart", label: shiftReportMessages.cashStart },
  { key: "cashEnd", label: shiftReportMessages.cashEnd },
  { key: "shiftTotal", label: shiftReportMessages.shiftTotal },
] as const;

const photoSlots = [1, 2, 3, 4] as const;

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

export function ShiftReportView({
  carId,
  reportId,
  api,
  carsApi,
}: {
  carId: string;
  reportId: string;
  api: ShiftReportApi;
  carsApi: Pick<CarsApi, "list">;
}) {
  const [plate, setPlate] = useState<string | null>(null);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

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

    return () => {
      active = false;
    };
  }, [carId, carsApi]);

  useEffect(() => {
    let active = true;
    const created: string[] = [];

    api
      .readById(reportId)
      .then(async (loaded) => {
        if (!active || !loaded || loaded.carId !== carId) {
          return;
        }

        setReport(loaded);
        const urls: string[] = [];
        for (const slot of photoSlots) {
          const blob = await api.readPhoto(loaded.id, slot);
          if (!blob) {
            continue;
          }
          const url = URL.createObjectURL(blob);
          if (!active) {
            URL.revokeObjectURL(url);
            continue;
          }
          created.push(url);
          urls.push(url);
        }
        if (active) {
          setPhotoUrls(urls);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
  }, [api, carId, reportId]);

  const visibleDate = report ? calendarDate(report.date) : null;

  if (!report) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {plate ? <p className="font-sans text-body tracking-body text-ink">{plate}</p> : null}
      {visibleDate ? (
        <p className="font-sans text-body tracking-body text-ink">{shiftReportMessages.dateLabel(visibleDate)}</p>
      ) : null}
      <p className="font-sans text-body tracking-body text-ink">
        {report.shift === "day" ? shiftReportMessages.day : shiftReportMessages.night}
      </p>
      <dl className="flex flex-col gap-2">
        {numberFields.map((field) => (
          <div key={field.key}>
            <dt className="font-sans text-body tracking-body text-muted">{field.label}</dt>
            <dd className="font-sans text-body tracking-body text-ink">{report[field.key]}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        {photoUrls.map((url) => (
          <img key={url} src={url} alt="" className="size-16 rounded-card object-cover" />
        ))}
      </div>
    </div>
  );
}
