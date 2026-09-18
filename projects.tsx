import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Leaf, MapPin, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StatusDot } from "@/components/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projectPlants, projectWorkers, projects } from "@/lib/rootline-data";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Goldman Stocks" },
      {
        name: "description",
        content:
          "Every maintenance project with its plants, site map, assigned crew and contract value.",
      },
      { property: "og:title", content: "Projects — Goldman Stocks" },
      {
        property: "og:description",
        content: "Group plants and areas by project, with a site map and the crew assigned to it.",
      },
    ],
  }),
  component: Projects,
});

function Projects() {
  return (
    <AppShell
      title="Projects"
      subtitle={`${projects.length} active maintenance projects`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => {
          const plants = projectPlants(project.id);
          const crew = projectWorkers(project.id);
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
                    <p className="text-xs text-muted-foreground">Plants & areas</p>
                    <p className="font-medium">{plants.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Visits / month</p>
                    <p className="font-medium">{project.visitsPerMonth}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly value</p>
                    <p className="font-medium">€{project.monthlyValue.toLocaleString("en-US")}</p>
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
