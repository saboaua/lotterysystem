"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Copy,
  Delete,
  Dice5,
  Printer,
  RotateCcw,
  Ticket,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, TicketLine } from "@/lib/types";
import { ZODIAC_SYMBOLS } from "@/lib/constants";
import { printReceipt } from "@/lib/print-receipt";
import {
  SessionsPicker,
  MultiDrawPicker,
  ZodiacPicker,
  PlayWhePicker,
  JackpotPicker,
} from "@/components/sell/GamePickers";
import { FastPlaySellGrid } from "@/components/sell/FastPlaySellGrid";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [0.5, 1, 2, 3, 5, 7, 10, 20, 50, 100];
const BUMPS = [0.5, 1, 5];

export function SellScreen() {
  const {
    games,
    fastPlayGames,
    betTypes,
    currency,
    lines,
    addLine,
    removeLine,
    clearLines,
    sellTicket,
    selectedRetailerId,
    retailers,
    total,
    toast,
    brand,
    ticketDesign,
  } = useStore();

  const enabled = games.filter((g) => g.enabled);
  const [sel, setSel] = useState<string[]>([]);
  const [bt, setBt] = useState("4_cifra");
  const [num, setNum] = useState("");
  const [amt, setAmt] = useState("2");
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [session, setSession] = useState("");
  const [multiDraw, setMultiDraw] = useState(1);
  const [heldLines, setHeldLines] = useState<TicketLine[] | null>(null);
  const [lastPlay, setLastPlay] = useState<{
    num: string;
    amt: string;
    bt: string;
  } | null>(null);
  const [zodiacPick, setZodiacPick] = useState<string[]>([]);
  const [allZodiac, setAllZodiac] = useState(false);
  const [whePick, setWhePick] = useState<number | null>(null);
  const [jackBalls, setJackBalls] = useState<string[]>([]);
  const [jackMega, setJackMega] = useState<string | null>(null);
  const [sellTab, setSellTab] = useState<"lottery" | "fast_play">("lottery");

  const primary: Game | undefined = useMemo(
    () => (sel.length ? enabled.find((g) => g.id === sel[0]) : undefined),
    [enabled, sel]
  );

  const allowedBets = useMemo(() => {
    if (!primary) return [];
    if (primary.format === "digit") {
      const keys = primary.bet_types?.length
        ? primary.bet_types
        : [
            "4_cifra",
            "3_cifra",
            "2_cifra_3ch",
            "4_skina",
            "3_skina",
            "2_cifra_bf",
            "2_cifra_b",
          ];
      return betTypes.filter((b) => b.enabled && keys.includes(b.key));
    }
    if (primary.format === "zodiac") return betTypes.filter((b) => b.key === "zodiac");
    if (primary.format === "whe") return betTypes.filter((b) => b.key === "play_whe");
    if (primary.format === "jackpot") return betTypes.filter((b) => b.key === "jackpot");
    return [];
  }, [primary, betTypes]);

  const activeBet = allowedBets.find((b) => b.key === bt) || allowedBets[0];
  const digits =
    primary?.format === "zodiac"
      ? primary.digits || 4
      : primary?.format === "whe"
        ? 2
        : activeBet?.digits ?? primary?.digits ?? 4;

  useEffect(() => {
    if (allowedBets.length && !allowedBets.find((b) => b.key === bt)) {
      setBt(allowedBets[0].key);
    }
  }, [allowedBets, bt]);

  useEffect(() => {
    if (primary?.sessions?.length) {
      if (!session || !primary.sessions.find((s) => s.id === session)) {
        setSession(primary.sessions[0].id);
      }
    } else setSession("");
  }, [primary, session]);

  useEffect(() => {
    if (primary?.format === "jackpot" && primary.min_stake != null) {
      setAmt(String(primary.min_stake));
    }
  }, [primary?.id, primary?.format, primary?.min_stake]);

  function toggleGame(id: string) {
    const g = enabled.find((x) => x.id === id);
    if (!g) return;
    if (g.format !== "digit") {
      setSel([id]);
    } else {
      setSel((s) => {
        const others = s.filter((x) => {
          const gg = enabled.find((y) => y.id === x);
          return gg?.format === "digit";
        });
        if (others.includes(id)) return others.length > 1 ? others.filter((x) => x !== id) : others;
        return [...others, id];
      });
    }
    setNum("");
    setZodiacPick([]);
    setAllZodiac(false);
    setWhePick(null);
    setJackBalls([]);
    setJackMega(null);
  }

  function pressKey(k: string | number) {
    if (k === "CLR") {
      if (field === "num") {
        setNum("");
        setWhePick(null);
      } else setAmt("");
      return;
    }
    if (k === "DEL") {
      if (field === "num") setNum((n) => n.slice(0, -1));
      else setAmt((a) => a.slice(0, -1));
      return;
    }
    if (field === "num") {
      if (primary?.format === "whe") {
        const next = (num + String(k)).slice(-2);
        setNum(next);
        const n = parseInt(next, 10);
        if (n >= 1 && n <= 36) setWhePick(n);
      } else if (primary?.format === "digit" || primary?.format === "zodiac") {
        setNum((n) => (n.length >= digits ? n : n + String(k)));
      }
    } else {
      if (String(k) === "." && amt.includes(".")) return;
      setAmt((a) => a + String(k));
    }
  }

  function addPlay() {
    if (!primary) {
      toast("Select a game", true);
      return;
    }
    let amount = parseFloat(amt);
    if (primary.format === "jackpot" && primary.min_stake != null) {
      amount = primary.min_stake;
    }
    if (!amount || amount <= 0) {
      toast("Enter amount", true);
      return;
    }
    if (primary.format !== "jackpot") {
      if (primary.min_stake != null && amount < primary.min_stake) {
        toast("Min stake " + currency + " " + primary.min_stake, true);
        return;
      }
      if (primary.max_stake != null && amount > primary.max_stake) {
        toast("Max stake " + currency + " " + primary.max_stake, true);
        return;
      }
    }
    const dates = [date];
    if (multiDraw > 1 && primary.format === "digit") {
      const d0 = new Date(date + "T12:00:00");
      for (let i = 1; i < multiDraw; i++) {
        const d = new Date(d0);
        d.setDate(d0.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    if (primary.format === "digit") {
      if (num.length < digits) {
        toast("Enter " + digits + "-digit number", true);
        return;
      }
      const number = num.padStart(digits, "0").slice(0, digits);
      setLastPlay({ num: number, amt: String(amount), bt });
      for (const gid of sel) {
        for (const dd of dates) {
          addLine({
            game: gid,
            bet_type: bt,
            number,
            amount,
            date: dd,
            session: session || undefined,
          });
        }
      }
      setNum("");
    } else if (primary.format === "zodiac") {
      const syms = allZodiac ? ZODIAC_SYMBOLS.map((z) => z.id) : zodiacPick;
      if (!syms.length) {
        toast("Pick at least one sign", true);
        return;
      }
      const need = primary.digits || 4;
      if (num.length < need) {
        toast("Enter " + need + "-digit number", true);
        return;
      }
      const number = num.padStart(need, "0").slice(0, need);
      setLastPlay({ num: number, amt: String(amount), bt: "zodiac" });
      for (const z of syms) {
        addLine({
          game: primary.id,
          bet_type: "zodiac",
          number: number + "-" + z,
          amount,
          date,
          symbols: [z],
        });
      }
      setNum("");
      setZodiacPick([]);
      setAllZodiac(false);
    } else if (primary.format === "whe") {
      if (whePick == null) {
        toast("Pick a Play Whe mark", true);
        return;
      }
      addLine({
        game: primary.id,
        bet_type: "play_whe",
        number: String(whePick),
        amount,
        date,
        session: session || undefined,
      });
      setWhePick(null);
      setNum("");
    } else if (primary.format === "jackpot") {
      const need = primary.main_count ?? 5;
      if (jackBalls.length !== need) {
        toast("Pick " + need + " numbers", true);
        return;
      }
      if (primary.mega_count && !jackMega) {
        toast("Pick mega", true);
        return;
      }
      addLine({
        game: primary.id,
        bet_type: "jackpot",
        number:
          [...jackBalls].sort().join("-") + (jackMega ? "+" + jackMega : ""),
        amount,
        date,
        balls: jackBalls.map(Number).sort((a, b) => a - b),
        mega: jackMega ? Number(jackMega) : undefined,
      });
      setJackBalls([]);
      setJackMega(null);
    }
    setField("num");
    toast("Play added");
  }

  function sendTicket() {
    if (!lines.length) {
      toast("No plays on ticket", true);
      return;
    }
    const t = sellTicket();
    if (!t) return;
    try {
      printReceipt({
        ticket: t,
        brand,
        design: ticketDesign,
        retailer: retailers.find((r) => r.id === selectedRetailerId),
        games,
        currency,
      });
    } catch {
      /* popup blocked */
    }
    toast("Ticket " + t.id + " sold - " + currency + " " + t.total.toFixed(2));
  }

  function holdOrder() {
    if (lines.length) {
      setHeldLines(lines.map((l) => ({ ...l })));
      clearLines();
      toast("Order held");
      return;
    }
    if (heldLines && heldLines.length) {
      heldLines.forEach((l) => {
        addLine({
          game: l.game,
          bet_type: l.bet_type,
          number: l.number,
          amount: l.amount,
          date: l.date,
          session: l.session,
          symbols: l.symbols,
          balls: l.balls,
          mega: l.mega,
        });
      });
      setHeldLines(null);
      toast("Order recalled");
      return;
    }
    toast("Nothing to hold", true);
  }

  function quickPick() {
    if (!primary) {
      toast("Select a game", true);
      return;
    }
    if (primary.format === "digit") {
      let s = "";
      for (let i = 0; i < digits; i++) s += Math.floor(Math.random() * 10);
      setNum(s);
      setField("num");
    } else if (primary.format === "zodiac") {
      const z = ZODIAC_SYMBOLS[Math.floor(Math.random() * ZODIAC_SYMBOLS.length)];
      setZodiacPick([z.id]);
      setAllZodiac(false);
      const need = primary.digits || 4;
      let s = "";
      for (let i = 0; i < need; i++) s += Math.floor(Math.random() * 10);
      setNum(s);
      setField("num");
    } else if (primary.format === "whe") {
      const n = Math.floor(Math.random() * 36) + 1;
      setWhePick(n);
      setNum(String(n));
    } else if (primary.format === "jackpot") {
      const max = primary.main_max ?? 30;
      const need = primary.main_count ?? 5;
      const set = new Set<string>();
      while (set.size < need)
        set.add(String(Math.floor(Math.random() * max) + 1).padStart(2, "0"));
      setJackBalls([...set]);
      if (primary.mega_max) {
        setJackMega(
          String(Math.floor(Math.random() * primary.mega_max) + 1).padStart(2, "0")
        );
      }
    }
  }

  function copyLast() {
    if (!lastPlay) {
      toast("No last play", true);
      return;
    }
    setNum(lastPlay.num);
    setAmt(lastPlay.amt);
    setBt(lastPlay.bt);
    setField("num");
    toast("Last play copied");
  }

  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const digitSlots = Array.from({ length: digits }, (_, i) => num[i] || "");
  const amtDisplay = amt || "0";
  const minStake = primary?.min_stake ?? 0.25;

  function gameStatus(g: Game) {
    const [hh, mm] = (g.cutoff || "12:00").split(":").map(Number);
    const now = new Date();
    const cut = new Date();
    cut.setHours(hh, mm, 0, 0);
    if (g.format === "digit" && now > cut && !g.sessions?.length) {
      return { closed: true, label: "Closed" };
    }
    const mins = Math.floor((cut.getTime() - now.getTime()) / 60000);
    if (g.jackpot_current) {
      return {
        closed: false,
        label: mins > 0 ? "closes " + mins + "m" : g.draw_time || "",
      };
    }
    if (mins < 0) return { closed: false, label: g.draw_time || "" };
    return {
      closed: false,
      label: mins < 60 ? "closes " + mins + "m" : "Draw " + (g.draw_time || ""),
    };
  }

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6fb] dark:bg-slate-950">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:p-4">
        <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setSellTab("lottery")}
            className={
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold transition " +
              (sellTab === "lottery"
                ? "bg-violet-600 text-white shadow"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")
            }
          >
            <Ticket size={16} strokeWidth={2.25} />
            Lottery
          </button>
          <button
            type="button"
            onClick={() => setSellTab("fast_play")}
            className={
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold transition " +
              (sellTab === "fast_play"
                ? "bg-rose-500 text-white shadow"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")
            }
          >
            <Zap size={16} strokeWidth={2.25} />
            Fast Play
          </button>
        </div>

        {sellTab === "fast_play" ? (
          <FastPlaySellGrid />
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Select Game
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                  {enabled.length} Games Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {enabled.map((g) => {
                  const on = sel.includes(g.id);
                  const st = gameStatus(g);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGame(g.id)}
                      className={
                        "relative overflow-hidden rounded-2xl p-3 text-left text-white shadow-sm transition " +
                        (on
                          ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#f4f6fb]"
                          : st.closed
                            ? "opacity-45 grayscale"
                            : "hover:brightness-105")
                      }
                      style={{
                        background:
                          "linear-gradient(145deg, " +
                          g.color +
                          ", color-mix(in srgb, " +
                          g.color +
                          " 50%, #000))",
                      }}
                    >
                      {on && (
                        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-emerald-600 shadow">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      <div className="flex items-center gap-2 pr-5">
                        {g.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.logo}
                            alt=""
                            className="h-8 w-8 rounded-lg border border-white/30 object-cover"
                          />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-black/20 text-[10px] font-black">
                            {g.format === "jackpot"
                              ? "JP"
                              : g.format === "zodiac"
                                ? "Z"
                                : g.format === "whe"
                                  ? "W"
                                  : String(g.digits) + "d"}
                          </div>
                        )}
                        <span className="text-sm font-extrabold leading-tight">{g.name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1 text-[10px] font-semibold opacity-95">
                        <span className="rounded bg-black/25 px-1.5 py-0.5 uppercase">
                          {g.format === "digit"
                            ? String(g.digits) + "d"
                            : g.format === "jackpot"
                              ? "Jackpot"
                              : g.format === "zodiac"
                                ? "Zodiac"
                                : "Whe"}
                        </span>
                        <span className="truncate text-right">
                          {g.jackpot_current
                            ? "AWG " + g.jackpot_current.toLocaleString()
                            : st.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Draw target
                </span>
                <SessionsPicker primary={primary} session={session} setSession={setSession} />
                <input
                  type="date"
                  value={date}
                  min={today()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="mt-2">
                <MultiDrawPicker
                  primary={primary}
                  multiDraw={multiDraw}
                  setMultiDraw={setMultiDraw}
                />
              </div>
            </div>

            {allowedBets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allowedBets.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => {
                      setBt(b.key);
                      setNum("");
                    }}
                    className={
                      "h-9 rounded-full px-3.5 text-xs font-bold shadow-sm " +
                      (bt === b.key
                        ? "bg-violet-600 text-white"
                        : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-300")
                    }
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            <ZodiacPicker
              primary={primary}
              zodiacPick={zodiacPick}
              setZodiacPick={setZodiacPick}
              allZodiac={allZodiac}
              setAllZodiac={setAllZodiac}
            />
            <PlayWhePicker primary={primary} whePick={whePick} setWhePick={setWhePick} setNum={setNum} />
            <JackpotPicker
              primary={primary}
              jackBalls={jackBalls}
              setJackBalls={setJackBalls}
              jackMega={jackMega}
              setJackMega={setJackMega}
            />

            {/* Dual pads */}
            <div className="rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Number ({activeBet?.label || "play"})
                    </span>
                    <span className="text-[11px] font-bold text-violet-600">
                      {num.length}/{digits} digits
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("num")}
                    className={
                      "mb-2 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 bg-slate-50 px-2 py-2 font-mono text-2xl font-extrabold dark:bg-slate-800 " +
                      (field === "num" ? "border-violet-500" : "border-transparent")
                    }
                  >
                    {digitSlots.map((dd, i) => (
                      <span
                        key={i}
                        className={
                          "grid h-11 w-9 place-items-center rounded-lg " +
                          (dd
                            ? "bg-violet-600 text-white"
                            : "bg-slate-200 text-slate-400 dark:bg-slate-700")
                        }
                      >
                        {dd || "_"}
                      </span>
                    ))}
                  </button>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, "CLR", 0, "DEL"].map((k) => (
                      <button
                        key={String(k)}
                        type="button"
                        onClick={() => {
                          setField("num");
                          pressKey(k);
                        }}
                        className={
                          "flex h-12 items-center justify-center rounded-xl text-lg font-bold shadow-sm " +
                          (k === "CLR" || k === "DEL"
                            ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                            : "bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-100")
                        }
                      >
                        {k === "DEL" ? <Delete size={16} /> : k}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={quickPick}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-violet-100 text-xs font-bold text-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                    >
                      <Dice5 size={14} /> Random Pick
                    </button>
                    <button
                      type="button"
                      onClick={copyLast}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800"
                    >
                      <Copy size={14} /> Copy last play
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Wager amount ({currency})
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      MIN {currency} {minStake}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("amt")}
                    className={
                      "mb-2 flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 bg-slate-50 font-mono text-3xl font-extrabold dark:bg-slate-800 " +
                      (field === "amt" ? "border-emerald-500" : "border-transparent")
                    }
                  >
                    {amtDisplay}
                  </button>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESETS.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setAmt(String(p));
                          setField("amt");
                        }}
                        className="flex h-12 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
                      >
                        <span className="text-[9px] font-bold opacity-70">{currency}</span>
                        <span className="text-sm font-extrabold">{p}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {PRESETS.slice(6).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setAmt(String(p));
                          setField("amt");
                        }}
                        className="flex h-11 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-800 dark:bg-violet-950/30"
                      >
                        <span className="text-[8px] font-bold opacity-70">{currency}</span>
                        <span className="text-xs font-extrabold">{p}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setField("amt")}
                      className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800"
                    >
                      Custom
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {BUMPS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          const n = (parseFloat(amt) || 0) + b;
                          setAmt(String(Math.round(n * 100) / 100));
                          setField("amt");
                        }}
                        className="h-10 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800"
                      >
                        +{b.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const n = Math.max(0, (parseFloat(amt) || 0) - 1);
                        setAmt(String(Math.round(n * 100) / 100));
                      }}
                      className="h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800"
                    >
                      − 1.00 {currency}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmt("2")}
                      className="flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800"
                    >
                      <RotateCcw size={12} /> Reset (2.00)
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={addPlay}
                className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-base font-extrabold text-white shadow-lg shadow-violet-600/30"
              >
                Add play to ticket
              </button>
            </div>
          </>
        )}
      </section>

      <aside className="flex w-full max-w-sm flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Ticket · {shop?.name || "Shop"}
              </div>
              <div className="font-mono text-xl font-extrabold text-violet-600">
                {currency} {total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {lines.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <span className="text-3xl opacity-40">🎫</span>
              <span className="text-sm">No plays yet</span>
            </div>
          )}
          {lines.map((l) => {
            const gg =
              games.find((x) => x.id === l.game) ||
              fastPlayGames.find((x) => x.id === l.game);
            const isFast = l.bet_type === "fast_play";
            return (
              <div
                key={l.id}
                className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: gg?.color || (isFast ? "#e11d48" : "#7c3aed"),
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{gg?.name || l.number || l.game}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {isFast ? "Fast Play" : `${l.number} · ${l.bet_type}`}
                  </div>
                  <div className="text-xs font-semibold">
                    {currency} {l.amount.toFixed(2)}
                  </div>
                </div>
                <button type="button" onClick={() => removeLine(l.id)} className="text-rose-500">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Lines count: {lines.length} plays</span>
            <span>
              Net Payable:{" "}
              <b className="text-violet-600">
                {currency} {total.toFixed(2)}
              </b>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={clearLines}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-bold dark:border-slate-700"
            >
              <Trash2 size={14} /> Clear Ticket
            </button>
            <button
              type="button"
              onClick={holdOrder}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-bold dark:border-slate-700"
            >
              <Bookmark size={14} /> {heldLines && !lines.length ? "Recall" : "Hold Order"}
            </button>
          </div>
          <button
            type="button"
            onClick={sendTicket}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-white shadow-lg shadow-emerald-500/30"
          >
            <Printer size={18} /> Send & Print
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">F12</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

export default SellScreen;
