import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Check, Crosshair, Leaf, Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { setCaptureHandler } from "@/lib/photo-store";
import { useActiveWorker, useWorkerProjects } from "@/lib/worker-store";

export const Route = createFileRoute("/mobile/new-plant")({
  component: NewPlant,
});

const kinds = ["Tree", "Hedge", "Lawn", "Flower bed", "Shrub"] as const;

// Stand-in for the photo species recognition — shows what the worker would see.
const guesses: Record<
  (typeof kinds)[number],
  { species: string; common: string }
> = {
  Tree: { species: "Tilia cordata", common: "Small-leaved lime" },
  Hedge: { species: "Thuja occidentalis", common: "White cedar" },
  Lawn: { species: "Lolium perenne", common: "Ryegrass" },
  "Flower bed": { species: "Lavandula angustifolia", common: "Lavender" },
  Shrub: { species: "Taxus baccata", common: "Yew" },
};

function NewPlant() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [kind, setKind] = useState<(typeof kinds)[number]>("Tree");
  const worker = useActiveWorker();
  const projects = useWorkerProjects(worker?.id);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [zone, setZone] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const guess = guesses[kind];

  // The big camera button in the tab bar opens the plant photo while on this screen.
  useEffect(() => {
    setCaptureHandler(() => fileRef.current?.click());
    return () => setCaptureHandler(null);
  }, []);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    if (!coords) locate();
  }

  function locate() {
    if (!navigator.geolocation) {
      toast.error("This phone can't share its location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Location not shared — you can still save the plant");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function save() {
    if (!photo) {
      toast.error("Take a photo of the plant first");
      return;
    }
    toast.success(`${guess.common} added to ${project?.name ?? "the site"}`);
    navigate({ to: "/mobile/plants" });
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhoto}
      />

      <div>
        <h1 className="font-display text-xl">Register new plant</h1>
        <p className="text-sm text-muted-foreground">
          Photo it where it stands — the spot is saved with it.
        </p>
      </div>

      {photo ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <img
            src={photo}
            alt="New plant"
            className="h-48 w-full object-cover"
          />
          <div className="flex items-center gap-2 p-3">
            <Leaf className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{guess.common}</p>
              <p className="truncate text-xs italic text-muted-foreground">
                {guess.species}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border px-3 py-2 text-xs"
            >
              Retake
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl bg-primary py-10 text-primary-foreground"
        >
          <Camera className="size-8" />
          <span className="text-sm font-semibold">Take photo of the plant</span>
        </button>
      )}

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Kind
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                k === kind
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-card"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Site
        </p>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-xl border bg-card p-3 text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.city}
            </option>
          ))}
        </select>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="w-full rounded-xl border bg-card p-3 text-sm"
        >
          <option value="">Area (optional)</option>
          {(project?.zones ?? []).map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Location
        </p>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <MapPin className="size-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm">
            {coords
              ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : "Not pinned yet"}
          </p>
          <button
            type="button"
            onClick={locate}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Crosshair className="size-3.5" />
            )}
            {coords ? "Update" : "Use my spot"}
          </button>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/mobile" })}
          className="rounded-xl border px-4 py-3.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
        >
          <Check className="size-5" /> Save plant
        </button>
      </div>
    </div>
  );
}
