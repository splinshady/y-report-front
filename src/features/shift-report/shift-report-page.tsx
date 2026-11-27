import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { type CarsApi } from "../cars/api";
import { ShiftReportRequestError, type ShiftReportApi, type ShiftReportPhotoFile, type ShiftReportShift } from "./api";
import {
  firstShiftReportField,
  shiftReportDateKey,
  shiftReportFieldErrors,
  shiftReportNumberKeys,
  type ShiftReportField,
  type ShiftReportFieldCode,
  type ShiftReportFieldErrors,
  type ShiftReportFormError,
  type ShiftReportNumberKey,
} from "./field-errors";
import { shiftReportMessages } from "./messages";

const fieldClassName =
  "min-h-touch rounded-card border bg-surface px-4 font-sans text-body tracking-body text-ink";

const numberFields = shiftReportNumberKeys.map((key) => ({
  key,
  label: shiftReportMessages[key],
}));

const emptyNumbers: Record<ShiftReportNumberKey, string> = {
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

function controlClass(invalid: boolean) {
  return `${fieldClassName} ${invalid ? "border-danger" : "border-border"}`;
}

function fieldId(field: ShiftReportField) {
  return `shift-report-${field}`;
}

function focusField(field: ShiftReportField) {
  document.getElementById(fieldId(field))?.focus();
}

function withoutField(fields: ShiftReportFieldErrors, field: ShiftReportField): ShiftReportFieldErrors {
  const next = { ...fields };
  delete next[field];
  return next;
}

export function ShiftReportPage({
  carId,
  today,
  api,
  carsApi,
  onCreated,
}: {
  carId: string;
  today: Date;
  api: ShiftReportApi;
  carsApi: Pick<CarsApi, "list">;
  onCreated?: (reportId: string) => void;
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
  const [attempted, setAttempted] = useState(false);
  const [clientErrors, setClientErrors] = useState<ShiftReportFieldErrors>({});
  const [serverErrors, setServerErrors] = useState<ShiftReportFieldErrors>({});
  const [formError, setFormError] = useState<ShiftReportFormError | null>(null);
  const [saving, setSaving] = useState(false);
  const visibleDate = calendarDate(date);
  const shownErrors: ShiftReportFieldErrors = attempted ? { ...clientErrors, ...serverErrors } : serverErrors;
  const shiftRejected = formError === "shift" || formError === "duplicate";

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

  function errorsFor(
    nextDate: string,
    nextNumbers: Record<ShiftReportNumberKey, string>,
    nextPhotos: readonly (File | null)[],
  ) {
    return shiftReportFieldErrors({
      date: nextDate,
      numbers: nextNumbers,
      photos: nextPhotos,
    });
  }

  function publishClientErrors(
    nextDate: string,
    nextNumbers: Record<ShiftReportNumberKey, string>,
    nextPhotos: readonly (File | null)[],
  ) {
    if (!attempted) {
      return;
    }
    setClientErrors(errorsFor(nextDate, nextNumbers, nextPhotos));
  }

  async function submitCreate() {
    if (saving) {
      return;
    }

    const nextErrors = errorsFor(date, numbers, photoFiles);
    setAttempted(true);
    setClientErrors(nextErrors);
    setServerErrors({});
    setFormError(null);
    const firstInvalid = firstShiftReportField(nextErrors);
    if (firstInvalid) {
      focusField(firstInvalid);
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
    const [first, second, third, fourth] = photoFiles;
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
      shiftTotal == null ||
      !first ||
      !second ||
      !third ||
      !fourth
    ) {
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
      onCreated?.(created.id);
    } catch (error) {
      if (error instanceof ShiftReportRequestError) {
        setServerErrors(error.fields);
        setFormError(error.form);
        const serverField = firstShiftReportField(error.fields);
        if (serverField) {
          focusField(serverField);
        } else if (error.form) {
          focusField("date");
        }
        return;
      }
      setFormError("save");
    } finally {
      setSaving(false);
    }
  }

  function numberError(key: ShiftReportNumberKey): ShiftReportFieldCode | null {
    return shownErrors[key] ?? null;
  }

  const photoError = photoSlots
    .map((slot) => shownErrors[`photo${slot}`])
    .find((code) => code != null);

  return (
    <div className="flex flex-col gap-4">
      {plate ? <p className="font-sans text-body tracking-body text-ink">{plate}</p> : null}
      {visibleDate ? (
        <p className="font-sans text-body tracking-body text-ink">{shiftReportMessages.dateLabel(visibleDate)}</p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          aria-pressed={shift === "day"}
          aria-invalid={shiftRejected && shift === "day"}
          className={shiftRejected && shift === "day" ? "ring-2 ring-danger" : ""}
          onClick={() => {
            setShift("day");
            setFormError(null);
          }}
        >
          {shiftReportMessages.day}
        </Button>
        <Button
          type="button"
          aria-pressed={shift === "night"}
          aria-invalid={shiftRejected && shift === "night"}
          className={shiftRejected && shift === "night" ? "ring-2 ring-danger" : ""}
          onClick={() => {
            setShift("night");
            setFormError(null);
          }}
        >
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
        <div className="flex flex-col gap-2">
          <input
            id={fieldId("date")}
            type="date"
            value={date}
            aria-label={visibleDate ? shiftReportMessages.dateLabel(visibleDate) : undefined}
            aria-invalid={Boolean(shownErrors.date) || shiftRejected}
            aria-describedby={shownErrors.date ? "shift-report-date-error" : undefined}
            onChange={(event) => {
              const nextDate = event.target.value;
              setDate(nextDate);
              setServerErrors((current) => withoutField(current, "date"));
              setFormError(null);
              publishClientErrors(nextDate, numbers, photoFiles);
            }}
            className={controlClass(Boolean(shownErrors.date) || shiftRejected)}
          />
          {shownErrors.date ? (
            <p id="shift-report-date-error" className="font-sans text-body tracking-body text-danger">
              {shiftReportMessages.fieldError[shownErrors.date]}
            </p>
          ) : null}
        </div>
        {numberFields.map((field) => {
          const error = numberError(field.key);
          return (
            <div key={field.key} className="flex flex-col gap-2">
              <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
                {field.label}
                <input
                  id={fieldId(field.key)}
                  value={numbers[field.key]}
                  inputMode="decimal"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fieldId(field.key)}-error` : undefined}
                  onChange={(event) => {
                    const nextNumbers = { ...numbers, [field.key]: event.target.value };
                    setNumbers(nextNumbers);
                    setServerErrors((current) => withoutField(current, field.key));
                    setFormError(null);
                    publishClientErrors(date, nextNumbers, photoFiles);
                  }}
                  className={controlClass(Boolean(error))}
                />
              </label>
              {error ? (
                <p id={`${fieldId(field.key)}-error`} className="font-sans text-body tracking-body text-danger">
                  {shiftReportMessages.fieldError[error]}
                </p>
              ) : null}
            </div>
          );
        })}
        {photoSlots.map((slot, index) => {
          const key = `photo${slot}` as const;
          const invalid = shownErrors[key] != null;
          return (
            <input
              key={slot}
              id={fieldId(key)}
              type="file"
              accept="image/*"
              aria-invalid={invalid}
              aria-describedby={photoError ? "shift-report-photos-error" : undefined}
              className={controlClass(invalid)}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                const next = [...photoFiles] as [File | null, File | null, File | null, File | null];
                next[index] = file;
                setPhotoFiles(next);
                setServerErrors((current) => withoutField(current, key));
                setFormError(null);
                publishClientErrors(date, numbers, next);
              }}
            />
          );
        })}
        {photoError ? (
          <p id="shift-report-photos-error" className="font-sans text-body tracking-body text-danger">
            {photoError === "image" ? shiftReportMessages.fieldError.image : shiftReportMessages.photoMissing}
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="font-sans text-body tracking-body text-danger">
            {shiftReportMessages.formError[formError]}
          </p>
        ) : null}
        <Button type="submit">{shiftReportMessages.create}</Button>
      </form>
    </div>
  );
}
