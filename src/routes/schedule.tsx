import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Cloud,
  CloudRain,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, useWeekPlan } from "@/hooks/use-week-plan";
import { useTaskActions } from "@/hooks/use-tasks";
import { projects, weekDays, workers, type Task } from "@/lib/rootline-data";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Crew schedule — Goldman Stocks" },
      {
        name: "description",
        content:
          "Review and edit the AI-generated day plan for every worker, then approve it for the worker app.",
      },
      { property: "og:title", content: "Crew schedule — Goldman Stocks" },
      {
        property: "og:description",
        content:
          "Weekly and daily crew calendars you can edit before approving.",
      },
    ],
  }),
  component: Schedule,
});

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const ROW = 56;
const START = 7;
const weatherIcon = { rain: CloudRain, cloud: Cloud, sun: Sun } as const;
const KINDS: Task["kind"][] = [
  "Watering",
  "Clipping",
  "Mowing",
  "Planting",
  "Inspection",
  "Feeding",
];

function Schedule() {
  const taskActions = useTaskActions();
  const week = useWeekPlan();
  const { weekDates, strip, weather } = week;
  // tasks as the plan stands: stored tasks with the live weather rules applied
  const tasks = week.adjusted;
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(week.today);
  const [active, setActive] = useState<string | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const crew =
    active === "all" ? workers : workers.filter((w) => w.id === active);
  const dayTasks = tasks.filter((t) => t.day === day);
  const editing = tasks.find((t) => t.id === editingId) ?? null;
  const isApproved = (d: number) =>
    tasks.some((t) => t.day === d && t.approvedAt);
  const days = view === "day" ? [day] : weekDays.map((_, i) => i);
  const DayIcon = weatherIcon[strip[day]?.icon ?? "cloud"];

  function approve() {
    const approvedAt = new Date().toISOString();
    taskActions.replace(
      tasks
        .filter((t) => days.includes(t.day))
        .map((t) => ({ ...t, approvedAt })),
    );
    toast.success(
      view === "day" ? `${weekDays[day]} plan approved` : "Week plan approved",
    );
  }

  function replan() {
    const open = days.filter((d) => !isApproved(d));
    let changed = 0;
    for (const d of open) {
      const planned = week.propose(d).tasks.filter((t) => t.day === d);
      changed += planned.filter((t) => {
        const before = tasks.find((o) => o.id === t.id);
        return before?.workerId !== t.workerId || before.start !== t.start;
      }).length;
      taskActions.replace(planned);
    }
    toast.success(
      open.length === 0
        ? "Already approved — nothing to re-plan"
        : changed === 0
          ? "The plan is already optimal"
          : `Re-planned: ${changed} ${changed === 1 ? "job" : "jobs"} moved or reassigned`,
    );
  }

  return (
    <AppShell
      title="Crew schedule"
      subtitle="Generated each morning from plant schedules and weather — edit anything before you approve"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Add task
          </Button>
          <Button variant="outline" onClick={replan}>
            <Sparkles className="size-4" /> Plan with AI
          </Button>
          <Button onClick={approve} disabled={days.every(isApproved)}>
            <Check className="size-4" /> Approve{" "}
            {view === "day" ? "day" : "week"}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="mx-1 h-6 w-px bg-border" />
        <FilterChip
          label="All workers"
          active={active === "all"}
          onClick={() => setActive("all")}
        />
        {workers.map((w) => (
          <FilterChip
            key={w.id}
            label={w.name}
            color={w.color}
            active={active === w.id}
            onClick={() => setActive(w.id)}
          />
        ))}
      </div>

      {view === "day" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {weekDays.map((d, i) => (
              <button
                key={d}
                onClick={() => setDay(i)}
                className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                  day === i ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <span className="font-medium">{d}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {formatDate(weekDates[i] ?? "")}
                </span>
                {isApproved(i) ? (
                  <Check className="ml-1 inline size-3.5 text-status-healthy" />
                ) : null}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              {weather.isPending ? (
                "Loading forecast…"
              ) : weather.isError ? (
                "Weather unavailable — no weather changes applied"
              ) : (
                <>
                  <DayIcon className="size-4" />
                  {strip[day]?.temp === null
                    ? "No forecast"
                    : `${strip[day]?.temp}°C`}{" "}
                  · {strip[day]?.note}
                </>
              )}
            </span>
          </div>

          <Card className="overflow-hidden shadow-card">
            <CardContent className="overflow-x-auto p-0">
              <div style={{ minWidth: 200 + crew.length * 180 }}>
                <div
                  className="grid border-b bg-muted/40"
                  style={{
                    gridTemplateColumns: `64px repeat(${crew.length}, 1fr)`,
                  }}
                >
                  <div />
                  {crew.map((w) => (
                    <div key={w.id} className="border-l px-3 py-2">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: w.color }}
                        />
                        {w.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayTasks
                          .filter((t) => t.workerId === w.id)
                          .reduce((s, t) => s + t.duration, 0)}{" "}
                        h planned
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `64px repeat(${crew.length}, 1fr)`,
                  }}
                >
                  <HourColumn />
                  {crew.map((w) => (
                    <div key={w.id} className="relative border-l">
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          style={{ height: ROW }}
                          className="border-b"
                        />
                      ))}
                      {dayTasks
                        .filter((t) => t.workerId === w.id)
                        .map((t) => (
                          <TaskBlock
                            key={t.id}
                            task={t}
                            onClick={() => setEditingId(t.id)}
                          />
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> Tap any job to change the worker,
            time, length or status.
          </p>
        </>
      ) : (
        <Card className="overflow-hidden shadow-card">
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b bg-muted/40">
                <div />
                {weekDays.map((d, i) => (
                  <div key={d} className="border-l px-3 py-2">
                    <p className="text-sm font-medium">
                      {d}
                      {isApproved(i) ? (
                        <Check className="ml-1 inline size-3.5 text-status-healthy" />
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(weekDates[i] ?? "")} · {strip[i]?.temp ?? "—"}
                      °
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[64px_repeat(5,1fr)]">
                <HourColumn />
                {weekDays.map((d, dayIndex) => (
                  <div key={d} className="relative border-l">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{ height: ROW }}
                        className="border-b"
                      />
                    ))}
                    {tasks
                      .filter(
                        (t) =>
                          t.day === dayIndex &&
                          (active === "all" || t.workerId === active),
                      )
                      .map((t) => (
                        <TaskBlock
                          key={t.id}
                          task={t}
                          onClick={() => setEditingId(t.id)}
                        />
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <TaskDialog
        task={editing}
        open={Boolean(editing)}
        onClose={() => setEditingId(null)}
      />
      <NewTaskDialog
        open={creating}
        day={day}
        onClose={() => setCreating(false)}
      />
    </AppShell>
  );
}

function HourColumn() {
  return (
    <div>
      {HOURS.map((h) => (
        <div
          key={h}
          style={{ height: ROW }}
          className="border-b pr-2 text-right text-xs text-muted-foreground tabular-nums"
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

function TaskBlock({ task, onClick }: { task: Task; onClick: () => void }) {
  const worker = workers.find((w) => w.id === task.workerId);
  const color = worker?.color ?? "var(--chart-1)";
  return (
    <button
      onClick={onClick}
      style={{
        top: (task.start - START) * ROW + 3,
        height: task.duration * ROW - 6,
        borderLeftColor: color,
        backgroundColor: `color-mix(in oklab, ${color} 12%, white)`,
      }}
      className={`absolute inset-x-1.5 overflow-hidden rounded-lg border border-l-4 px-2 py-1.5 text-left transition-shadow hover:shadow-card ${
        task.status === "skipped" ? "opacity-60 line-through" : ""
      }`}
    >
      <p className="truncate text-xs font-semibold">{task.title}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {task.client}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {task.site}
      </p>
      {task.weatherNote ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-status-attention">
          <CloudRain className="size-3 shrink-0" />
          <span className="truncate">{task.weatherNote}</span>
        </p>
      ) : null}
      {task.status === "done" ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-status-healthy">
          <Check className="size-3" /> photo proof added
        </p>
      ) : null}
    </button>
  );
}

function TaskDialog({
  task,
  open,
  onClose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}) {
  const taskActions = useTaskActions();
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            {task.client} · {task.site}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Job</Label>
            <Input
              value={task.title}
              onChange={(e) =>
                taskActions.update(task.id, { title: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Worker</Label>
            <Select
              value={task.workerId}
              onValueChange={(v) =>
                taskActions.update(task.id, { workerId: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} · {w.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Day</Label>
              <Select
                value={String(task.day)}
                onValueChange={(v) =>
                  taskActions.update(task.id, { day: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start</Label>
              <Select
                value={String(task.start)}
                onValueChange={(v) =>
                  taskActions.update(task.id, { start: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Hours</Label>
              <Select
                value={String(task.duration)}
                onValueChange={(v) =>
                  taskActions.update(task.id, { duration: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={task.status}
              onValueChange={(v) =>
                taskActions.update(task.id, { status: v as Task["status"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              taskActions.remove(task.id);
              onClose();
              toast("Job removed from the plan");
            }}
          >
            <Trash2 className="size-4" /> Remove job
          </Button>
          <Button
            onClick={() => {
              onClose();
              toast.success("Changes saved to the day plan");
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewTaskDialog({
  open,
  day,
  onClose,
}: {
  open: boolean;
  day: number;
  onClose: () => void;
}) {
  const taskActions = useTaskActions();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "p1");
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "w1");
  const [start, setStart] = useState("8");
  const [duration, setDuration] = useState("2");
  const [kind, setKind] = useState<Task["kind"]>("Watering");

  const project = projects.find((p) => p.id === projectId);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a job</DialogTitle>
          <DialogDescription>
            It lands on {weekDays[day]} and appears in the worker's list once
            you approve the day.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Job</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hedge clipping"
            />
          </div>
          <div className="grid gap-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Worker</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Start</Label>
              <Select value={start} onValueChange={setStart}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Hours</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as Task["kind"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              taskActions.add({
                title: title.trim(),
                projectId,
                client: project?.client ?? "",
                site: project?.zones[0] ?? "",
                workerId,
                day,
                start: Number(start),
                duration: Number(duration),
                kind,
                status: "planned",
              });
              setTitle("");
              onClose();
              toast.success("Job added to the plan");
            }}
          >
            Add job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted"
      }`}
    >
      {color ? (
        <span className="size-2.5 rounded-full" style={{ background: color }} />
      ) : null}
      {label}
    </button>
  );
}
