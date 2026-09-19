import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Printer,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currentMonth, MonthParam, monthShift } from "@/lib/month";
import { clientReport } from "@/lib/reports.functions";

/**
 * The monthly photo report: one row per picture uploaded that month, with the plant it was
 * taken against, the work done, who did it and when.
 *
 * The trailing `_` in the filename keeps this out of `clients.tsx`, which has no `<Outlet />`.
 * The URL is unchanged: /clients/:clientId/report.
 */
export const Route = createFileRoute("/clients_/$clientId/report")({
  // The first search param in the app. A hand-typed `?month=banana` falls back to this month
  // rather than failing the route.
  validateSearch: (search: { month?: string }) => ({
    month: MonthParam.parse(search.month),
  }),
  // Without loaderDeps the loader does not re-run when only the search param changes, and
  // stepping between months would quietly show the previous month's rows.
  loaderDeps: ({ search: { month } }) => ({ month }),
  loader: async ({ params, deps }) => {
    const report = await clientReport({
      data: { clientId: params.clientId, month: deps.month },
    });
    if (!report) throw notFound();
    return report;
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.client.name} — ${loaderData.monthLabel} photo report`
      : "Photo report";
    return {
      meta: [
        { title: `${title} — Goldman Stocks` },
        {
          name: "description",
          content:
            "Every photo uploaded for this client in the month, with the plant, the work done, the worker and the date.",
        },
      ],
    };
  },
  notFoundComponent: ReportNotFound,
  component: ClientReportPage,
});

function ReportNotFound() {
  return (
    <AppShell title="Client not found">
      <Link to="/clients" className="text-sm text-primary hover:underline">
        Back to clients
      </Link>
    </AppShell>
  );
}

function ClientReportPage() {
  const report = Route.useLoaderData();
  const { month } = Route.useSearch();
  const { clientId } = Route.useParams();
  const atCurrentMonth = month >= currentMonth();

  const photos = report.rows.length;
  const subtitle = [
    `Photo report · ${report.monthLabel}`,
    photos === 1 ? "1 photo" : `${photos} photos`,
  ].join(" · ");

  return (
    <AppShell
      title={report.client.name}
      subtitle={subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/clients">
              <ArrowLeft className="size-4" /> Clients
            </Link>
          </Button>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon">
              <Link
                to="/clients/$clientId/report"
                params={{ clientId }}
                search={{ month: monthShift(month, -1) }}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {report.monthLabel}
            </span>
            {atCurrentMonth ? (
              // Nothing can have been photographed in a month that hasn't happened.
              <Button
                variant="outline"
                size="icon"
                disabled
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button asChild variant="outline" size="icon">
                <Link
                  to="/clients/$clientId/report"
                  params={{ clientId }}
                  search={{ month: monthShift(month, 1) }}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
      }
    >
      {report.unsignedPhotos > 0 ? (
        <p className="mb-4 rounded-lg border border-status-attention/30 bg-status-attention/10 px-4 py-2 text-sm">
          {report.unsignedPhotos} photo
          {report.unsignedPhotos === 1 ? "" : "s"} could not be loaded from
          storage. The rows below still record that the work was done.
        </p>
      ) : null}

      <Card className="shadow-card print:border-0 print:shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Photo</TableHead>
                <TableHead className="w-40">Date</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Work done</TableHead>
                <TableHead className="w-40">Worker</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.id} className="break-inside-avoid">
                  <TableCell>
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noreferrer">
                        <img
                          src={row.url}
                          alt={`${row.work} at ${row.siteName}`}
                          loading="eager"
                          className="h-16 w-24 rounded-md border object-cover"
                        />
                      </a>
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground">
                        unavailable
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{row.dayLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.takenTime}
                      {row.mapUrl ? (
                        <>
                          {" · "}
                          <a
                            href={row.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          >
                            <MapPin className="size-3" />
                            map
                          </a>
                        </>
                      ) : null}
                    </p>
                  </TableCell>
                  <TableCell>
                    {/* Tasks are rarely tied to one plant, so the zone is what locates the work. */}
                    <p className="font-medium">{row.plantName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.siteName} · {row.area}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{row.work}</p>
                    <p className="text-xs text-muted-foreground">{row.kind}</p>
                  </TableCell>
                  <TableCell>{row.workerName}</TableCell>
                </TableRow>
              ))}

              {report.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No photos were uploaded in {report.monthLabel}. A row
                    appears here each time a worker finishes a job with a photo
                    in the worker app.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        {report.client.name} · {report.client.city} · {report.client.contact} ·
        generated {report.generatedOn}
      </p>
    </AppShell>
  );
}
