"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ScrapeButtons } from "./ScrapeButtons";

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

export function ResultsPanel() {
  const {
    games,
    drawResults,
    holidays,
    setResults,
    addHoliday,
    deleteHoliday,
    toast,
    currency,
  } = useStore();
  const [gameId, setGameId] = useState(games[0]?.id || "");
  const [d, setD] = useState(() => new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");
  const [whe, setWhe] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calCursor, setCalCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const g = games.find((x) => x.id === gameId);
  const sessions = g?.sessions || [];

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const calCells = useMemo(() => {
    const { y, m } = calCursor;
    const firstDow = new Date(y, m, 1).getDay();
    const dim = daysInMonth(y, m);
    const cells: { day: number | null; dateStr?: string; games: { id: string; color: string; name: string }[]; holiday?: string; noDraw: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null, games: [], noDraw: false });
    for (let day = 1; day <= dim; day++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dow = new Date(y, m, day).getDay();
      const hol = holidays.find((h) => h.date === dateStr);
      const dayGames = games.filter((gg) => {
        if (!gg.enabled) return false;
        if (hol) return false;
        if (gg.draw_days && gg.draw_days.length && !gg.draw_days.includes(dow)) return false;
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
    if (!gameId) return toast("Select a game", true);
    if (g?.format === "whe") {
      const n = parseInt(whe, 10);
      if (!n || n < 1 || n > 36) return toast("Play Whe mark 1–36 required", true);
      setResults({
        game_id: gameId,
        draw_date: d,
        session: session || undefined,
        whe: n,
        source: "manual",
      });
    } else if (g?.format === "digit") {
      if (!first.trim()) return toast("1st number required", true);
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
  }

  const monthLabel = new Date(calCursor.y, calCursor.m, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Calendar */}
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
              ←
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
              →
            </button>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--mut)]">
          {"SMTWTFS".split("").map((x, i) => (
            <div key={i}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calCells.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={!c.day}
              onClick={() => c.dateStr && setD(c.dateStr)}
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
              {c.day && (
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
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--mut)]">
          {games.filter((gg) => gg.enabled).map((gg) => (
            <span key={gg.id} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: gg.color }} />
              {gg.name}
            </span>
          ))}
          <span className="text-rose-600">Holiday / no draw days marked</span>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Results & winners</h2>
        <p className="text-xs text-[var(--mut)]">
          Enter draw numbers or scrape external sources (set SCRAPE_*_URL env).
        </p>
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
                <option value="">—</option>
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
              Play Whe (1–36)
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={whe}
                onChange={(e) => setWhe(e.target.value)}
              />
            </label>
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

        {drawResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-bold">Recent results</h3>
            {drawResults.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex justify-between rounded-xl bg-[var(--key)] px-3 py-2 text-xs"
              >
                <span>
                  {games.find((x) => x.id === r.game_id)?.name || r.game_id} · {r.draw_date}
                  {r.session ? ` · ${r.session}` : ""}
                </span>
                <span className="font-mono font-bold">
                  {r.whe != null
                    ? `Whe ${r.whe}`
                    : [r.first, r.second, r.third].filter(Boolean).join(" / ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Holidays / no-draw days</h2>
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
              if (!holidayName.trim()) return toast("Name required", true);
              addHoliday({ date: holidayDate, name: holidayName.trim() });
              setHolidayName("");
              toast("Holiday added");
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
            <p className="text-xs text-[var(--mut)]">No holidays configured.</p>
          )}
        </div>
        <p className="text-[11px] text-[var(--mut)]">Currency {currency} · {holidaySet.size} holiday date(s)</p>
      </div>
    </div>
  );
}
