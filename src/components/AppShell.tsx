import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Leaf,
  LayoutDashboard,
  Map,
  Users,
  HardHat,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";

import logoAsset from "@/assets/goldman-stocks-logo.png.asset.json";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/projects", label: "Projects", icon: Map },
  { to: "/plants", label: "Plants & areas", icon: Leaf },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/workers", label: "Workers", icon: HardHat },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-2">
          <img
            src={logoAsset.url}
            alt="Goldman Stocks logo"
            className="size-9 rounded-lg object-cover shadow-sm"
          />
          <div>
            <p className="font-display text-xl font-bold leading-none text-primary">Goldman Stocks</p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">Landscape management</p>
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-primary"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <Link
            to="/mobile"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-primary"
          >
            <Smartphone className="size-4" />
            Worker app
          </Link>
          <div className="rounded-lg border border-accent/20 bg-accent/10 p-4 text-xs text-foreground">
            <p className="font-semibold text-accent-foreground">AI plan ready</p>
            <p className="mt-1">Today's routes for 4 workers are waiting for your approval.</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-6 lg:px-10">
            <div>
              <h1 className="text-3xl font-bold text-primary">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {actions}
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-6 py-7 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
