"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { Game, Holiday } from "@/lib/types";
import { arubaToday } from "@/lib/dates";

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekday(iso: string): number {
  return new Date(iso + "T12:00:00").getDay();
}

function fmtChip(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Upcoming holidays + days with no draws (from game draw_days). */
export function HolidayDrawCard({
  holidays,
  games,
  daysAhead = 60,
}: {
  holidays: Holiday[];
  games: Game[];
  daysAhead?: number;
}) {
  const today = arubaToday();
  const enabled = games.filter((g) => g.enabled !== false);

  const items = useMemo(() => {
    const out: { date: string; label: string; kind: "holiday" | "no_draw"; name?: string }[] = [];
    const holByDate = new Map(holidays.map((h) => [h.date, h]));

    for (let i = 0; i <= daysAhead; i++) {
      const date = addDays(today, i);
      const hol = holByDate.get(date);
      if (hol) {
        out.push({ date, label: hol.name, kind: "holiday", name: hol.name });
        continue;
      }
      if (enabled.length) {
        const wd = weekday(date);
        const anyDraw = enabled.some((g) => {
          const days = g.draw_days;
          if (!days || !days.length) return true;
          return days.includes(wd);
        });
        if (!anyDraw) {
          out.push({ date, label: "No draws", kind: "no_draw" });
        }
      }
    }
    return out.slice(0, 8);
  }, [holidays, enabled, today, daysAhead]);

  if (!items.length) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-3 pl-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-amber-500" />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
          <CalendarDays size={11} /> Holiday notice
        </span>
        <span className="text-[10px] font-semibold text-amber-800/80 dark:text-amber-200/80">
          Upcoming · no draws scheduled
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <div
            key={it.date + it.kind}
            className="min-w-[4.5rem] rounded-lg border border-amber-200/80 bg-white px-2 py-1.5 text-center shadow-sm dark:border-amber-500/20 dark:bg-amber-950/50"
          >
            <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100">
              {fmtChip(it.date)}
              {it.name ? ` · ${it.name.slice(0, 12)}${it.name.length > 12 ? "…" : ""}` : ""}
            </div>
            <div className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-rose-600">
              No draws
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
