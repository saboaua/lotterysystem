"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Game } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function gameDrawsOn(g: Game, date: Date, holidays: { date: string }[]): boolean {
  if (!g.enabled) return false;
  const iso = date.toISOString().slice(0, 10);
  if (holidays.some((h) => h.date === iso)) return false;
  const dow = date.getDay();
  if (g.draw_days && g.draw_days.length > 0 && !g.draw_days.includes(dow)) return false;
  return true;
}

export function DrawCalendar() {
  const { games, holidays } = useStore();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const cells = useMemo(() => {
    const firstDow = new Date(y, m, 1).getDay();
    const dim = daysInMonth(y, m);
    const out: { day: number | null; date?: Date; games: Game[] }[] = [];
    for (let i = 0; i < firstDow; i++) out.push({ day: null, games: [] });
    for (let d = 1; d <= dim; d++) {
      const date = new Date(y, m, d);
      const active = games.filter((g) => gameDrawsOn(g, date, holidays));
      out.push({ day: d, date, games: active });
    }
    return out;
  }, [y, m, games, holidays]);

  const monthLabel = cursor.toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Draw calendar</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--key)] px-2 py-1 text-xs font-bold"
            onClick={() => setCursor(new Date(y, m - 1, 1))}
          >
            ‹
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold">{monthLabel}</span>
          <button
            type="button"
            className="rounded-lg bg-[var(--key)] px-2 py-1 text-xs font-bold"
            onClick={() => setCursor(new Date(y, m + 1, 1))}
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--mut)]">
        {DOW.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const iso = c.date?.toISOString().slice(0, 10);
          const isHoliday = iso && holidays.some((h) => h.date === iso);
          const noDraw = c.day != null && c.games.length === 0;
          return (
            <div
              key={i}
              className={`min-h-[64px] rounded-lg border p-1 text-left ${
                c.day == null
                  ? "border-transparent"
                  : isHoliday
                    ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
                    : noDraw
                      ? "border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/50"
                      : "border-[var(--line)] bg-[var(--key)]/40"
              }`}
            >
              {c.day != null && (
                <>
                  <div className="text-[11px] font-bold">{c.day}</div>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {c.games.slice(0, 6).map((g) => (
                      <span
                        key={g.id}
                        title={g.name}
                        className="h-2 w-2 rounded-full"
                        style={{ background: g.color }}
                      />
                    ))}
                  </div>
                  {isHoliday && (
                    <div className="mt-0.5 truncate text-[9px] font-semibold text-rose-600">Holiday</div>
                  )}
                  {noDraw && !isHoliday && (
                    <div className="mt-0.5 text-[9px] text-[var(--mut)]">No draw</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {games.filter((g) => g.enabled).map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1 text-[10px] font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
            {g.name}
          </span>
        ))}
      </div>
    </div>
  );
}
