import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CloudRain,
  Cloud,
  Sun,
  CheckCircle2,
  Leaf,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusDot } from "@/components/StatusDot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  plants,
  clients,
  workers,
  tasks,
  weather,
  revenueOpportunities,
} from "@/lib/rootline-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rootline — plant-aware crew planning" },
      {
        name: "description",
        content:
          "Rootline plans every gardener's day around each plant's care schedule and the weather, with proof of work for every client.",
      },
      { property: "og:title", content: "Rootline — plant-aware crew planning" },
      {
        property: "og:description",
        content:
          "Daily AI plans for landscaping crews, built from plant care schedules and live weather.",
      },
    ],
  }),
  component: Dashboard,
});

const weatherIcon = { rain: CloudRain, cloud: Cloud, sun: Sun } as const;

function Dashboard() {
  const [approved, setApproved] = useState(false);
  const todayTasks = tasks.filter((t) => t.day === 0);
  const critical = plants.filter((p) => p.status === "critical");
  const pipeline = revenueOpportunities.reduce((sum, o) => sum + o.value, 0);

  return (
    <AppShell
      title="Monday morning"
      subtitle="21 September · 4 workers on shift · 988 plants under care"
      actions={
        <Button
          size="lg"
          disabled={approved}
          onClick={() => {
            setApproved(true);
            toast.success("Today's plan approved — sent to 4 worker phones");
          }}
        >
          {approved ? "Plan approved" : "Approve today's plan"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <Stat icon={Leaf} label="Plants needing care today" value="23" hint="6 overdue" />
        <Stat icon={CloudRain} label="Tasks skipped by weather" value="18" hint="9 mm rain overnight" />
        <Stat icon={Clock} label="Planned hours today" value="26.5" hint="across 4 workers" />
        <Stat
          icon={TrendingUp}
          label="Repeat work ready to offer"
          value={`€${pipeline.toLocaleString("en-GB")}`}
          hint={`${revenueOpportunities.length} clients`}
        />
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">This week's weather, applied to the plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          {weather.map((w) => {
            const Icon = weatherIcon[w.icon as keyof typeof weatherIcon];
            return (
              <div key={w.day} className="rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{w.day}</span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-2xl font-semibold">{w.temp}°</p>
                <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Today's plan by worker</CardTitle>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Open calendar <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {workers.map((w) => {
              const own = todayTasks.filter((t) => t.workerId === w.id);
              return (
                <div key={w.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{w.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {own.reduce((s, t) => s + t.duration, 0)} h · {own.length} stops
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {own.length === 0 ? (
                      <li className="text-sm text-muted-foreground">No tasks — available</li>
                    ) : (
                      own.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="tabular-nums text-muted-foreground">
                            {String(t.start).padStart(2, "0")}:00
                          </span>
                          <span>{t.title}</span>
                          <span className="text-muted-foreground">· {t.client}</span>
                          {t.status === "skipped" ? (
                            <Badge variant="outline" className="text-status-attention">
                              skipped
                            </Badge>
                          ) : null}
                          {t.status === "done" ? (
                            <CheckCircle2 className="size-4 text-status-healthy" />
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Plants at risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {critical.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{p.common}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.client} · {p.site}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusDot status={p.status} />
                    <span className="text-xs text-muted-foreground">{p.nextTask}</span>
                  </div>
                </div>
              ))}
              <Link to="/plants" className="block text-sm text-primary hover:underline">
                See all plants
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Repeat work to offer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {revenueOpportunities.map((o) => (
                <div key={o.client} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{o.client}</p>
                    <p className="text-xs text-muted-foreground">{o.what}</p>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">€{o.value}</span>
                </div>
              ))}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => toast.success("4 draft offers ready for your review")}
              >
                Draft offers
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {clients.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.hoursThisMonth} h</span>
                </div>
              ))}
              <Link to="/clients" className="block text-sm text-primary hover:underline">
                Client list
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Leaf;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
