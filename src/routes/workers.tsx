import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTasks } from "@/lib/api/tasks";
import { listWorkers } from "@/lib/api/workers";
import { weekDays } from "@/lib/rootline-data";

export const Route = createFileRoute("/workers")({
  head: () => ({
    meta: [
      { title: "Workers — Goldman Stocks" },
      {
        name: "description",
        content:
          "Crew overview: planned hours per worker this week, languages and worker app invites.",
      },
      { property: "og:title", content: "Workers — Goldman Stocks" },
      {
        property: "og:description",
        content: "Crew overview with weekly workload and worker app access.",
      },
    ],
  }),
  loader: async () => {
    const [workers, tasks] = await Promise.all([listWorkers(), listTasks()]);
    return { workers, tasks };
  },
  component: Workers,
});

function Workers() {
  const { workers, tasks } = Route.useLoaderData();

  return (
    <AppShell
      title="Workers"
      subtitle="Crew of 4 · worker app in Estonian, Latvian and English"
      actions={
        <Button
          onClick={() =>
            toast.success("Invite link copied — send it to the new worker")
          }
        >
          <UserPlus className="size-4" /> Invite worker
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {workers.map((w) => {
          const own = tasks.filter((t) => t.workerId === w.id);
          const hours = own.reduce((s, t) => s + t.duration, 0);
          const done = own.filter((t) => t.status === "done").length;
          return (
            <Card key={w.id} className="shadow-card">
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      background: `color-mix(in oklab, ${w.color} 20%, white)`,
                      color: w.color,
                    }}
                  >
                    {w.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <div>
                    <CardTitle className="text-base">{w.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{w.role}</p>
                  </div>
                </div>
                <Badge variant="secondary">{w.language}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Planned hours
                    </p>
                    <p className="font-medium">{hours} h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Tasks this week
                    </p>
                    <p className="font-medium">{own.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Proven with photo
                    </p>
                    <p className="font-medium">{done}</p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {weekDays.map((d, i) => {
                    const dayHours = own
                      .filter((t) => t.day === i)
                      .reduce((s, t) => s + t.duration, 0);
                    return (
                      <div key={d} className="flex-1 text-center">
                        <div className="flex h-16 items-end justify-center rounded-md bg-muted/60 p-1">
                          <div
                            className="w-full rounded"
                            style={{
                              height: `${Math.min(100, (dayHours / 8) * 100)}%`,
                              background: w.color,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {d}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    toast(`Today's list sent to ${w.name}'s phone`)
                  }
                >
                  <Smartphone className="size-4" /> Send today's list
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
