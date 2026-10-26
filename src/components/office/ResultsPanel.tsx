"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ScrapeButtons } from "./ScrapeButtons";
import { arubaHolidaysForYear } from "@/lib/aruba-holidays";
import { ZODIAC_SYMBOLS } from "@/lib/constants";
import { buildDrawCalcReport } from "@/lib/prize-tiers";

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function formatAfl(n: number) {
  return n.toLocaleString("nl-AW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ResultsPanel() {
  const {
    games,
    drawResults,
    holidays,
    setResults,
    addHoliday,
    deleteHoliday,
    importHolidays,
    toast,
    currency,
    soldTickets,
  } = useStore();
  const [gameId, setGameId] = useState(games[0]?.id || "");
  const [d, setD] = useState(() => new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");
  const [whe, setWhe] = useState("");
  const [zodiac, setZodiac] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calCursor, setCalCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const g = games.find((x) => x.id === gameId);
  const sessions = g?.sessions || [];

  const calCells = useMemo(() => {
    const { y, m } = calCursor;
    const firstDow = new Date(y, m, 1).getDay();
    const dim = daysInMonth(y, m);
    const cells: {
      day: number | null;
      dateStr?: string;
      games: { id: string; color: string; name: string }[];
      holiday?: string;
      noDraw: boolean;
    }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null, games: [], noDraw: false });
    for (let day = 1; day <= dim; day++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dow = new Date(y, m, day).getDay();
      const hol = holidays.find((h) => h.date === dateStr);
      const dayGames = games.filter((gg) => {
        if (!gg.enabled) return false;
        if (hol) return false;
        if (gg.draw_days?.length && !gg.draw_days.includes(dow)) return false;
        return true;
      });
      cells.push({
        day,
        dateStr,
        games: dayGames.map((gg) => ({ id: gg.id, color: gg.color, name: gg.name })),
        holiday: hol?.name,
        noDraw: !hol && dayGames.length === 0,
      });
    }
    return cells;
  }, [calCursor, games, holidays]);

  function saveResults() {
    if (!gameId) {
      toast("Select a game", true);
      return;
    }
    if (g?.format === "whe") {
      const n = parseInt(whe, 10);
      if (!n || n < 1 || n > 36) {
        toast("Play Whe mark 1-36 required", true);
        return;
      }
      setResults({ game_id: gameId, draw_date: d, session: session || undefined, whe: n, source: "manual" });
    } else if (g?.format === "zodiac") {
      if (!first.trim()) {
        toast("Winning number required", true);
        return;
      }
      if (!zodiac) {
        toast("Zodiac sign required", true);
        return;
      }
      setResults({
        game_id: gameId,
        draw_date: d,
        session: session || undefined,
        first: first.trim(),
        zodiac,
        source: "manual",
      });
    } else if (g?.format === "digit") {
      if (!first.trim()) {
        toast("1st number required", true);
        return;
      }
      setResults({
        game_id: gameId,
        draw_date: d,
        session: session || undefined,
        first: first.trim(),
        second: second.trim() || undefined,
        third: third.trim() || undefined,
        source: "manual",
      });
    } else {
      setResults({
        game_id: gameId,
        draw_date: d,
        session: session || undefined,
        first: first.trim() || undefined,
        source: "manual",
      });
    }
    setFirst("");
    setSecond("");
    setThird("");
    setWhe("");
    setZodiac("");
    toast("Results saved — open Draw calculation for payout tiers");
  }

  const monthLabel = new Date(calCursor.y, calCursor.m, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const drawCalcRows = useMemo(() => {
    return drawResults.map((r) => {
      const game = games.find((x) => x.id === r.game_id);
      return buildDrawCalcReport(r, game, soldTickets);
    });
  }, [drawResults, games, soldTickets]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Draw calendar</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
              onClick={() =>
                setCalCursor((c) => {
                  const d0 = new Date(c.y, c.m - 1, 1);
                  return { y: d0.getFullYear(), m: d0.getMonth() };
                })
              }
            >
              Prev
            </button>
            <span className="min-w-[140px] text-center text-sm font-bold">{monthLabel}</span>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
              onClick={() =>
                setCalCursor((c) => {
                  const d0 = new Date(c.y, c.m + 1, 1);
                  return { y: d0.getFullYear(), m: d0.getMonth() };
                })
              }
            >
              Next
            </button>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--mut)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
            <div key={x}>{x}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calCells.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={!c.day}
              onClick={() => {
                if (c.dateStr) setD(c.dateStr);
              }}
              className={`min-h-[64px] rounded-lg border p-1 text-left ${
                !c.day
                  ? "border-transparent"
                  : c.holiday
                    ? "border-rose-200 bg-rose-50 dark:bg-rose-950/30"
                    : c.noDraw
                      ? "border-slate-200 bg-slate-100 opacity-60 dark:bg-slate-800"
                      : "border-[var(--line)] bg-[var(--key)]/30 hover:border-indigo-400"
              } ${c.dateStr === d ? "ring-2 ring-indigo-500" : ""}`}
            >
              {c.day ? (
                <>
                  <div className="text-xs font-bold">{c.day}</div>
                  {c.holiday ? (
                    <div className="truncate text-[9px] font-semibold text-rose-600">{c.holiday}</div>
                  ) : c.noDraw ? (
                    <div className="text-[9px] text-[var(--mut)]">No draw</div>
                  ) : (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {c.games.slice(0, 6).map((gg) => (
                        <span
                          key={gg.id}
                          title={gg.name}
                          className="h-2 w-2 rounded-full"
                          style={{ background: gg.color }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Results & winners</h2>
        <ScrapeButtons date={d} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Game
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={gameId}
              onChange={(e) => {
                setGameId(e.target.value);
                setSession("");
                setZodiac("");
              }}
            >
              {games.map((gg) => (
                <option key={gg.id} value={gg.id}>
                  {gg.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Draw date
            <input
              type="date"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d}
              onChange={(e) => setD(e.target.value)}
            />
          </label>
          {sessions.length > 0 && (
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Session
              <select
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={session}
                onChange={(e) => setSession(e.target.value)}
              >
                <option value="">-</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {g?.format === "whe" ? (
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Play Whe (1-36)
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={whe}
                onChange={(e) => setWhe(e.target.value)}
              />
            </label>
          ) : g?.format === "zodiac" ? (
            <>
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                Winning number ({g.digits || 4} digits)
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm font-mono"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="e.g. 4821"
                />
              </label>
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                Zodiac sign
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                  value={zodiac}
                  onChange={(e) => setZodiac(e.target.value)}
                >
                  <option value="">Select sign</option>
                  {ZODIAC_SYMBOLS.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.emoji} {z.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                1st
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </label>
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                2nd
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                />
              </label>
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                3rd
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                  value={third}
                  onChange={(e) => setThird(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={saveResults}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
        >
          Save results
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Draw calculation (prize structure)</h2>
        <p className="text-xs text-[var(--mut)]">
          Winning numbers matched against each game&apos;s prize tiers (e.g. Zodiaco 1st–4th). Ticket
          counts use sales for that game and date.
        </p>
        <div className="space-y-3">
          {drawCalcRows.map((row) => {
            const r = row.result;
            const open = expandedId === r.id;
            const winLabel =
              r.whe != null
                ? `Whe ${r.whe}`
                : r.zodiac
                  ? `${r.first || "-"} · ${r.zodiac}`
                  : [r.first, r.second, r.third].filter(Boolean).join(" / ") || "-";
            return (
              <div
                key={r.id}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--key)]/30"
              >
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left text-xs"
                  onClick={() => setExpandedId(open ? null : r.id)}
                >
                  <span className="font-mono font-semibold">{r.draw_date}</span>
                  <span className="font-bold">{row.game?.name || r.game_id}</span>
                  <span className="text-[var(--mut)]">{r.session || "-"}</span>
                  <span className="font-mono font-bold">{winLabel}</span>
                  <span className="ml-auto text-[var(--mut)]">
                    {row.tickets} tix · sales {currency} {formatAfl(row.sales)} · payout{" "}
                    {currency} {formatAfl(row.totalPayout)}
                  </span>
                  <span className="text-[var(--mut)]">{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  <div className="border-t border-[var(--line)] bg-[var(--card)] px-3 py-3">
                    {!row.game?.prize_tiers?.length ? (
                      <p className="text-xs text-amber-700">
                        No prize tiers on this game — set them under Games &amp; schedule.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--line)] text-[var(--mut)]">
                            <th className="px-2 py-1.5">Rank</th>
                            <th className="px-2 py-1.5">Match</th>
                            <th className="px-2 py-1.5">Prize</th>
                            <th className="px-2 py-1.5">Winners</th>
                            <th className="px-2 py-1.5">Payout</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.tierSummary.map(({ tier, winners, payout }) => (
                            <tr key={tier.id} className="border-b border-[var(--line)] last:border-0">
                              <td className="px-2 py-1.5 font-bold">{tier.label}</td>
                              <td className="px-2 py-1.5">{tier.description}</td>
                              <td className="px-2 py-1.5 font-mono">
                                {currency} {formatAfl(tier.amount)}
                              </td>
                              <td className="px-2 py-1.5">{winners}</td>
                              <td className="px-2 py-1.5 font-semibold">
                                {currency} {formatAfl(payout)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-[var(--key)]/40 font-bold">
                            <td className="px-2 py-2" colSpan={3}>
                              Total ({row.winningLines} winning line(s))
                            </td>
                            <td className="px-2 py-2" />
                            <td className="px-2 py-2">
                              {currency} {formatAfl(row.totalPayout)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!drawCalcRows.length && (
            <p className="py-4 text-center text-xs text-[var(--mut)]">
              No results yet — import or enter winning numbers, then expand a row for tier payouts.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Holidays / no-draw days</h2>
          <button
            type="button"
            onClick={() => {
              const y = new Date().getFullYear();
              const n = importHolidays(arubaHolidaysForYear(y));
              const n2 = importHolidays(arubaHolidaysForYear(y + 1));
              toast(`Imported ${n + n2} Aruba holiday(s) for ${y}-${y + 1}`);
            }}
            className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
          >
            Import Aruba holidays
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            className="h-10 rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
          />
          <input
            className="h-10 flex-1 rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            placeholder="Holiday name"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (!holidayName.trim()) {
                toast("Name required", true);
                return;
              }
              addHoliday({ date: holidayDate, name: holidayName.trim() });
              setHolidayName("");
              toast("Holiday saved");
            }}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
        <div className="space-y-1">
          {holidays.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-xl bg-[var(--key)] px-3 py-2 text-sm"
            >
              <span>
                <b>{h.date}</b> · {h.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  deleteHoliday(h.id);
                  toast("Holiday removed");
                }}
                className="text-rose-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!holidays.length && (
            <p className="text-xs text-[var(--mut)]">No holidays - import Aruba set or add manually.</p>
          )}
        </div>
      </div>
    </div>
  );
}
