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

type ResultsPanelProps = {
  mode?: "all" | "calendar" | "results" | "reports";
};

export function ResultsPanel({ mode = "all" }: ResultsPanelProps) {
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
      const dateStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
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
    toast("Results saved — expand draw for prize tiers");
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

  const showCal = mode === "all" || mode === "calendar";
  const showResults = mode === "all" || mode === "results";
  const showReports = mode === "all" || mode === "reports";
  const showHolidays = mode === "all" || mode === "calendar";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {showResults && (
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Results & Winners</h1>
          <p className="text-xs text-slate-500">Enter or import winning numbers and settle tickets.</p>
        </div>
      )}

      {showCal && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Draw calendar</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
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
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
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
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">
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
                className={
                  "min-h-[64px] rounded-lg border p-1 text-left " +
                  (!c.day
                    ? "border-transparent"
                    : c.holiday
                      ? "border-rose-200 bg-rose-50"
                      : c.noDraw
                        ? "border-slate-200 bg-slate-100 opacity-60"
                        : "border-slate-200 bg-slate-50 hover:border-violet-400") +
                  (c.dateStr === d ? " ring-2 ring-violet-500" : "")
                }
              >
                {c.day ? (
                  <>
                    <div className="text-xs font-bold">{c.day}</div>
                    {c.holiday ? (
                      <div className="truncate text-[9px] font-semibold text-rose-600">{c.holiday}</div>
                    ) : c.noDraw ? (
                      <div className="text-[9px] text-slate-400">No draw</div>
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
      )}

      {showResults && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Enter draw results</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Manual entry
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-slate-500">
                Game
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
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
              <label className="text-[11px] font-semibold text-slate-500">
                Draw date
                <input
                  type="date"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
                  value={d}
                  onChange={(e) => setD(e.target.value)}
                />
              </label>
              {sessions.length > 0 && (
                <label className="text-[11px] font-semibold text-slate-500">
                  Session
                  <select
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
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
                <label className="text-[11px] font-semibold text-slate-500">
                  Play Whe (1-36)
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
                    value={whe}
                    onChange={(e) => setWhe(e.target.value)}
                  />
                </label>
              ) : g?.format === "zodiac" ? (
                <>
                  <label className="text-[11px] font-semibold text-slate-500">
                    Winning number ({g.digits || 4} digits)
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono text-sm"
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                      placeholder="e.g. 4821"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-500">
                    Zodiac sign
                    <select
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
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
                  <label className="text-[11px] font-semibold text-slate-500">
                    1st prize
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono text-sm"
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                      placeholder="0000"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-500">
                    2nd prize
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono text-sm"
                      value={second}
                      onChange={(e) => setSecond(e.target.value)}
                      placeholder="0000"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-500">
                    3rd prize
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono text-sm"
                      value={third}
                      onChange={(e) => setThird(e.target.value)}
                      placeholder="0000"
                    />
                  </label>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={saveResults}
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/30"
            >
              Save & settle
            </button>
            <p className="text-[11px] text-slate-500">
              Digits should match the game setup (e.g. 4 digits). Zodiac requires number + sign.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Published results</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Auto-import
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Winning numbers can be imported after each draw closes. Use the button to fetch for the
              selected date.
            </p>
            <ScrapeButtons date={d} />
          </div>
        </div>
      )}

      {showReports && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold">Draws & winners</h2>
          <p className="text-xs text-slate-500">
            Matched against each game prize structure. Expand a row for tier payout detail.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">Winning tickets</div>
              <div className="text-xl font-extrabold">
                {drawCalcRows.reduce((s, r) => s + r.winningLines, 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Prizes won ({currency})
              </div>
              <div className="text-xl font-extrabold">
                {formatAfl(drawCalcRows.reduce((s, r) => s + r.totalPayout, 0))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">Sales</div>
              <div className="text-xl font-extrabold text-emerald-600">
                {formatAfl(drawCalcRows.reduce((s, r) => s + r.sales, 0))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">Draws</div>
              <div className="text-xl font-extrabold">{drawCalcRows.length}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2">Game</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Numbers</th>
                  <th className="px-2 py-2">Tickets</th>
                  <th className="px-2 py-2">Winners</th>
                  <th className="px-2 py-2">Sales</th>
                  <th className="px-2 py-2">Prizes</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {drawCalcRows.map((row) => {
                  const r = row.result;
                  const open = expandedId === r.id;
                  const winLabel =
                    r.whe != null
                      ? "Whe " + r.whe
                      : r.zodiac
                        ? (r.first || "-") + " · " + r.zodiac
                        : [r.first, r.second, r.third].filter(Boolean).join(" · ") || "-";
                  return (
                    <tbody key={r.id}>
                      <tr className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold">{row.game?.name || r.game_id}</td>
                        <td className="px-2 py-2 font-mono">{r.draw_date}</td>
                        <td className="px-2 py-2 font-mono font-bold">{winLabel}</td>
                        <td className="px-2 py-2">{row.tickets}</td>
                        <td className="px-2 py-2 font-bold">{row.winningLines}</td>
                        <td className="px-2 py-2">{formatAfl(row.sales)}</td>
                        <td className="px-2 py-2">{formatAfl(row.totalPayout)}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? null : r.id)}
                            className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold text-white"
                          >
                            Report
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50 px-3 py-3 dark:bg-slate-800">
                            {!row.game?.prize_tiers?.length ? (
                              <p className="text-xs text-amber-700">
                                No prize tiers — set them under Games & schedule.
                              </p>
                            ) : (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="py-1">Rank</th>
                                    <th className="py-1">Match</th>
                                    <th className="py-1">Prize</th>
                                    <th className="py-1">Winners</th>
                                    <th className="py-1">Payout</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.tierSummary.map(({ tier, winners, payout }) => (
                                    <tr key={tier.id}>
                                      <td className="py-1 font-bold">{tier.label}</td>
                                      <td className="py-1">{tier.description}</td>
                                      <td className="py-1 font-mono">
                                        {currency} {formatAfl(tier.amount)}
                                      </td>
                                      <td className="py-1">{winners}</td>
                                      <td className="py-1 font-semibold">
                                        {currency} {formatAfl(payout)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
                {!drawCalcRows.length && (
                  <tr>
                    <td colSpan={8} className="px-2 py-6 text-center text-slate-400">
                      No results yet — enter or import winning numbers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showHolidays && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Holidays / no-draw days</h2>
            <button
              type="button"
              onClick={() => {
                const y = new Date().getFullYear();
                const n = importHolidays(arubaHolidaysForYear(y));
                const n2 = importHolidays(arubaHolidaysForYear(y + 1));
                toast("Imported " + (n + n2) + " Aruba holiday(s) for " + y + "-" + (y + 1));
              }}
              className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white"
            >
              Import Aruba holidays
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
            <input
              className="h-10 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
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
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
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
              <p className="text-xs text-slate-500">No holidays — import Aruba set or add manually.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
