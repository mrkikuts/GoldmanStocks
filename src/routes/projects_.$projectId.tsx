import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { PlantDialog } from "@/components/forms/PlantDialog";
import {
  PlantCalendarDialog,
  PlantTableSection,
} from "@/components/PlantTable";
import { SiteDialog } from "@/components/forms/SiteDialog";
import { SiteMap } from "@/components/map";
import { StatusDot } from "@/components/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listClients } from "@/lib/api/clients";
import { projectPlants } from "@/lib/api/plants";
import { getProject, listProjects, projectWorkers } from "@/lib/api/projects";
import { listWorkers } from "@/lib/api/workers";
import { projectTasks } from "@/lib/api/tasks";
import { weekDays } from "@/lib/labels";
import { inWeek } from "@/lib/task-schedule";
import type { Plant } from "@/lib/types";
import { planWeekDates } from "@/lib/weather";

export const Route = createFileRoute("/projects_/$projectId")({
  loader: async ({ params }) => {
    const project = await getProject({ data: params.projectId });
    if (!project) throw notFound();
    const [plants, crew, tasks, clients, workers, projects] = await Promise.all(
      [
        projectPlants({ data: params.projectId }),
        projectWorkers({ data: params.projectId }),
        projectTasks({ data: params.projectId }),
        listClients(),
        listWorkers(),
        listProjects(),
      ],
    );
    return { project, plants, crew, tasks, clients, workers, projects };
  },
  head: ({ loaderData }) => {
    const name = loaderData ? loaderData.project.name : "Project";
    return {
      meta: [
        { title: `${name} — Goldman Stocks` },
        {
          name: "description",
          content: `Site map, plant register and assigned crew for ${name}.`,
        },
        { property: "og:title", content: `${name} — Goldman Stocks` },
        {
          property: "og:description",
          content: `Site map, plant register and assigned crew for ${name}.`,
        },
      ],
    };
  },
  notFoundComponent: ProjectNotFound,
  component: ProjectDetail,
});

function ProjectNotFound() {
  return (
    <AppShell title="Project not found">
      <Link to="/projects" className="text-sm text-primary hover:underline">
        Back to projects
      </Link>
    </AppShell>
  );
}

function ProjectDetail() {
  const {
    project,
    plants,
    crew,
    tasks: allTasks,
    clients,
    workers,
    projects,
  } = Route.useLoaderData();
  const [editingSite, setEditingSite] = useState(false);
  const [addingPlant, setAddingPlant] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [openPlant, setOpenPlant] = useState<Plant | null>(null);
  // "This week" below means exactly that — a job dated in a future month is not a visit yet.
  const weekDates = useMemo(() => planWeekDates(new Date()), []);
  const tasks = useMemo(
    () => allTasks.filter((t) => inWeek(t, weekDates)),
    [allTasks, weekDates],
  );

  return (
    <AppShell
      title={project.name}
      subtitle={`${project.client} · ${project.address}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All projects
          </Link>
          <Button variant="outline" onClick={() => setEditingSite(true)}>
            <Pencil className="size-4" /> Edit site
          </Button>
          <Button onClick={() => setAddingPlant(true)}>
            <Plus className="size-4" /> Register plant here
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" /> Site map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SiteMap project={project} plants={plants} height={440} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Crew assigned</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {crew.map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <span
                    className="size-8 shrink-0 rounded-full"
                    style={{ backgroundColor: w.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {w.name}
                      {w.isLead ? (
                        <Badge variant="secondary">Lead</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.role} · speaks {w.language}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{w.tasksThisWeek} tasks</p>
                    <p>{w.hoursThisWeek} h this week</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" /> This week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No visits planned this week.
                </p>
              ) : (
                tasks.map((t) => {
                  const worker = crew.find((w) => w.id === t.workerId);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {weekDays[t.day]} {t.start}:00 ·{" "}
                          {worker?.name ?? "Unassigned"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          t.status === "skipped" ? "outline" : "secondary"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="grid grid-cols-2 gap-3 pt-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Monthly value</p>
                <p className="font-medium">
                  €{project.monthlyValue.toLocaleString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Visits / month</p>
                <p className="font-medium">{project.visitsPerMonth}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contract until</p>
                <p className="font-medium">{project.contractUntil}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusDot status={project.status} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <PlantTableSection
          title="Plants & areas in this project"
          crew={crew.map((w) => w.name)}
          rows={plants}
          footerLabel={project.name}
          action={
            <button
              type="button"
              onClick={() => setAddingPlant(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" /> Register plant
            </button>
          }
          onOpenCalendar={setOpenPlant}
          onEdit={setEditingPlant}
        />
      </div>
      <SiteDialog
        site={project}
        clients={clients}
        workers={workers}
        open={editingSite}
        onOpenChange={setEditingSite}
      />
      <PlantDialog
        projects={projects}
        defaultProjectId={project.id}
        open={addingPlant}
        onOpenChange={setAddingPlant}
      />
      <PlantDialog
        plant={editingPlant ?? undefined}
        projects={projects}
        open={Boolean(editingPlant)}
        onOpenChange={(open) => (open ? null : setEditingPlant(null))}
      />
      <PlantCalendarDialog
        plant={openPlant}
        onClose={() => setOpenPlant(null)}
      />
    </AppShell>
  );
}
