import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { type CarsApi } from "../cars/api";
import {
  isShiftReportDateAllowed,
  shiftReportDateKey,
  type ShiftReport,
  type ShiftReportApi,
  type ShiftReportPhotoFile,
  type ShiftReportShift,
} from "./api";
import { shiftReportMessages } from "./messages";

const fieldClassName =
  "min-h-touch rounded-card border border-border bg-surface px-4 font-sans text-body tracking-body text-ink";

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

type NumberKey = (typeof numberFields)[number]["key"];

const emptyNumbers: Record<NumberKey, string> = {
  mileageStart: "",
  mileageEnd: "",
  cashless: "",
  cash: "",
  discount: "",
  tip: "",
  wash: "",
  lineTime: "",
  cashStart: "",
  cashEnd: "",
  shiftTotal: "",
};

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

function parsedNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readPhotoFile(file: File): Promise<ShiftReportPhotoFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return { contentType: file.type, data: btoa(binary) };
}

export function ShiftReportPage({
  carId,
  today,
  api,
  carsApi,
}: {
  carId: string;
  today: Date;
  api: ShiftReportApi;
  carsApi: Pick<CarsApi, "list">;
}) {
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState(() => shiftReportDateKey(today));
  const [shift, setShift] = useState<ShiftReportShift>("day");
  const [numbers, setNumbers] = useState(emptyNumbers);
  const [photoFiles, setPhotoFiles] = useState<[File | null, File | null, File | null, File | null]>([
    null,
    null,
    null,
    null,
  ]);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const loadEpoch = useRef(0);
  const visibleDate = calendarDate(date);

  useEffect(() => {
    let active = true;
    void carsApi
      .list()
      .then((cars) => {
        if (active) {
          setPlate(cars.find((car) => car.id === carId)?.plate ?? "");
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [carId, carsApi]);

  useEffect(() => {
    const epoch = loadEpoch.current + 1;
    loadEpoch.current = epoch;
    let active = true;
    setReport(null);
    void api
      .read(carId, date, shift)
      .then((loaded) => {
        if (active && loadEpoch.current === epoch) {
          setReport(loaded);
        }
      })
      .catch(() => {
        if (active && loadEpoch.current === epoch) {
          setReport(null);
        }
      });

    return () => {
      active = false;
    };
  }, [api, carId, date, shift]);

  useEffect(() => {
    if (!report) {
      setPhotoUrls([]);
      return;
    }

    let active = true;
    const created: string[] = [];
    void (async () => {
      const urls: string[] = [];
      for (const slot of photoSlots) {
        const blob = await api.readPhoto(report.id, slot);
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
    })().catch(() => undefined);

    return () => {
      active = false;
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
  }, [api, report]);

  async function submitCreate() {
    if (saving || !isShiftReportDateAllowed(date, today) || photoFiles.some((file) => file == null)) {
      return;
    }

    const mileageStart = parsedNumber(numbers.mileageStart);
    const mileageEnd = parsedNumber(numbers.mileageEnd);
    const cashless = parsedNumber(numbers.cashless);
    const cash = parsedNumber(numbers.cash);
    const discount = parsedNumber(numbers.discount);
    const tip = parsedNumber(numbers.tip);
    const wash = parsedNumber(numbers.wash);
    const lineTime = parsedNumber(numbers.lineTime);
    const cashStart = parsedNumber(numbers.cashStart);
    const cashEnd = parsedNumber(numbers.cashEnd);
    const shiftTotal = parsedNumber(numbers.shiftTotal);
    if (
      mileageStart == null ||
      mileageEnd == null ||
      cashless == null ||
      cash == null ||
      discount == null ||
      tip == null ||
      wash == null ||
      lineTime == null ||
      cashStart == null ||
      cashEnd == null ||
      shiftTotal == null
    ) {
      return;
    }

    const [first, second, third, fourth] = photoFiles;
    if (!first || !second || !third || !fourth) {
      return;
    }

    setSaving(true);
    try {
      const created = await api.create({
        carId,
        date,
        shift,
        mileageStart,
        mileageEnd,
        cashless,
        cash,
        discount,
        tip,
        wash,
        lineTime,
        cashStart,
        cashEnd,
        shiftTotal,
        photos: [
          await readPhotoFile(first),
          await readPhotoFile(second),
          await readPhotoFile(third),
          await readPhotoFile(fourth),
        ],
      });
      loadEpoch.current += 1;
      setReport(created);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {plate ? <p className="font-sans text-body tracking-body text-ink">{plate}</p> : null}
      {visibleDate ? (
        <p className="font-sans text-body tracking-body text-ink">{shiftReportMessages.dateLabel(visibleDate)}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" aria-pressed={shift === "day"} onClick={() => setShift("day")}>
          {shiftReportMessages.day}
        </Button>
        <Button type="button" aria-pressed={shift === "night"} onClick={() => setShift("night")}>
          {shiftReportMessages.night}
        </Button>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submitCreate();
        }}
      >
        <input
          type="date"
          value={date}
          aria-label={visibleDate ? shiftReportMessages.dateLabel(visibleDate) : undefined}
          onChange={(event) => setDate(event.target.value)}
          className={fieldClassName}
        />
        {numberFields.map((field) => (
          <label key={field.key} className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
            {field.label}
            <input
              value={numbers[field.key]}
              inputMode="decimal"
              onChange={(event) =>
                setNumbers((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </label>
        ))}
        {photoSlots.map((slot, index) => (
          <input
            key={slot}
            type="file"
            accept="image/*"
            className={fieldClassName}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              setPhotoFiles((current) => {
                const next = [...current] as [File | null, File | null, File | null, File | null];
                next[index] = file;
                return next;
              });
            }}
          />
        ))}
        <Button type="submit">{shiftReportMessages.create}</Button>
      </form>
      {report ? (
        <div className="flex flex-col gap-4">
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
              <img key={url} src={url} alt="" className="size-12 rounded-card object-cover" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
