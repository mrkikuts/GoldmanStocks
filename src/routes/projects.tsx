import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Leaf, MapPin, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StatusDot } from "@/components/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPlants } from "@/lib/api/plants";
import { listProjects } from "@/lib/api/projects";
import { listWorkers } from "@/lib/api/workers";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Rootline" },
      {
        name: "description",
        content:
          "Every maintenance project with its plants, site map, assigned crew and contract value.",
      },
      { property: "og:title", content: "Projects — Rootline" },
      {
        property: "og:description",
        content:
          "Group plants and areas by project, with a site map and the crew assigned to it.",
      },
    ],
  }),
  loader: async () => {
    const [projects, allPlants, workers] = await Promise.all([
      listProjects(),
      listPlants(),
      listWorkers(),
    ]);
    return { projects, allPlants, workers };
  },
  component: Projects,
});

function Projects() {
  const { projects, allPlants, workers } = Route.useLoaderData();

  // Counts and crew names are derived here rather than per-project queries, which would mean
  // calling hooks inside the render loop below.
  const plantCountByProject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const plant of allPlants) {
      counts.set(plant.projectId, (counts.get(plant.projectId) ?? 0) + 1);
    }
    return counts;
  }, [allPlants]);
  const workerNameById = useMemo(
    () => new Map(workers.map((w) => [w.id, w.name])),
    [workers],
  );

  return (
    <AppShell
      title="Projects"
      subtitle={`${projects.length} active maintenance projects`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => {
          const plantCount = plantCountByProject.get(project.id) ?? 0;
          const crew = project.workerIds.flatMap((id) => {
            const name = workerNameById.get(id);
            return name ? [{ id, name }] : [];
          });
          return (
            <Card key={project.id} className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" /> {project.address}
                    </p>
                  </div>
                  <StatusDot status={project.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {project.zones.map((zone) => (
                    <Badge key={zone} variant="secondary">
                      {zone}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Plants & areas
                    </p>
                    <p className="font-medium">{plantCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Visits / month
                    </p>
                    <p className="font-medium">{project.visitsPerMonth}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Monthly value
                    </p>
                    <p className="font-medium">
                      €{project.monthlyValue.toLocaleString("en-US")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {crew.map((w) => w.name.split(" ")[0]).join(", ")}
                  </span>
                </div>

                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Leaf className="size-4" /> Open project map
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
