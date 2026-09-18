import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Leaf,
  LayoutDashboard,
  Map,
  Users,
  HardHat,
  Sprout,
} from "lucide-react";
import type { ReactNode } from "react";

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
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-accent">
            <Sprout className="size-5 text-sidebar-primary" />
          </span>
          <div>
            <p className="font-display text-lg leading-none">Rootline</p>
            <p className="text-xs text-sidebar-foreground/60">Kikuts Haljastus OÜ</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-sidebar-accent/60 p-3 text-xs text-sidebar-foreground/80">
          <p className="font-medium text-sidebar-primary">AI plan ready</p>
          <p className="mt-1">Today's routes for 4 workers are waiting for your approval.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
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
                className="rounded-full border px-3 py-1.5 text-xs whitespace-nowrap data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
