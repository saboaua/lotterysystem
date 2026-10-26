"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Game } from "@/lib/types";

function parseHM(hm: string): { h: number; m: number } {
  const [h, m] = (hm || "12:00").split(":").map((x) => parseInt(x, 10) || 0);
  return { h, m };
}

export type DrawSlotStatus = "open" | "closed" | "passed";

export interface DrawSlot {
  key: string;
  game: Game;
  sessionId?: string;
  sessionLabel?: string;
  draw_time: string;
  cutoff: string;
  status: DrawSlotStatus;
  minutesToCutoff: number;
}

/** Build today's open / closed draw slots for all enabled games. */
export function buildTodayDrawSlots(games: Game[], now = new Date()): DrawSlot[] {
  const slots: DrawSlot[] = [];
  const dow = now.getDay();

  for (const g of games) {
    if (!g.enabled) continue;
    if (g.draw_days?.length && !g.draw_days.includes(dow)) continue;

    const sessions =
      g.sessions && g.sessions.length
        ? g.sessions
        : [{ id: "", label: "Main", draw_time: g.draw_time, cutoff: g.cutoff }];

    for (const s of sessions) {
      const cut = parseHM(s.cutoff);
      const cutoffDt = new Date(now);
      cutoffDt.setHours(cut.h, cut.m, 0, 0);
      const mins = Math.floor((cutoffDt.getTime() - now.getTime()) / 60000);
      const status: DrawSlotStatus = mins < 0 ? "passed" : "open";

      slots.push({
        key: `${g.id}:${s.id || "main"}`,
        game: g,
        sessionId: s.id || undefined,
        sessionLabel: s.label,
        draw_time: s.draw_time,
        cutoff: s.cutoff,
        status,
        minutesToCutoff: mins,
      });
    }
  }

  slots.sort((a, b) => {
    const pa = parseHM(a.cutoff);
    const pb = parseHM(b.cutoff);
    return pa.h * 60 + pa.m - (pb.h * 60 + pb.m);
  });
  return slots;
}

export function DrawSchedulePanel({
  onSelect,
}: {
  onSelect?: (slot: DrawSlot) => void;
}) {
  const { games } = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const slots = useMemo(() => buildTodayDrawSlots(games), [games, tick]);
  const open = slots.filter((s) => s.status === "open");
  const passed = slots.filter((s) => s.status === "passed");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Draw calculation schedule</h2>
          <p className="text-xs text-slate-500">
            All games open for today. Past cutoff = closed for sales / ready for result entry.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          Live
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10px] font-bold uppercase text-emerald-700">Open for sell</div>
          <div className="text-xl font-extrabold text-emerald-800">{open.length}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-[10px] font-bold uppercase text-rose-700">Past cutoff</div>
          <div className="text-xl font-extrabold text-rose-800">{passed.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase text-slate-500">Total slots</div>
          <div className="text-xl font-extrabold">{slots.length}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2">Game</th>
              <th className="px-2 py-2">Session</th>
              <th className="px-2 py-2">Cutoff</th>
              <th className="px-2 py-2">Draw</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.key} className="border-b border-slate-100">
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.game.color }}
                    />
                    {s.game.name}
                  </span>
                </td>
                <td className="px-2 py-2">{s.sessionLabel || "—"}</td>
                <td className="px-2 py-2 font-mono">{s.cutoff}</td>
                <td className="px-2 py-2 font-mono">{s.draw_time}</td>
                <td className="px-2 py-2">
                  {s.status === "open" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Open · closes in {s.minutesToCutoff}m
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      Closed · past cutoff
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(s)}
                      className="rounded-full bg-violet-600/10 px-2.5 py-1 text-[10px] font-bold text-violet-700"
                    >
                      Enter results
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!slots.length && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-400">
                  No draws scheduled for today
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
