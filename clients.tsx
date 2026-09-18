import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { clients } from "@/lib/rootline-data";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Rootline" },
      {
        name: "description",
        content:
          "Client list with sites, plants under care, hours spent this month and contract renewals.",
      },
      { property: "og:title", content: "Clients — Rootline" },
      {
        property: "og:description",
        content: "See which clients are profitable and which eat hours, site by site.",
      },
    ],
  }),
  component: Clients,
});

const healthStyles = {
  good: "text-status-healthy",
  watch: "text-status-attention",
  "at risk": "text-status-critical",
} as const;

function Clients() {
  const maxHours = Math.max(...clients.map((c) => c.hoursThisMonth));
  const revenue = clients.reduce((s, c) => s + c.monthlyValue, 0);

  return (
    <AppShell
      title="Clients"
      subtitle={`${clients.length} maintenance contracts · €${revenue.toLocaleString("en-GB")} per month`}
      actions={
        <Button onClick={() => toast("Client onboarding starts with mapping the first site")}>
          <Plus className="size-4" /> New client
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {clients.map((c) => (
          <Card key={c.id} className="shadow-card">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.city} · {c.sites} sites · {c.plants} plants
                </p>
              </div>
              <Badge variant="outline" className={healthStyles[c.health]}>
                {c.health}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Field label="Contact" value={c.contact} />
                <Field label="Monthly value" value={`€${c.monthlyValue}`} />
                <Field label="Contract until" value={c.contractUntil} />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hours this month</span>
                  <span className="font-medium">{c.hoursThisMonth} h</span>
                </div>
                <Progress value={(c.hoursThisMonth / maxHours) * 100} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  €{Math.round(c.monthlyValue / c.hoursThisMonth)} per hour worked
                </p>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => toast.success(`Monthly photo report for ${c.name} generated`)}
              >
                <FileText className="size-4" /> Monthly report with photos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
