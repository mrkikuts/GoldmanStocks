import { useMutation } from "@tanstack/react-query";
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
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusDot } from "@/components/StatusDot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, partOfDay, useWeekPlan } from "@/hooks/use-week-plan";
import { findOpportunities } from "@/lib/outreach";
import { parseShortDate } from "@/lib/plant-care";
import type { DayPlan } from "@/lib/planner";
import { plants, clients, projects, workers } from "@/lib/rootline-data";
import { draftOffers } from "@/lib/outreach.functions";
import { explainPlan, type ExplainPlanInput } from "@/lib/plan.functions";
import { taskActions } from "@/lib/task-store";
import type { Offer, OfferStatus, Plant, Task } from "@/lib/types";
import { overnightRainMm, primaryProject } from "@/lib/weather";

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

/** Next care date as YYYY-MM-DD ("Today" means today). */
function nextCareDate(plant: Plant, today: string) {
  if (plant.nextCare.toLowerCase() === "today") return today;
  const d = parseShortDate(plant.nextCare);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toStop(t: Task) {
  return {
    start: t.start,
    duration: t.duration,
    title: t.title,
    client: t.client,
    site: t.site,
    ...(t.weatherNote ? { weatherNote: t.weatherNote } : {}),
  };
}

function Dashboard() {
  const week = useWeekPlan();
  const { today, weekDates, weather, forecasts, strip, propose } = week;
  const todayDate = weekDates[today] ?? weekDates[0]!;

  const proposal = useMemo(() => propose(today), [propose, today]);
  const todayTasks = proposal.tasks.filter((t) => t.day === today);
  const approved = todayTasks.some((t) => t.approvedAt);
  const onShift = proposal.byWorker.filter((p) => p.stops.length > 0);
  const plannedHours = proposal.byWorker.reduce((sum, p) => sum + p.hours, 0);
  const weatherSkips = todayTasks.filter(
    (t) => t.status === "skipped" && t.weatherNote,
  ).length;

  const primary = primaryProject(projects);
  const primaryForecast = primary ? forecasts[primary.id] : undefined;
  const rainOvernight = primaryForecast
    ? Math.round(overnightRainMm(primaryForecast, todayDate))
    : null;

  const due = plants.filter((p) => nextCareDate(p, todayDate) <= todayDate);
  const overdue = due.filter((p) => nextCareDate(p, todayDate) < todayDate);
  const critical = plants.filter((p) => p.status === "critical");
  const plantsUnderCare = clients.reduce((sum, c) => sum + c.plants, 0);

  const opportunities = useMemo(
    () => findOpportunities({ plants, projects, clients, forecasts }, week.now),
    [forecasts, week.now],
  );
  const pipeline = opportunities.reduce((sum, o) => sum + o.value, 0);

  // ─── Plan approval ───────────────────────────────────────────────────────
  const [reviewing, setReviewing] = useState(false);
  const explanation = useMutation({
    mutationFn: (plan: ExplainPlanInput) => explainPlan({ data: plan }),
  });

  function openReview() {
    setReviewing(true);
    explanation.mutate({
      date: todayDate,
      weather: { tempC: strip[today]?.temp ?? null, note: strip[today]?.note ?? "" },
      workers: proposal.byWorker.map((p) => {
        const w = workers.find((x) => x.id === p.workerId);
        return {
          name: w?.name ?? p.workerId,
          role: w?.role ?? "",
          hours: p.hours,
          km: p.km,
          stops: p.stops.map(toStop),
          skipped: p.skipped.map(toStop),
        };
      }),
    });
  }

  function approvePlan() {
    const approvedAt = new Date().toISOString();
    taskActions.replace(todayTasks.map((t) => ({ ...t, approvedAt })));
    setReviewing(false);
    toast.success(`Today's plan approved for ${onShift.length} workers`);
  }

  // ─── Repeat-work offers ──────────────────────────────────────────────────
  const [offers, setOffers] = useState<Offer[]>([]);
  const [decisions, setDecisions] = useState<Record<string, OfferStatus>>({});
  const [offersOpen, setOffersOpen] = useState(false);
  const drafting = useMutation({
    mutationFn: () => draftOffers({ data: { opportunities } }),
    onSuccess: (drafts) => {
      setOffers(drafts);
      setDecisions({});
      setOffersOpen(true);
    },
    onError: (error) => toast.error(error.message),
  });

  async function decide(offer: Offer, status: OfferStatus) {
    setDecisions((d) => ({ ...d, [offer.id]: status }));
    if (status !== "approved") return;
    try {
      await navigator.clipboard.writeText(`${offer.subject}\n\n${offer.body}`);
      toast.success("Offer approved and copied — paste it into your email");
    } catch {
      toast.success("Offer approved — nothing is sent automatically");
    }
  }

  return (
    <AppShell
      title={`${formatDate(todayDate, { weekday: "long" })} ${partOfDay(week.now)}`}
      subtitle={`${formatDate(todayDate, { day: "numeric", month: "long" })} · ${onShift.length} workers on shift · ${plantsUnderCare} plants under care`}
      actions={
        <Button size="lg" disabled={approved} onClick={openReview}>
          {approved ? "Plan approved" : "Approve today's plan"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <Stat
          icon={Leaf}
          label="Plants needing care today"
          value={String(due.length)}
          hint={`${overdue.length} overdue`}
        />
        <Stat
          icon={CloudRain}
          label="Tasks skipped by weather"
          value={String(weatherSkips)}
          hint={
            rainOvernight === null
              ? weather.isPending
                ? "Loading forecast…"
                : "No forecast"
              : `${rainOvernight} mm rain overnight`
          }
        />
        <Stat
          icon={Clock}
          label="Planned hours today"
          value={String(plannedHours)}
          hint={`across ${onShift.length} workers`}
        />
        <Stat
          icon={TrendingUp}
          label="Repeat work ready to offer"
          value={`€${pipeline.toLocaleString("en-GB")}`}
          hint={`${opportunities.length} clients`}
        />
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">This week's weather, applied to the plan</CardTitle>
          {weather.data?.stale ? (
            <Badge variant="outline" className="text-status-attention">
              offline — forecast from{" "}
              {new Date(weather.data.fetchedAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          {weather.isPending ? (
            weekDates.map((d) => <Skeleton key={d} className="h-[104px] rounded-xl" />)
          ) : weather.isError ? (
            <p className="text-sm text-muted-foreground sm:col-span-5">
              {weather.error.message}. The plan shows no weather changes until the forecast
              loads.
            </p>
          ) : (
            strip.map((w, i) => {
              const Icon = weatherIcon[w.icon];
              return (
                <div
                  key={w.day}
                  className={`rounded-xl border bg-muted/40 p-3 ${i === today ? "border-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {w.day}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {formatDate(weekDates[i] ?? "")}
                      </span>
                    </span>
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">
                    {w.temp === null ? "—" : `${w.temp}°`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>
                </div>
              );
            })
          )}
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
            {proposal.byWorker.map((plan) => (
              <WorkerPlan key={plan.workerId} plan={plan} />
            ))}
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
              {opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing coming due in the next two weeks.
                </p>
              ) : (
                opportunities.map((o) => (
                  <div key={o.projectId} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{o.client}</p>
                      <p className="text-xs text-muted-foreground">{o.what}</p>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">€{o.value}</span>
                  </div>
                ))
              )}
              <Button
                variant="secondary"
                className="w-full"
                disabled={!opportunities.length || drafting.isPending}
                onClick={() => drafting.mutate()}
              >
                {drafting.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Drafting offers…
                  </>
                ) : (
                  "Draft offers"
                )}
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

      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Today's plan</DialogTitle>
            <DialogDescription>
              {onShift.length} workers · {plannedHours} h planned · {weatherSkips} skipped by
              weather
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5" /> Why this plan
            </p>
            {explanation.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : explanation.isError ? (
              <p className="text-muted-foreground">
                No explanation available: {explanation.error.message}
              </p>
            ) : (
              <p className="leading-relaxed">{explanation.data}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewing(false)}>
              Not yet
            </Button>
            <Button onClick={approvePlan}>Approve plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft offers</DialogTitle>
            <DialogDescription>
              Drafted by Claude from each client's plants and this week's weather. Nothing is
              sent — approve the ones you want and send them from your email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {offers.map((offer) => {
              const decision = decisions[offer.id] ?? offer.status;
              const client = clients.find((c) => c.id === offer.clientId);
              return (
                <div key={offer.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{offer.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {client?.name} · {client?.contact} · €{offer.value}
                      </p>
                    </div>
                    {decision !== "draft" ? (
                      <Badge
                        variant="outline"
                        className={
                          decision === "approved" ? "text-status-healthy" : "text-muted-foreground"
                        }
                      >
                        {decision}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
                    {offer.body}
                  </p>
                  {decision === "draft" ? (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => decide(offer, "dismissed")}>
                        Dismiss
                      </Button>
                      <Button size="sm" onClick={() => decide(offer, "approved")}>
                        Approve
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function WorkerPlan({ plan }: { plan: DayPlan }) {
  const worker = workers.find((w) => w.id === plan.workerId);
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{worker?.name ?? plan.workerId}</p>
        <span className="text-xs text-muted-foreground">
          {plan.hours} h · {plan.stops.length} stops
          {plan.km > 0 ? ` · ${plan.km} km` : ""}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {plan.stops.length === 0 && plan.skipped.length === 0 ? (
          <li className="text-sm text-muted-foreground">No tasks — available</li>
        ) : null}
        {plan.stops.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="tabular-nums text-muted-foreground">
              {String(t.start).padStart(2, "0")}:00
            </span>
            <span>{t.title}</span>
            <span className="text-muted-foreground">· {t.client}</span>
            {t.weatherNote ? (
              <Badge variant="outline" className="text-status-attention">
                {t.weatherNote}
              </Badge>
            ) : null}
            {t.status === "done" ? <CheckCircle2 className="size-4 text-status-healthy" /> : null}
          </li>
        ))}
        {plan.skipped.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="line-through">{t.title}</span>
            <span>· {t.client}</span>
            <Badge variant="outline" className="text-status-attention">
              {t.weatherNote ?? "skipped"}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
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
