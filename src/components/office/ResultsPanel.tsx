"use client";

import { Fragment, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ScrapeButtons } from "./ScrapeButtons";
import { arubaHolidaysForYear } from "@/lib/aruba-holidays";
import { ZODIAC_SYMBOLS } from "@/lib/constants";
import { buildDrawCalcReport } from "@/lib/prize-tiers";
import { arubaToday } from "@/lib/dates";

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function formatAfl(n: number) {
  return n.toLocaleString("nl-AW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function winLabel(r: {
  whe?: number | null;
  zodiac?: string | null;
  first?: string | null;
  second?: string | null;
  third?: string | null;
}) {
  if (r.whe != null) return "Whe " + r.whe;
  if (r.zodiac) return (r.first || "-") + " · " + r.zodiac;
  return [r.first, r.second, r.third].filter(Boolean).join(" · ") || "—";
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
  const [d, setD] = useState(() => arubaToday());
  const [session, setSession] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");
  const [whe, setWhe] = useState("");
  const [zodiac, setZodiac] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(() => arubaToday());
  const [calCursor, setCalCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [range, setRange] = useState<"day" | "week" | "month">("day");

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

  const filteredResults = useMemo(() => {
    const base = new Date(d + "T12:00:00");
    let from = d;
    let to = d;
    if (range === "week") {
      const day = base.getDay();
      const start = new Date(base);
      start.setDate(base.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      from = start.toISOString().slice(0, 10);
      to = end.toISOString().slice(0, 10);
    } else if (range === "month") {
      from = d.slice(0, 7) + "-01";
      const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      to = last.toISOString().slice(0, 10);
    }
    return drawResults
      .filter((r) => r.draw_date >= from && r.draw_date <= to)
      .slice()
      .sort(
        (a, b) =>
          b.draw_date.localeCompare(a.draw_date) ||
          a.game_id.localeCompare(b.game_id) ||
          String(a.session || "").localeCompare(String(b.session || ""))
      );
  }, [drawResults, d, range]);

  const showCal = mode === "all" || mode === "calendar";
  const showResults = mode === "all" || mode === "results";
  const showReports = mode === "all" || mode === "reports";
  const showHolidays = mode === "all" || mode === "calendar";

  const expandedDayResults = expandedDay
    ? drawResults.filter((r) => r.draw_date === expandedDay)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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

      {showResults && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Results & Winners</h1>
              <p className="text-xs text-slate-500">
                Actual imported / entered winning numbers for the selected range.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
                value={d}
                onChange={(e) => setD(e.target.value)}
              />
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {(["day", "week", "month"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={
                      "rounded-lg px-3 py-1.5 text-xs font-bold capitalize " +
                      (range === r
                        ? "bg-violet-600 text-white shadow"
                        : "text-slate-500 hover:text-slate-800")
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Published results for the selected {range}. Import or enter missing numbers above.
          </p>
          {filteredResults.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500 dark:bg-slate-800">
              No results for this {range}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Game</th>
                    <th className="px-2 py-2">Session</th>
                    <th className="px-2 py-2">Winning numbers</th>
                    <th className="px-2 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r) => {
                    const game = games.find((x) => x.id === r.game_id);
                    return (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-2 font-mono">{r.draw_date}</td>
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: game?.color || "#94a3b8" }}
                            />
                            {game?.name || r.game_id}
                          </span>
                        </td>
                        <td className="px-2 py-2">{r.session || "—"}</td>
                        <td className="px-2 py-2 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {winLabel(r)}
                        </td>
                        <td className="px-2 py-2 text-slate-500">{r.source || "manual"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
          <div className="mb-3 flex flex-wrap gap-2">
            {games.filter((gg) => gg.enabled).map((gg) => (
              <span key={gg.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold dark:border-slate-700">
                <span className="h-2 w-2 rounded-full" style={{ background: gg.color }} />
                {gg.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Holiday
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {"SMTWTFS".split("").map((d0, i) => (
              <div key={i}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calCells.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={!c.dateStr}
                onClick={() => {
                  if (!c.dateStr) return;
                  setD(c.dateStr);
                  const dateStr = c.dateStr;
                  setExpandedDay((prev) => (prev === dateStr ? null : dateStr));
                }}
                className={
                  "min-h-[64px] rounded-lg border p-1 text-left " +
                  (c.dateStr === d
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-950/40"
                    : c.holiday
                      ? "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30"
                      : "border-slate-200 dark:border-slate-700") +
                  (!c.dateStr ? " invisible" : "")
                }
              >
                {c.day != null && (
                  <>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{c.day}</div>
                    {c.holiday && (
                      <div className="truncate text-[9px] text-amber-700">{c.holiday}</div>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {c.games.slice(0, 4).map((gg) => (
                        <span
                          key={gg.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: gg.color }}
                          title={gg.name}
                        />
                      ))}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
          {expandedDay && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                {expandedDay} — draws & results
              </div>
              {(() => {
                const cell = calCells.find((c) => c.dateStr === expandedDay);
                if (!cell) return null;
                if (cell.holiday) {
                  return <p className="text-sm text-amber-700">Holiday: {cell.holiday} — no draws</p>;
                }
                if (!cell.games.length) {
                  return <p className="text-sm text-slate-500">No games scheduled</p>;
                }
                return (
                  <ul className="space-y-1.5">
                    {cell.games.map((gg) => {
                      const res = expandedDayResults.find((r) => r.game_id === gg.id);
                      return (
                        <li key={gg.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <span className="h-2 w-2 rounded-full" style={{ background: gg.color }} />
                            {gg.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {res ? winLabel(res) : "no result yet"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {showReports && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold">Draws & winners</h2>
          <p className="text-xs text-slate-500">
            Matched against each game prize structure using authoritative published results. Expand a
            row for tier payout detail.
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

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[720px] table-fixed text-left text-xs">
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/80">
                  <th className="px-3 py-2.5 font-semibold">Game</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Numbers</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Tickets</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Winners</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Sales</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Prizes</th>
                  <th className="px-3 py-2.5 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {drawCalcRows.map((row) => {
                  const r = row.result;
                  const open = expandedId === r.id;
                  const numbers =
                    r.whe != null
                      ? "Whe " + r.whe
                      : r.zodiac
                        ? (r.first || "-") + " · " + r.zodiac
                        : [r.first, r.second, r.third].filter(Boolean).join(" · ") || "-";
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="truncate px-3 py-2.5 font-semibold">{row.game?.name || r.game_id}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums">{r.draw_date}</td>
                        <td className="px-3 py-2.5 font-mono font-bold tabular-nums">{numbers}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{row.tickets}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {row.winningLines}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatAfl(row.sales)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatAfl(row.totalPayout)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold text-white"
                            onClick={() => setExpandedId(open ? null : r.id)}
                          >
                            {open ? "Hide" : "Report"}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                          <td colSpan={8} className="px-3 py-3">
                            {!row.game?.prize_tiers?.length ? (
                              <p className="text-xs text-slate-500">
                                No prize tiers — set them under Games & schedule.
                              </p>
                            ) : (
                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="py-1 pr-3">Tier</th>
                                    <th className="py-1 pr-3">Rule</th>
                                    <th className="py-1 pr-3 text-right">Amount</th>
                                    <th className="py-1 pr-3 text-right">Winners</th>
                                    <th className="py-1 text-right">Payout</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.tierSummary.map(({ tier, winners, payout }) => (
                                    <tr key={tier.id} className="border-t border-slate-200/70 dark:border-slate-700">
                                      <td className="py-1 pr-3 font-bold">{tier.label}</td>
                                      <td className="py-1 pr-3 text-slate-500">{tier.description}</td>
                                      <td className="py-1 pr-3 text-right font-mono tabular-nums">
                                        {currency} {formatAfl(tier.amount)}
                                      </td>
                                      <td className="py-1 pr-3 text-right tabular-nums">{winners}</td>
                                      <td className="py-1 text-right font-semibold tabular-nums">
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
                    </Fragment>
                  );
                })}
                {!drawCalcRows.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-3 text-lg font-bold">Holidays (no draw)</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
              placeholder="Holiday name"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
            <input
              type="date"
              className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
            <button
              type="button"
              className="h-9 rounded-full bg-violet-600 px-4 text-xs font-bold text-white"
              onClick={() => {
                if (!holidayName.trim()) {
                  toast("Name required", true);
                  return;
                }
                addHoliday({ date: holidayDate, name: holidayName.trim() });
                setHolidayName("");
                toast("Holiday added");
              }}
            >
              Add
            </button>
            <button
              type="button"
              className="h-9 rounded-full border border-slate-300 px-4 text-xs font-bold"
              onClick={() => {
                const y = new Date().getFullYear();
                importHolidays(arubaHolidaysForYear(y));
                toast("Imported Aruba holidays for " + y);
              }}
            >
              Import Aruba {new Date().getFullYear()}
            </button>
          </div>
          <ul className="space-y-1">
            {holidays
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h) => (
                <li
                  key={h.id || h.date + h.name}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span>
                    <span className="font-mono text-xs text-slate-500">{h.date}</span>{" "}
                    <span className="font-semibold">{h.name}</span>
                  </span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => deleteHoliday(h.id)}
                    aria-label="Delete holiday"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
