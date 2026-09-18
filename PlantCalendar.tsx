import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { plantCareEvents, TODAY, type CareEvent } from "@/lib/plant-care";
import type { Plant } from "@/lib/rootline-data";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function PlantCalendar({ plant }: { plant: Plant }) {
  const events = useMemo(() => plantCareEvents(plant), [plant]);
  const [month, setMonth] = useState(8); // September
  const year = 2026;

  const byDate = useMemo(() => {
    const map = new Map<string, CareEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => Math.max(0, m - 1))}
          className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-40"
          disabled={month === 0}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium">
          {MONTH_NAMES[month]} {year}
        </p>
        <button
          type="button"
          onClick={() => setMonth((m) => Math.min(11, m + 1))}
          className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-40"
          disabled={month === 11}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="min-h-16 rounded-md" />;
          const key = dateKey(day);
          const dayEvents = byDate.get(key) ?? [];
          const isToday = key === TODAY;
          return (
            <div
              key={key}
              className={`min-h-16 rounded-md border p-1 text-left ${
                isToday ? "border-primary bg-primary/5" : "bg-card"
              }`}
            >
              <p
                className={`text-[11px] ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                {day}
              </p>
              {dayEvents.map((e, idx) => (
                <p
                  key={`${key}-${idx}`}
                  className={`mt-0.5 truncate rounded px-1 py-0.5 text-[10px] ${
                    e.done
                      ? "bg-status-healthy/15 text-status-healthy"
                      : "bg-status-attention/15 text-status-attention"
                  }`}
                  title={`${e.action}${e.workerName ? ` · ${e.workerName}` : ""}`}
                >
                  {e.action}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Care history & plan</p>
        {events.map((e, i) => (
          <div key={`${e.date}-${i}`} className="flex items-center gap-2 text-sm">
            <span
              className={`size-2 shrink-0 rounded-full ${
                e.done ? "bg-status-healthy" : "bg-status-attention"
              }`}
            />
            <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">
              {e.date}
            </span>
            <span className="min-w-0 flex-1 truncate">{e.action}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{e.workerName}</span>
            {e.photo ? <Camera className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
