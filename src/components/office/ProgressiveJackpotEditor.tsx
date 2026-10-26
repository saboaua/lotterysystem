"use client";

import type { Game } from "@/lib/types";

export function ProgressiveJackpotEditor({
  game: g,
  currency,
  updateGame,
}: {
  game: Game;
  currency: string;
  updateGame: (id: string, patch: Partial<Game>) => void;
}) {
  if (g.format !== "jackpot") return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
        <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
          Fixed ticket price
        </div>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Price ({currency})
          <input
            type="number"
            step="0.25"
            className="mt-1 h-10 w-full max-w-xs rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            defaultValue={g.min_stake ?? 1}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 1;
              updateGame(g.id, { min_stake: v, max_stake: v });
            }}
          />
        </label>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="mb-1 text-[11px] font-bold uppercase text-amber-800 dark:text-amber-200">
          Progressive jackpot (first prize)
        </div>
        <p className="mb-3 text-[11px] text-[var(--mut)]">
          Pool grows when there is no rank-1 winner:{" "}
          <span className="font-semibold">
            next = current + fixed boost + (draw sales × %)
          </span>
          . On a win the pool resets to the seed. Tickets use {"{jackpot}"} / {"{prev_jackpot}"} .
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Current advertised ({currency})
            <input
              type="number"
              step="100"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-bold"
              defaultValue={g.jackpot_current ?? g.jackpot_base ?? 0}
              onBlur={(e) =>
                updateGame(g.id, { jackpot_current: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Seed / reset after win ({currency})
            <input
              type="number"
              step="100"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
              defaultValue={g.jackpot_base ?? 50000}
              onBlur={(e) =>
                updateGame(g.id, { jackpot_base: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Previous pool ({currency})
            <input
              type="number"
              step="100"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
              defaultValue={g.jackpot_previous ?? g.jackpot_current ?? 0}
              onBlur={(e) =>
                updateGame(g.id, { jackpot_previous: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Fixed boost per rollover ({currency})
            <input
              type="number"
              step="100"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
              defaultValue={g.jackpot_increment ?? 0}
              onBlur={(e) =>
                updateGame(g.id, { jackpot_increment: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Sales contribution (%)
            <input
              type="number"
              min={0}
              max={100}
              step="1"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
              defaultValue={g.jackpot_sales_pct ?? 30}
              onBlur={(e) =>
                updateGame(g.id, {
                  jackpot_sales_pct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                })
              }
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Cap optional ({currency})
            <input
              type="number"
              step="1000"
              placeholder="No cap"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
              defaultValue={g.jackpot_cap ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                updateGame(g.id, { jackpot_cap: v ? parseFloat(v) || undefined : undefined });
              }}
            />
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Main balls (count / max)
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                className="h-10 w-20 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={g.main_count ?? 5}
                onBlur={(e) =>
                  updateGame(g.id, { main_count: parseInt(e.target.value, 10) || 5 })
                }
              />
              <span className="self-center text-[var(--mut)]">/</span>
              <input
                type="number"
                className="h-10 w-20 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={g.main_max ?? 30}
                onBlur={(e) =>
                  updateGame(g.id, { main_max: parseInt(e.target.value, 10) || 30 })
                }
              />
            </div>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Mega (count / max)
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                className="h-10 w-20 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={g.mega_count ?? 1}
                onBlur={(e) =>
                  updateGame(g.id, { mega_count: parseInt(e.target.value, 10) || 1 })
                }
              />
              <span className="self-center text-[var(--mut)]">/</span>
              <input
                type="number"
                className="h-10 w-20 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={g.mega_max ?? 10}
                onBlur={(e) =>
                  updateGame(g.id, { mega_max: parseInt(e.target.value, 10) || 10 })
                }
              />
            </div>
          </label>
        </div>
        <p className="mt-2 text-[10px] text-[var(--mut)]">
          Example: pool 150,000 · sales 10,000 · 30% + 5,000 fixed → next ≈ 158,000.
          Multiple rank-1 winners split the advertised pool equally.
        </p>
      </div>
    </div>
  );
}
