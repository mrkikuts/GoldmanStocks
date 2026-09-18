import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Camera, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PlantCalendar } from "@/components/PlantCalendar";
import { StatusDot } from "@/components/StatusDot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPlants } from "@/lib/api/plants";
import { listProjects } from "@/lib/api/projects";
import { listWorkers } from "@/lib/api/workers";
import { type Plant } from "@/lib/rootline-data";

export const Route = createFileRoute("/plants")({
  head: () => ({
    meta: [
      { title: "Plant & area register — Goldman Stocks" },
      {
        name: "description",
        content:
          "Every tree, hedge, lawn and flower bed by project, with ID, species, care schedule and history.",
      },
      {
        property: "og:title",
        content: "Plant & area register — Goldman Stocks",
      },
      {
        property: "og:description",
        content:
          "Searchable register of every managed plant and area, grouped by project.",
      },
    ],
  }),
  loader: async () => {
    const [plants, projects, workers] = await Promise.all([
      listPlants(),
      listProjects(),
      listWorkers(),
    ]);
    return { plants, projects, workers };
  },
  component: Plants,
});

const filters = [
  "All",
  "Tree",
  "Hedge",
  "Lawn",
  "Flower bed",
  "Shrub",
] as const;

function Plants() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof filters)[number]>("All");
  const [openPlant, setOpenPlant] = useState<Plant | null>(null);

  const { plants, projects, workers } = Route.useLoaderData();

  // Crew names per project, derived from the worker list — a query inside the render loop
  // below would break the rules of hooks.
  const workerNameById = useMemo(
    () => new Map(workers.map((w) => [w.id, w.name])),
    [workers],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .map((project) => ({
        project,
        rows: plants.filter((p) => {
          if (p.projectId !== project.id) return false;
          if (kind !== "All" && p.kind !== kind) return false;
          if (!q) return true;
          return [
            p.id,
            p.species,
            p.common,
            p.client,
            p.site,
            project.name,
          ].some((v) => v.toLowerCase().includes(q));
        }),
      }))
      .filter((g) => g.rows.length > 0);
  }, [query, kind, plants, projects]);

  return (
    <AppShell
      title="Plants & areas"
      subtitle={`${plants.length} registered items across ${projects.length} projects`}
      actions={
        <Button
          onClick={() => toast("Open the worker app to add a plant by photo")}
        >
          <Camera className="size-4" /> Add by photo
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, species, project…"
            className="pl-9"
          />
        </div>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setKind(f)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              kind === f
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {groups.map(({ project, rows }) => {
          const crew = project.workerIds.flatMap((id) => {
            const name = workerNameById.get(id);
            return name ? [{ id, name }] : [];
          });
          return (
            <Card key={project.id} className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rows.length} items · crew{" "}
                      {crew.map((w) => w.name.split(" ")[0]).join(", ")}
                    </p>
                  </div>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <MapPin className="size-4" /> View map
                  </Link>
                </div>
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
                      <TableHead>Last care</TableHead>
                      <TableHead>Next task</TableHead>
                      <TableHead className="text-right">Calendar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.id}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{p.common}</p>
                          <p className="text-xs italic text-muted-foreground">
                            {p.species}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.kind}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.site}</TableCell>
                        <TableCell>
                          <StatusDot status={p.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.lastCare}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{p.nextTask}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.nextCare}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenPlant(p)}
                            aria-label={`Open care calendar for ${p.common}`}
                          >
                            <CalendarDays className="size-4" /> Calendar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
        {groups.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nothing matches that search.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog
        open={Boolean(openPlant)}
        onOpenChange={(o) => (o ? null : setOpenPlant(null))}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {openPlant ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {openPlant.common}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {openPlant.id}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {openPlant.species} · {openPlant.client} · {openPlant.site}
                </DialogDescription>
              </DialogHeader>
              <PlantCalendar plant={openPlant} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
