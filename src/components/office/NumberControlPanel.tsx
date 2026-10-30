"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Pause, Play, Search, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { BlockedNumber, Game } from "@/lib/types";
import { arubaToday } from "@/lib/dates";
import {
  PATTERN_RE,
  describeUntil,
  findBlocked,
  newBlockedId,
  parseNumberList,
  ruleStatus,
  type RuleStatus,
} from "@/lib/blocked-numbers";

const card = "rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm";
const field = "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm";

const STATUS_STYLE: Record<RuleStatus, string> = {
  active: "bg-rose-100 text-rose-700",
  paused: "bg-slate-100 text-slate-500",
  expired: "bg-slate-200 text-slate-500",
};
const STATUS_LABEL: Record<RuleStatus, string> = { active: "Sold out", paused: "Paused", expired: "Expired" };

type Duration = "forever" | "today" | "date";

export function NumberControlPanel() {
  const { games, betTypes, blockedNumbers, setBlockedNumbers, user, toast } = useStore();
  const today = arubaToday();

  const eligible = useMemo(
    () => games.filter((g) => g.format === "digit" || g.format === "zodiac" || g.format === "whe"),
    [games]
  );
  const [gameId, setGameId] = useState(eligible[0]?.id || "");
  const game: Game | undefined = eligible.find((g) => g.id === gameId) ?? eligible[0];
  const isWhe = game?.format === "whe";

  const [text, setText] = useState("");
  const [allTypes, setAllTypes] = useState(true);
  const [typeKeys, setTypeKeys] = useState<string[]>([]);
  const [perms, setPerms] = useState(false);
  const [duration, setDuration] = useState<Duration>("forever");
  const [untilDate, setUntilDate] = useState(today);
  const [reason, setReason] = useState("");

  const [filterGame, setFilterGame] = useState("");
  const [search, setSearch] = useState("");
  const [showExpired, setShowExpired] = useState(false);

  const [testGame, setTestGame] = useState("");
  const [testNum, setTestNum] = useState("");
  const [testDate, setTestDate] = useState(today);

  const gameBets = useMemo(() => {
    if (!game) return [];
    const keys = game.bet_types?.length ? game.bet_types : betTypes.map((b) => b.key);
    return betTypes.filter((b) => keys.includes(b.key) && b.mode !== "jackpot" && b.mode !== "fast_play");
  }, [game, betTypes]);

  function add() {
    if (!game) return toast("Choose a game", true);
    const { numbers, invalid } = parseNumberList(text);
    if (!numbers.length) return toast("Type at least one number (e.g. 2323, 4444 or 23**)", true);
    if (invalid.length) return toast(`Not valid: ${invalid.join(", ")} (digits and * only, up to 6)`, true);
    if (isWhe) {
      const bad = numbers.filter((n) => !/^\d+$/.test(n) || Number(n) < 1 || Number(n) > 36);
      if (bad.length) return toast(`Play Whe marks are 1–36 (not valid: ${bad.join(", ")})`, true);
    }
    if (duration === "date" && (!untilDate || untilDate < today)) return toast("Choose a date from today onwards", true);
    if (!allTypes && !typeKeys.length) return toast("Choose at least one play type", true);

    const until = duration === "today" ? today : duration === "date" ? untilDate : undefined;
    const bet_types = isWhe || allTypes ? undefined : typeKeys;
    const now = new Date().toISOString();
    const fresh: BlockedNumber[] = [];
    let skipped = 0;
    for (const n of numbers) {
      const dup = blockedNumbers.some(
        (r) =>
          r.game_id === game.id &&
          r.number === n &&
          r.enabled &&
          (!r.until || r.until >= today) &&
          JSON.stringify(r.bet_types ?? []) === JSON.stringify(bet_types ?? []) &&
          !!r.permutations === (perms && !n.includes("*") && !isWhe) &&
          r.until === until
      );
      if (dup) {
        skipped++;
        continue;
      }
      fresh.push({
        id: newBlockedId(),
        game_id: game.id,
        number: isWhe ? String(Number(n)) : n,
        bet_types,
        permutations: perms && !n.includes("*") && !isWhe ? true : undefined,
        until,
        enabled: true,
        reason: reason.trim() || undefined,
        created_at: now,
        created_by: user?.name || user?.email,
      });
    }
    if (!fresh.length) return toast("Those numbers are already blocked", true);
    setBlockedNumbers([...fresh, ...blockedNumbers]);
    setText("");
    setReason("");
    toast(`${fresh.length} number${fresh.length === 1 ? "" : "s"} blocked${skipped ? ` (${skipped} already blocked)` : ""}`);
  }

  function patch(id: string, p: Partial<BlockedNumber>) {
    setBlockedNumbers(blockedNumbers.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }
  function remove(r: BlockedNumber) {
    setBlockedNumbers(blockedNumbers.filter((x) => x.id !== r.id));
    toast(`${r.number} is available again`);
  }
  function clearExpired() {
    const keep = blockedNumbers.filter((r) => ruleStatus(r, today) !== "expired");
    toast(`${blockedNumbers.length - keep.length} expired rule(s) removed`);
    setBlockedNumbers(keep);
  }

  const rows = useMemo(() => {
    const q = search.trim();
    return blockedNumbers
      .filter(
        (r) =>
          (!filterGame || r.game_id === filterGame) &&
          (showExpired || ruleStatus(r, today) !== "expired") &&
          (!q || r.number.includes(q) || (r.reason || "").toLowerCase().includes(q.toLowerCase()))
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [blockedNumbers, filterGame, search, showExpired, today]);

  const expiredCount = blockedNumbers.filter((r) => ruleStatus(r, today) === "expired").length;
  const activeCount = blockedNumbers.filter((r) => ruleStatus(r, today) === "active").length;
  const nameOf = (id: string) => games.find((g) => g.id === id)?.name || id;
  const betLabel = (k: string) => betTypes.find((b) => b.key === k)?.label || k;

  // "Test a number"
  const tGame = eligible.find((g) => g.id === (testGame || eligible[0]?.id));
  const tDigits = testNum.replace(/\D/g, "");
  const tHit =
    tGame && tDigits
      ? ["_any", ...(tGame.bet_types || [])]
          .map((bt) => findBlocked(blockedNumbers, tGame, bt === "_any" ? (tGame.format === "zodiac" ? "zodiac" : tGame.format === "whe" ? "play_whe" : "") : bt, tDigits, testDate))
          .find(Boolean) ?? null
      : null;

  if (!eligible.length) {
    return <div className={card + " text-sm text-[var(--mut)]"}>Create a digit, zodiac or Play Whe game first.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Ban size={18} /> Number control
            </h2>
            <p className="max-w-2xl text-xs text-[var(--mut)]">
              Block numbers you do not want to sell, for example a popular number that comes up often. Sellers see
              &ldquo;sold out&rdquo; and cannot add it to a ticket. Terminals pick up changes within about 30 seconds and
              check again at the moment of sale.
            </p>
          </div>
          <div className="rounded-xl bg-[var(--key)] px-3 py-2 text-center">
            <div className="text-xl font-black text-rose-600">{activeCount}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--mut)]">Blocked now</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Game
            <select className={field + " h-10"} value={game?.id} onChange={(e) => { setGameId(e.target.value); setTypeKeys([]); setAllTypes(true); }}>
              {eligible.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            {isWhe ? "Marks to block (1–36)" : "Numbers to block"}
            <input
              className={field + " h-10 font-mono"}
              placeholder={isWhe ? "7, 12, 25" : "2323, 4444   or   23** (any ending)"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
        </div>
        {!isWhe && (
          <p className="mt-1 text-[11px] text-[var(--mut)]">
            Separate several numbers with commas or spaces. Use <code className="rounded bg-[var(--key)] px-1">*</code> for any
            digit: <code className="rounded bg-[var(--key)] px-1">23**</code> blocks 2300–2399,{" "}
            <code className="rounded bg-[var(--key)] px-1">**99</code> blocks every number ending 99.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!isWhe && (
            <div>
              <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">Which plays</div>
              <label className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={allTypes} onChange={() => setAllTypes(true)} /> All play types
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={!allTypes} onChange={() => setAllTypes(false)} /> Only some
              </label>
              {!allTypes && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {gameBets.map((b) => {
                    const on = typeKeys.includes(b.key);
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setTypeKeys(on ? typeKeys.filter((k) => k !== b.key) : [...typeKeys, b.key])}
                        className={"rounded-full px-3 py-1.5 text-xs font-bold " + (on ? "bg-indigo-600 text-white" : "border border-[var(--line)]")}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {game?.format === "digit" && (
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-indigo-600" checked={perms} onChange={(e) => setPerms(e.target.checked)} />
                  <span>
                    <span className="font-bold">Also block any order</span>
                    <span className="block text-xs text-[var(--mut)]">2323 would also block 3232, 2233, 3322…</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">For how long</div>
            <div className="space-y-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={duration === "forever"} onChange={() => setDuration("forever")} /> Until I remove it
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={duration === "today"} onChange={() => setDuration("today")} /> Today only
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={duration === "date"} onChange={() => setDuration("date")} /> Until draws on
                <input
                  type="date"
                  min={today}
                  disabled={duration !== "date"}
                  className="h-9 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-sm disabled:opacity-50"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 block text-[11px] font-semibold text-[var(--mut)]">
              Note (optional, for the back office)
              <input className={field + " h-10"} maxLength={80} placeholder="Too popular this week" value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </div>
        </div>

        <button type="button" onClick={add} className="mt-4 flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-bold text-white">
          <Ban size={15} /> Block number{text.includes(",") || text.trim().includes(" ") ? "s" : ""}
        </button>
      </div>

      {/* Test a number */}
      <div className={card}>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 size={15} /> Check a number
        </h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <select className={field + " h-10 !mt-0"} value={tGame?.id} onChange={(e) => setTestGame(e.target.value)}>
            {eligible.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input className={field + " h-10 !mt-0 font-mono"} placeholder="Number" value={testNum} onChange={(e) => setTestNum(e.target.value)} />
          <input type="date" className={field + " h-10 !mt-0"} value={testDate} onChange={(e) => setTestDate(e.target.value || today)} />
          <div
            className={
              "flex h-10 items-center justify-center rounded-xl text-sm font-extrabold " +
              (!tDigits ? "bg-[var(--key)] text-[var(--mut)]" : tHit ? "bg-rose-600 text-white" : "bg-emerald-100 text-emerald-700")
            }
          >
            {!tDigits ? "Type a number" : tHit ? "Sold out" : "Available to sell"}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-[var(--mut)]">Tests the rules below for a number as a seller would enter it (any play type).</p>
      </div>

      {/* Rules */}
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-bold">Blocked numbers ({rows.length})</h3>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
            <input className="h-9 w-40 rounded-xl border border-[var(--line)] bg-[var(--key)] pl-8 pr-2 text-sm" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-9 rounded-xl border border-[var(--line)] bg-[var(--key)] px-2 text-sm" value={filterGame} onChange={(e) => setFilterGame(e.target.value)}>
            <option value="">All games</option>
            {eligible.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--mut)]">
            <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} /> Show expired
          </label>
          {expiredCount > 0 && (
            <button type="button" onClick={clearExpired} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-bold">
              Remove {expiredCount} expired
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--mut)]">No blocked numbers. Everything is available to sell.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-[var(--mut)]">
                  <th className="py-2 pr-3">Number</th>
                  <th className="py-2 pr-3">Game</th>
                  <th className="py-2 pr-3">Plays</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = ruleStatus(r, today);
                  return (
                    <tr key={r.id} className="border-t border-[var(--line)] align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-mono text-xl font-black tracking-widest">{r.number}</div>
                        {r.permutations && <div className="text-[10px] font-bold text-indigo-600">any order</div>}
                        {!PATTERN_RE.test(r.number) ? null : r.number.includes("*") && <div className="text-[10px] font-bold text-violet-600">pattern</div>}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold">{nameOf(r.game_id)}</td>
                      <td className="py-2.5 pr-3 text-xs text-[var(--mut)]">{r.bet_types?.length ? r.bet_types.map(betLabel).join(", ") : "All"}</td>
                      <td className="py-2.5 pr-3 text-xs">
                        {describeUntil(r, today)}
                        {r.reason && <div className="text-[11px] text-[var(--mut)]">{r.reason}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          {st !== "expired" && (
                            <button
                              type="button"
                              onClick={() => patch(r.id, { enabled: !r.enabled })}
                              className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-bold"
                              title={r.enabled ? "Make it available again for now (keeps the rule)" : "Block again"}
                            >
                              {r.enabled ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Block</>}
                            </button>
                          )}
                          <button type="button" onClick={() => remove(r)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-rose-600" title="Remove rule (number becomes available)">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
