"use client";

import { PLAY_WHE_MARKS, ZODIAC_SYMBOLS } from "@/lib/constants";
import type { Game } from "@/lib/types";

const MULTI_DRAW = [1, 2, 3, 5, 10];

export function SessionsPicker({
  primary,
  session,
  setSession,
}: {
  primary?: Game;
  session: string;
  setSession: (id: string) => void;
}) {
  if (!primary?.sessions?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {primary.sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setSession(s.id)}
          className={`btn-tactile h-9 rounded-full px-3 text-sm font-semibold ${
            session === s.id
              ? "bg-violet-600 text-white shadow"
              : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function MultiDrawPicker({
  primary,
  multiDraw,
  setMultiDraw,
}: {
  primary?: Game;
  multiDraw: number;
  setMultiDraw: (n: number | ((m: number) => number)) => void;
}) {
  if (primary?.format !== "digit") return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Multi-draw
      </span>
      {MULTI_DRAW.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setMultiDraw(n)}
          className={`btn-tactile h-8 min-w-[2.25rem] rounded-lg px-2 text-xs font-bold transition ${
            multiDraw === n
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
          }`}
        >
          {n}x
        </button>
      ))}
      <div className="ml-1 flex items-center overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-600">
        <button
          type="button"
          onClick={() => setMultiDraw((m) => Math.max(1, m - 1))}
          className="btn-tactile h-8 w-8 bg-slate-50 font-bold text-slate-600 hover:bg-slate-100 dark:bg-slate-800"
        >
          −
        </button>
        <span className="flex h-8 min-w-[2rem] items-center justify-center bg-white text-sm font-bold tabular-nums dark:bg-slate-900">
          {multiDraw}
        </span>
        <button
          type="button"
          onClick={() => setMultiDraw((m) => Math.min(28, m + 1))}
          className="btn-tactile h-8 w-8 bg-slate-50 font-bold text-slate-600 hover:bg-slate-100 dark:bg-slate-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** 12 zodiac signs with symbols — player also enters 4-digit number on the keypad. */
export function ZodiacPicker({
  primary,
  zodiacPick,
  setZodiacPick,
  allZodiac,
  setAllZodiac,
}: {
  primary?: Game;
  zodiacPick: string[];
  setZodiacPick: (v: string[] | ((p: string[]) => string[])) => void;
  allZodiac: boolean;
  setAllZodiac: (v: boolean) => void;
}) {
  if (primary?.format !== "zodiac") return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase text-slate-400">
          Zodiac signs — pick sign(s) + enter 4-digit number
        </span>
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            allZodiac ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-700"
          }`}
          onClick={() => {
            setAllZodiac(true);
            setZodiacPick(ZODIAC_SYMBOLS.map((z) => z.id));
          }}
        >
          All 12
        </button>
        <button
          type="button"
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-700"
          onClick={() => {
            setAllZodiac(false);
            setZodiacPick([]);
          }}
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
        {ZODIAC_SYMBOLS.map((z) => {
          const on = allZodiac || zodiacPick.includes(z.id);
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => {
                setAllZodiac(false);
                setZodiacPick((p) =>
                  p.includes(z.id) ? p.filter((x) => x !== z.id) : [...p, z.id]
                );
              }}
              className={`btn-tactile rounded-xl p-2 text-center text-xs font-semibold ${
                on ? "bg-violet-500 text-white ring-2 ring-violet-300" : "bg-slate-100 dark:bg-slate-700"
              }`}
            >
              <span className="block text-2xl leading-none">{z.emoji}</span>
              <span className="mt-0.5 block truncate">{z.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Includes Taurus ♉ and Aquarius ♒. Ticket line format: 4 digits + sign (e.g. 1234-taurus).
      </p>
    </div>
  );
}

/** Play Whe 1–36 marks with symbols (NLCB-style). 2-digit game. */
export function PlayWhePicker({
  primary,
  whePicks,
  setWhePicks,
  typed,
}: {
  primary?: Game;
  whePicks: number[];
  setWhePicks: (n: number[]) => void;
  /** Mark currently typed on the keypad (NaN when none). */
  typed: number;
}) {
  if (primary?.format !== "whe") return null;
  const selected = new Set(whePicks);
  if (typed >= 1 && typed <= 36) selected.add(typed);
  function toggle(n: number) {
    setWhePicks(whePicks.includes(n) ? whePicks.filter((x) => x !== n) : [...whePicks, n]);
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Play Whe marks — tap to select several (1–36)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setWhePicks(
                whePicks.length === PLAY_WHE_MARKS.length ? [] : PLAY_WHE_MARKS.map((m) => m.num)
              )
            }
            className={
              "rounded-full px-3 py-1 text-[11px] font-extrabold transition " +
              (whePicks.length === PLAY_WHE_MARKS.length
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800")
            }
          >
            {whePicks.length === PLAY_WHE_MARKS.length ? "All marks ✓" : "All marks"}
          </button>
          <span className="text-xs font-bold text-rose-500">{selected.size} selected</span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setWhePicks([])}
              className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="grid max-h-64 grid-cols-4 gap-1.5 overflow-auto sm:grid-cols-6 md:grid-cols-9">
        {PLAY_WHE_MARKS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.num)}
            className={`btn-tactile flex flex-col items-center rounded-xl border p-1.5 text-center ${
              selected.has(m.num)
                ? "border-rose-400 bg-rose-500/15 ring-2 ring-rose-400"
                : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700"
            }`}
          >
            <span className="text-lg leading-none">{m.emoji}</span>
            <span className="text-[10px] font-bold">{String(m.num).padStart(2, "0")}</span>
            <span className="w-full truncate text-[8px] text-slate-500">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function JackpotPicker({
  primary,
  jackBalls,
  setJackBalls,
  jackMega,
  setJackMega,
}: {
  primary?: Game;
  jackBalls: string[];
  setJackBalls: (v: string[] | ((p: string[]) => string[])) => void;
  jackMega: string | null;
  setJackMega: (v: string | null) => void;
}) {
  if (primary?.format !== "jackpot") return null;
  const max = primary.main_max ?? 30;
  const need = primary.main_count ?? 5;
  const megaMax = primary.mega_max ?? 10;
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-xs font-bold uppercase text-slate-400">
        Pick {need} numbers (1–{max})
      </div>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-10">
        {Array.from({ length: max }, (_, i) => {
          const v = String(i + 1).padStart(2, "0");
          const on = jackBalls.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                setJackBalls((p) => {
                  if (p.includes(v)) return p.filter((x) => x !== v);
                  if (p.length >= need) return p;
                  return [...p, v];
                });
              }}
              className={`btn-tactile h-9 rounded-lg text-xs font-bold ${
                on ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-slate-700"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      {primary.mega_count ? (
        <>
          <div className="text-xs font-bold uppercase text-slate-400">Mega (1–{megaMax})</div>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: megaMax }, (_, i) => {
              const v = String(i + 1).padStart(2, "0");
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setJackMega(v)}
                  className={`btn-tactile h-9 w-10 rounded-lg text-xs font-bold ${
                    jackMega === v ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-700"
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
