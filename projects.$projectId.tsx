import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PlantMap } from "@/components/PlantMap";
import { StatusDot } from "@/components/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProject,
  projectPlants,
  projectTasks,
  projectWorkers,
  weekDays,
} from "@/lib/rootline-data";

export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ params }) => {
    const project = getProject(params.projectId);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    const name = loaderData ? loaderData.project.name : "Project";
    return {
      meta: [
        { title: `${name} — Rootline` },
        {
          name: "description",
          content: `Site map, plant register and assigned crew for ${name}.`,
        },
        { property: "og:title", content: `${name} — Rootline` },
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
  const { project } = Route.useLoaderData();
  const plants = projectPlants(project.id);
  const crew = projectWorkers(project.id);
  const tasks = projectTasks(project.id);

  return (
    <AppShell
      title={project.name}
      subtitle={`${project.client} · ${project.address}`}
      actions={
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All projects
        </Link>
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
            <PlantMap plants={plants} />
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
                      {w.isLead ? <Badge variant="secondary">Lead</Badge> : null}
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
                <p className="text-sm text-muted-foreground">No visits planned this week.</p>
              ) : (
                tasks.map((t) => {
                  const worker = crew.find((w) => w.id === t.workerId);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {weekDays[t.day]} {t.start}:00 · {worker?.name ?? "Unassigned"}
                        </p>
                      </div>
                      <Badge variant={t.status === "skipped" ? "outline" : "secondary"}>
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
                <p className="font-medium">€{project.monthlyValue.toLocaleString("en-US")}</p>
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

      <Card className="mt-4 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plants & areas in this project</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Plant / area</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next task</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                  <TableCell>
                    <p className="font-medium">{p.common}</p>
                    <p className="text-xs italic text-muted-foreground">{p.species}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.site}</TableCell>
                  <TableCell>
                    <StatusDot status={p.status} />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{p.nextTask}</p>
                    <p className="text-xs text-muted-foreground">{p.nextCare}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
