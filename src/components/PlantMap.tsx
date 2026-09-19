import { useState } from "react";

import { statusLabel } from "@/lib/labels";
import type { Plant } from "@/lib/types";

const statusColor: Record<Plant["status"], string> = {
  healthy: "var(--status-healthy)",
  attention: "var(--status-attention)",
  critical: "var(--status-critical)",
};

export function PlantMap({ plants }: { plants: Plant[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = plants.find((p) => p.id === selected) ?? null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border bg-muted/40">
        <svg className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M40 0H0V40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-border"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6" />
          <path
            d="M0 78 Q 25 68, 50 76 T 100 70"
            transform="scale(1,1)"
            fill="none"
            stroke="currentColor"
            strokeWidth="0"
          />
        </svg>

        {plants.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id === selected ? null : p.id)}
            aria-label={`${p.common} — ${statusLabel[p.status]}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              className={`block rounded-full border-2 border-background ${
                p.id === selected ? "size-5" : "size-4"
              }`}
              style={{ backgroundColor: statusColor[p.status] }}
            />
          </button>
        ))}

        {active ? (
          <div
            className="absolute z-10 w-52 -translate-x-1/2 rounded-lg border bg-card p-3 shadow-card"
            style={{
              left: `${Math.min(Math.max(active.x, 18), 82)}%`,
              top: `calc(${active.y}% + 18px)`,
            }}
          >
            <p className="font-mono text-[11px] text-muted-foreground">
              {active.id}
            </p>
            <p className="text-sm font-medium">{active.common}</p>
            <p className="text-xs italic text-muted-foreground">
              {active.species}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{active.site}</p>
            <p className="text-xs">
              Next: {active.nextTask} · {active.nextCare}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(["healthy", "attention", "critical"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: statusColor[s] }}
            />
            {statusLabel[s]}
          </span>
        ))}
        <span className="ml-auto">Tap a marker to see the plant</span>
      </div>
    </div>
  );
}
