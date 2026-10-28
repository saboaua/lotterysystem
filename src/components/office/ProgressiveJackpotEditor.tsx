"use client";

import type { Game } from "@/lib/types";
import { sanitizeToken } from "@/lib/jackpot-tokens";
import {
  DEFAULT_JACKPOT_MATRIX,
  JACKPOT_MATRIX_PRESETS,
  formatOdds,
  matrixCombinations,
  matrixFromGame,
  matrixSummary,
  sanitizeMatrix,
  type JackpotMatrix,
} from "@/lib/jackpot-matrix";

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

  const matrix = matrixFromGame(g);
  const combos = matrixCombinations(matrix);
  const odds = formatOdds(combos);
  const summary = matrixSummary(matrix);

  function applyMatrix(next: Partial<JackpotMatrix>) {
    const m = sanitizeMatrix({ ...matrix, ...next });
    updateGame(g.id, {
      main_count: m.main_count,
      main_max: m.main_max,
      mega_count: m.mega_count,
      mega_max: m.mega_max,
    });
  }

  function applyPreset(presetId: string) {
    const p = JACKPOT_MATRIX_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    applyMatrix(p.matrix);
  }

  const matchingPreset = JACKPOT_MATRIX_PRESETS.find(
    (p) =>
      p.matrix.main_count === matrix.main_count &&
      p.matrix.main_max === matrix.main_max &&
      p.matrix.mega_count === matrix.mega_count &&
      p.matrix.mega_max === matrix.mega_max
  );

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="text-[11px] font-bold uppercase text-amber-800 dark:text-amber-300">
        Progressive jackpot · matrix & pool
      </div>

      <div className="rounded-lg border border-amber-200/80 bg-white/70 p-2 dark:border-amber-800 dark:bg-black/20">
        <div className="mb-1 text-[10px] font-semibold uppercase text-[var(--mut)]">
          Matrix presets (lottery-style)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {JACKPOT_MATRIX_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                matchingPreset?.id === p.id
                  ? "bg-amber-600 text-white"
                  : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)] hover:border-amber-400"
              }`}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--mut)]">
          {summary} · odds ~{odds}
          {matchingPreset ? ` · ${matchingPreset.hint}` : ""}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Main balls (count)
          <input
            type="number"
            min={1}
            max={10}
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            value={matrix.main_count}
            onChange={(e) =>
              applyMatrix({ main_count: parseInt(e.target.value, 10) || 1 })
            }
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Main pool (max)
          <input
            type="number"
            min={2}
            max={99}
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            value={matrix.main_max}
            onChange={(e) =>
              applyMatrix({ main_max: parseInt(e.target.value, 10) || 2 })
            }
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Mega balls (0 = off)
          <input
            type="number"
            min={0}
            max={5}
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            value={matrix.mega_count}
            onChange={(e) => {
              const mega_count = parseInt(e.target.value, 10) || 0;
              applyMatrix({
                mega_count,
                mega_max: mega_count
                  ? matrix.mega_max || DEFAULT_JACKPOT_MATRIX.mega_max
                  : 0,
              });
            }}
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Mega pool (max)
          <input
            type="number"
            min={0}
            max={99}
            disabled={matrix.mega_count === 0}
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm disabled:opacity-40"
            value={matrix.mega_max}
            onChange={(e) =>
              applyMatrix({ mega_max: parseInt(e.target.value, 10) || 0 })
            }
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Base pool ({currency})
          <input
            type="number"
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            defaultValue={g.jackpot_base ?? 50000}
            onBlur={(e) =>
              updateGame(g.id, { jackpot_base: parseFloat(e.target.value) || 0 })
            }
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Current pool ({currency})
          <input
            type="number"
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            defaultValue={g.jackpot_current ?? g.jackpot_base ?? 50000}
            onBlur={(e) =>
              updateGame(g.id, {
                jackpot_current: parseFloat(e.target.value) || 0,
              })
            }
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Increment on miss ({currency})
          <input
            type="number"
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            defaultValue={g.jackpot_increment ?? 5000}
            onBlur={(e) =>
              updateGame(g.id, {
                jackpot_increment: parseFloat(e.target.value) || 0,
              })
            }
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Sales % to pool
          <input
            type="number"
            className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
            defaultValue={g.jackpot_sales_pct ?? 30}
            onBlur={(e) =>
              updateGame(g.id, {
                jackpot_sales_pct: parseFloat(e.target.value) || 0,
              })
            }
          />
        </label>
      </div>

      <label className="text-[11px] font-semibold text-[var(--mut)]">
        Ticket token (print)
        <input
          className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm font-mono"
          defaultValue={g.jackpot_token || ""}
          placeholder="optional"
          onBlur={(e) =>
            updateGame(g.id, { jackpot_token: sanitizeToken(e.target.value) })
          }
        />
      </label>
    </div>
  );
}
