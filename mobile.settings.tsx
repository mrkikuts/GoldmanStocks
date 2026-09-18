import { createFileRoute } from "@tanstack/react-router";
import { Bell, Camera, Languages, MapPin, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { workers } from "@/lib/rootline-data";
import { setActiveWorker, useActiveWorker, workerProjects } from "@/lib/worker-store";

export const Route = createFileRoute("/mobile/settings")({
  component: MobileSettings,
  head: () => ({
    meta: [
      { title: "Settings — Goldman Stocks worker app" },
      {
        name: "description",
        content: "Who is using this phone, app language and photo & location options.",
      },
      { property: "og:title", content: "Settings — Goldman Stocks worker app" },
      {
        property: "og:description",
        content: "Who is using this phone, app language and photo & location options.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const languages = [
  { code: "ET", label: "Eesti" },
  { code: "EN", label: "English" },
  { code: "LV", label: "Latviešu" },
];

function MobileSettings() {
  const activeWorker = useActiveWorker();
  const workerId = activeWorker.id;
  const [language, setLanguage] = useState("ET");
  const [geoTag, setGeoTag] = useState(true);
  const [reminders, setReminders] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-foreground">Worker preferences</p>
        <h1 className="font-display text-3xl font-bold text-primary">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Saved on this phone.</p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <User className="size-4 text-primary" /> Who is using this phone?
        </h2>
        <div className="flex flex-wrap gap-2">
          {workers.map((w) => (
            <Button
              key={w.id}
              type="button"
              variant="outline"
              onClick={() => {
                setActiveWorker(w.id);
                toast(`Signed in as ${w.name}`);
              }}
              className={`h-10 rounded-lg px-3 ${
                w.id === workerId
                  ? "border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "bg-background text-muted-foreground shadow-none"
              }`}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: w.color }} />
              {w.name}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          The app only shows {activeWorker.name.split(" ")[0]}'s sites, jobs and plants —{" "}
          {workerProjects(workerId).length} site(s) right now.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="size-4 text-primary" /> Language
        </h2>
        <div className="flex gap-2">
          {languages.map((l) => (
            <Button
              key={l.code}
              type="button"
              variant="outline"
              onClick={() => setLanguage(l.code)}
              className={`h-10 flex-1 rounded-lg ${
                l.code === language
                  ? "border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "bg-background text-muted-foreground shadow-none"
              }`}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="divide-y rounded-lg border bg-card shadow-card">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Stamp photos with location</p>
              <p className="text-xs text-muted-foreground">
                Work photos get the GPS spot of the plant.
              </p>
            </div>
          </div>
          <Switch checked={geoTag} onCheckedChange={setGeoTag} aria-label="Stamp photos with location" />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Morning job reminders</p>
              <p className="text-xs text-muted-foreground">
                A nudge at 7:30 with today's list.
              </p>
            </div>
          </div>
          <Switch checked={reminders} onCheckedChange={setReminders} aria-label="Morning job reminders" />
        </div>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[11px] text-muted-foreground">
        <Camera className="size-3" /> Goldman Stocks worker app · demo build
      </p>
    </div>
  );
}
