import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { type Car, type CarPhotoFile, type CarPhotoUpdate, type CarsApi } from "./api";
import { carsMessages } from "./messages";

const fieldClassName =
  "min-h-touch rounded-card border border-border bg-surface px-4 font-sans text-body tracking-body text-ink";

type PhotoChoice = { state: "keep" } | { state: "remove" } | { state: "replace"; file: File };

async function readPhotoFile(file: File): Promise<CarPhotoFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return { contentType: file.type, data: btoa(binary) };
}

function carButtonClassName(selected: boolean): string {
  return [
    "flex min-h-touch w-full items-center gap-3 rounded-card px-4 text-left font-sans text-body tracking-body",
    selected ? "bg-surface font-medium text-ink" : "bg-transparent text-ink",
  ].join(" ");
}

function EditCarForm({
  car,
  photoUrl,
  api,
  onUpdated,
  onDeleted,
}: {
  car: Car;
  photoUrl: string | null;
  api: CarsApi;
  onUpdated: (car: Car) => void;
  onDeleted: (carId: string) => void;
}) {
  const [plate, setPlate] = useState(car.plate);
  const [photoChoice, setPhotoChoice] = useState<PhotoChoice>({ state: "keep" });
  const [saving, setSaving] = useState(false);

  async function submitSave() {
    const trimmed = plate.trim();
    if (trimmed.length === 0 || saving) {
      return;
    }

    setSaving(true);
    try {
      const photo: CarPhotoUpdate =
        photoChoice.state === "replace"
          ? { state: "replace", ...(await readPhotoFile(photoChoice.file)) }
          : photoChoice.state === "remove"
            ? { state: "remove" }
            : { state: "keep" };
      onUpdated(await api.update(car.id, { plate: trimmed, photo }));
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  async function submitDelete() {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      await api.remove(car.id);
      onDeleted(car.id);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label={carsMessages.save}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submitSave();
      }}
    >
      <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
        {carsMessages.plate}
        <input value={plate} onChange={(event) => setPlate(event.target.value)} className={fieldClassName} />
      </label>
      <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
        {carsMessages.photo}
        <input
          type="file"
          accept="image/*"
          className={fieldClassName}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setPhotoChoice(file ? { state: "replace", file } : { state: "remove" });
          }}
        />
      </label>
      {car.hasPhoto && photoChoice.state === "keep" && photoUrl ? (
        <button type="button" onClick={() => setPhotoChoice({ state: "remove" })}>
          <img src={photoUrl} alt={carsMessages.photo} className="size-12 rounded-card object-cover" />
        </button>
      ) : null}
      <Button type="submit">{carsMessages.save}</Button>
      <Button type="button" onClick={() => void submitDelete()}>
        {carsMessages.deleteCar}
      </Button>
    </form>
  );
}

export function CarsScreen({
  api,
  canManage,
  selectedId,
  onSelect,
}: {
  api: CarsApi;
  canManage: boolean;
  selectedId: string | null;
  onSelect: (carId: string | null) => void;
}) {
  const [cars, setCars] = useState<Car[]>([]);
  const [draftPlate, setDraftPlate] = useState("");
  const [draftPhoto, setDraftPhoto] = useState<File | null>(null);
  const [draftFileKey, setDraftFileKey] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void api
      .list()
      .then((loaded) => {
        if (active) {
          setCars(loaded);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    let active = true;
    const created: string[] = [];
    void (async () => {
      const next: Record<string, string> = {};
      for (const car of cars) {
        if (!car.hasPhoto) {
          continue;
        }
        const blob = await api.readPhoto(car.id);
        if (!blob) {
          continue;
        }
        const url = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(url);
          continue;
        }
        created.push(url);
        next[car.id] = url;
      }
      if (active) {
        setPhotoUrls(next);
      }
    })();

    return () => {
      active = false;
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
  }, [api, cars]);

  async function submitCreate() {
    const plate = draftPlate.trim();
    if (plate.length === 0) {
      return;
    }

    try {
      const photo = draftPhoto ? await readPhotoFile(draftPhoto) : null;
      const created = await api.create({ plate, photo });
      setCars((current) => [...current, created]);
      setDraftPlate("");
      setDraftPhoto(null);
      setDraftFileKey((key) => key + 1);
    } catch {
      return;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {cars.map((car) => (
          <button
            key={car.id}
            type="button"
            aria-pressed={selectedId === car.id}
            className={carButtonClassName(selectedId === car.id)}
            onClick={() => onSelect(car.id)}
          >
            {photoUrls[car.id] ? <img src={photoUrls[car.id]} alt="" className="size-12 rounded-card object-cover" /> : null}
            <span>{car.plate}</span>
          </button>
        ))}
      </div>
      {canManage ? (
        <form
          aria-label={carsMessages.addCar}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCreate();
          }}
        >
          <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
            {carsMessages.plate}
            <input
              value={draftPlate}
              onChange={(event) => setDraftPlate(event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
            {carsMessages.photo}
            <input
              key={draftFileKey}
              type="file"
              accept="image/*"
              className={fieldClassName}
              onChange={(event) => setDraftPhoto(event.currentTarget.files?.[0] ?? null)}
            />
          </label>
          <Button type="submit">{carsMessages.addCar}</Button>
        </form>
      ) : null}
      {canManage && cars.some((car) => car.id === selectedId)
        ? cars
            .filter((car) => car.id === selectedId)
            .map((car) => (
              <EditCarForm
                key={`${car.id}:${car.plate}:${car.hasPhoto}`}
                car={car}
                photoUrl={photoUrls[car.id] ?? null}
                api={api}
                onUpdated={(updated) => {
                  setCars((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                }}
                onDeleted={(carId) => {
                  setCars((current) => current.filter((item) => item.id !== carId));
                  onSelect(null);
                }}
              />
            ))
        : null}
    </div>
  );
}
