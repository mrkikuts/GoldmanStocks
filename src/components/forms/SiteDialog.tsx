import { useMutation } from "@tanstack/react-query";
import { Loader2, MapPin, Search, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/ClientDialog";
import { LocationPicker } from "@/components/map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRefreshData } from "@/hooks/use-data";
import { addressAt, searchAddress, type Place } from "@/lib/api/geocode";
import { saveSite, type SiteInput } from "@/lib/api/projects";
import type { LatLng } from "@/lib/geo";
import { statusLabel } from "@/lib/labels";
import type { Client, Project, Worker } from "@/lib/types";

type Form = Omit<SiteInput, "lat" | "lng"> & { location: LatLng | null };

/** Add a work site, or edit one when `site` is given. */
export function SiteDialog({
  site,
  clients,
  workers,
  initialLocation,
  open,
  onOpenChange,
}: {
  site?: Project | undefined;
  clients: Client[];
  workers: Worker[];
  /** e.g. where the boss clicked on the sites map */
  initialLocation?: LatLng | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {open ? (
          <SiteForm
            key={site?.id ?? "new"}
            site={site}
            clients={clients}
            workers={workers}
            initialLocation={initialLocation ?? null}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SiteForm({
  site,
  clients,
  workers,
  initialLocation,
  onDone,
}: {
  site: Project | undefined;
  clients: Client[];
  workers: Worker[];
  initialLocation: LatLng | null;
  onDone: () => void;
}) {
  const refresh = useRefreshData();
  const [form, setForm] = useState<Form>({
    ...(site ? { id: site.id } : {}),
    clientId: site?.clientId ?? clients[0]?.id ?? "",
    name: site?.name ?? "",
    address: site?.address ?? "",
    city: site?.city ?? "",
    location: site ? { lat: site.lat, lng: site.lng } : initialLocation,
    zones: site?.zones ?? [],
    workerIds: site?.workerIds ?? [],
    leadWorkerId: site?.leadWorkerId ?? "",
    visitsPerMonth: site?.visitsPerMonth ?? 4,
    monthlyValue: site?.monthlyValue ?? 0,
    contractUntil: site?.contractUntil ?? "",
    status: site?.status ?? "healthy",
  });
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const [zonesText, setZonesText] = useState(form.zones.join(", "));

  // Address search → pick a result → the pin jumps there.
  const [query, setQuery] = useState("");
  const search = useMutation({
    mutationFn: (q: string) => searchAddress({ data: q }),
    onError: (error) => toast.error(error.message),
  });
  const choosePlace = (place: Place) => {
    setForm((f) => ({
      ...f,
      location: { lat: place.lat, lng: place.lng },
      address: place.address,
      city: place.city || f.city,
    }));
    search.reset();
  };

  // Clicking/dragging on the map → offer the nearest street address.
  const nearest = useMutation({
    mutationFn: (at: LatLng) => addressAt({ data: at }),
  });
  const pick = (at: LatLng) => {
    set("location", at);
    nearest.mutate(at);
  };

  const toggleCrew = (id: string) =>
    setForm((f) => {
      const workerIds = f.workerIds.includes(id)
        ? f.workerIds.filter((w) => w !== id)
        : [...f.workerIds, id];
      return {
        ...f,
        workerIds,
        leadWorkerId: workerIds.includes(f.leadWorkerId)
          ? f.leadWorkerId
          : (workerIds[0] ?? ""),
      };
    });

  const save = useMutation({
    mutationFn: () => {
      if (!form.location) throw new Error("Place the site on the map first");
      const { location, ...rest } = form;
      return saveSite({
        data: {
          ...rest,
          lat: location.lat,
          lng: location.lng,
          zones: zonesText
            .split(",")
            .map((z) => z.trim())
            .filter(Boolean),
        },
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success(
        site
          ? "Site updated"
          : `${form.name} added — weather and routes use its location`,
      );
      onDone();
    },
    onError: (error) => toast.error(error.message),
  });

  const suggestion = nearest.data;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>
          {site ? `Edit ${site.name}` : "Add work site"}
        </DialogTitle>
        <DialogDescription>
          Search an address or click the map, then drag the pin to the exact
          spot — the weather forecast and route planning use it.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (query.trim().length >= 3) search.mutate(query);
              }
            }}
            placeholder="Search an address, e.g. Valukoja 8, Tallinn"
          />
          <Button
            type="button"
            variant="outline"
            disabled={query.trim().length < 3 || search.isPending}
            onClick={() => search.mutate(query)}
          >
            {search.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Find
          </Button>
        </div>
        {search.data ? (
          <div className="rounded-lg border">
            {search.data.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No matches — try adding the city.
              </p>
            ) : (
              search.data.map((place) => (
                <button
                  key={`${place.lat},${place.lng}`}
                  type="button"
                  onClick={() => choosePlace(place)}
                  className="flex w-full items-start gap-2 border-b p-2.5 text-left text-sm last:border-b-0 hover:bg-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="line-clamp-2">{place.label}</span>
                </button>
              ))
            )}
          </div>
        ) : null}

        <LocationPicker value={form.location} onChange={pick} height={280} />
        <p className="text-xs text-muted-foreground">
          {form.location
            ? `Pinned at ${form.location.lat.toFixed(5)}, ${form.location.lng.toFixed(5)}`
            : "Not placed yet — click the map where the site is."}
          {suggestion && suggestion.address !== form.address ? (
            <>
              {" "}
              · Nearest address {suggestion.address}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    address: suggestion.address,
                    city: suggestion.city || f.city,
                  }))
                }
              >
                use it
              </button>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Client">
          <Select
            value={form.clientId}
            onValueChange={(v) => set("clientId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Site name">
          <Input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Kalamaja — courtyard"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Address">
            <Input
              required
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
        </div>
        <Field label="City">
          <Input
            required
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Zones (comma-separated)">
        <Input
          value={zonesText}
          onChange={(e) => setZonesText(e.target.value)}
          placeholder="e.g. Front garden, Courtyard, Parking edge"
        />
      </Field>

      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Crew</p>
        <div className="flex flex-wrap gap-2">
          {workers.map((w) => {
            const on = form.workerIds.includes(w.id);
            const lead = form.leadWorkerId === w.id;
            return (
              <span
                key={w.id}
                className={`inline-flex items-center rounded-full border text-sm ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCrew(w.id)}
                  aria-pressed={on}
                  className="inline-flex items-center gap-2 py-1.5 pr-2 pl-3"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: w.color }}
                  />
                  {w.name}
                </button>
                {on ? (
                  <button
                    type="button"
                    onClick={() => set("leadWorkerId", w.id)}
                    aria-label={
                      lead ? `${w.name} is the lead` : `Make ${w.name} the lead`
                    }
                    title={lead ? "Lead" : "Make lead"}
                    className="border-l border-primary/30 py-1.5 pr-3 pl-2"
                  >
                    <Star
                      className={`size-3.5 ${lead ? "fill-current" : "opacity-40"}`}
                    />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Tap a name to add or remove them; the star marks the site lead.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Visits / month">
          <Input
            type="number"
            min={0}
            value={form.visitsPerMonth}
            onChange={(e) =>
              set("visitsPerMonth", Math.round(Number(e.target.value)))
            }
          />
        </Field>
        <Field label="Monthly value (€)">
          <Input
            type="number"
            min={0}
            step={10}
            value={form.monthlyValue}
            onChange={(e) => set("monthlyValue", Number(e.target.value))}
          />
        </Field>
        <Field label="Contract until">
          <Input
            type="date"
            value={form.contractUntil}
            onChange={(e) => set("contractUntil", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Site status">
        <Select
          value={form.status}
          onValueChange={(v) => set("status", v as Form["status"])}
        >
          <SelectTrigger className="sm:w-1/2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["healthy", "attention", "critical"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={save.isPending || !form.location || !form.clientId}
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {site ? "Save changes" : "Add site"}
        </Button>
      </DialogFooter>
    </form>
  );
}
