"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Delete,
  Printer,
  RotateCcw,
  Ticket,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, TicketLine } from "@/lib/types";
import { ZODIAC_SYMBOLS } from "@/lib/constants";
import { addDays, arubaToday as today } from "@/lib/dates";
import { printReceipt } from "@/lib/print-receipt";
import {
  SessionsPicker,
  MultiDrawPicker,
  ZodiacPicker,
  PlayWhePicker,
  JackpotPicker,
} from "@/components/sell/GamePickers";
import { FastPlaySellGrid } from "@/components/sell/FastPlaySellGrid";
import { TopUpModal } from "@/components/sell/TopUpModal";
import { getTopUpDesign } from "@/lib/topup";


const PRESETS = [0.5, 1, 2, 3, 5, 7, 10, 20, 50, 100];
const BUMPS = [0.5, 1, 5];

export function SellScreen() {
  const {
    games,
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
    soldTickets,
    replayTicket,
  } = useStore();

  const enabled = [...games]
    .filter((g) => g.enabled)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    );
  const [sel, setSel] = useState<string[]>([]);
  const [bt, setBt] = useState("4_cifra");
  const [num, setNum] = useState("");
  const [amt, setAmt] = useState(""); // no stake preselected
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [session, setSession] = useState("");
  const [multiDraw, setMultiDraw] = useState(1);
  const [heldLines, setHeldLines] = useState<TicketLine[] | null>(null);
  const [zodiacPick, setZodiacPick] = useState<string[]>([]);
  const [allZodiac, setAllZodiac] = useState(false);
  const [whePicks, setWhePicks] = useState<number[]>([]);
  const [jackBalls, setJackBalls] = useState<string[]>([]);
  const [jackMega, setJackMega] = useState<string | null>(null);
  const [sellTab, setSellTab] = useState<"lottery" | "fast_play">("lottery");
  const [modal, setModal] = useState<null | "replay" | "scan">(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    ticket?: (typeof soldTickets)[0];
  } | null>(null);

  const primary: Game | undefined = useMemo(
    () => (sel.length ? enabled.find((g) => g.id === sel[0]) : undefined),
    [enabled, sel]
  );

  const allowedBets = useMemo(() => {
    if (!primary) {
      // No game selected yet: show the standard digit bet types so the keypad is usable
      return betTypes.filter(
        (b) =>
          b.enabled &&
          ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"].includes(b.key)
      );
    }
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
    setWhePicks([]);
    setJackBalls([]);
    setJackMega(null);
  }

  function pressKey(k: string | number) {
    if (k === "CLR") {
      if (field === "num") {
        setNum("");
        setWhePicks([]);
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
        // Typed mark is held in `num` and added to the selection when the play is added.
        setNum((num + String(k)).slice(-2));
      } else if (!primary || primary.format === "digit" || primary.format === "zodiac") {
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
      for (let i = 1; i < multiDraw; i++) dates.push(addDays(date, i));
    }
    if (primary.format === "digit") {
      if (num.length < digits) {
        toast("Enter " + digits + "-digit number", true);
        return;
      }
      const number = num.padStart(digits, "0").slice(0, digits);
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
      const typed = parseInt(num, 10);
      const marks = Array.from(
        new Set([...whePicks, ...(typed >= 1 && typed <= 36 ? [typed] : [])])
      ).sort((a, b) => a - b);
      if (!marks.length) {
        toast("Pick at least one Play Whe mark", true);
        return;
      }
      for (const mark of marks) {
        addLine({
          game: primary.id,
          bet_type: "play_whe",
          number: String(mark),
          amount,
          date,
          session: session || undefined,
        });
      }
      setWhePicks([]);
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
      setWhePicks([n]);
      setNum("");
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

  function openReplay() {
    setSerialInput("");
    setScanResult(null);
    setModal("replay");
  }

  function openScan() {
    setSerialInput("");
    setScanResult(null);
    setModal("scan");
  }

  function submitReplay() {
    const id = serialInput.trim().toUpperCase();
    if (!id) {
      toast("Enter ticket serial number", true);
      return;
    }
    const t = soldTickets.find((x) => x.id === id);
    if (!t) {
      toast("Ticket not found", true);
      return;
    }
    if (t.status === "cancelled") {
      toast("Ticket was cancelled", true);
      return;
    }
    replayTicket(id);
    setModal(null);
    setSerialInput("");
  }

  function submitScan() {
    const id = serialInput.trim().toUpperCase();
    if (!id) {
      toast("Enter ticket serial number", true);
      return;
    }
    const t = soldTickets.find((x) => x.id === id);
    if (!t) {
      setScanResult({ ok: false, message: "Ticket not found" });
      return;
    }
    if (t.status === "paid") {
      setScanResult({
        ok: true,
        message: `Already paid · prize ${currency} ${(t.prize ?? 0).toFixed(2)}`,
        ticket: t,
      });
    } else if (t.status === "won") {
      setScanResult({
        ok: true,
        message: `Winner · claim ${currency} ${(t.prize ?? 0).toFixed(2)}`,
        ticket: t,
      });
    } else if (t.status === "cancelled") {
      setScanResult({ ok: false, message: "Ticket was cancelled", ticket: t });
    } else {
      setScanResult({
        ok: true,
        message: `Not a winner · sold ${currency} ${t.total.toFixed(2)}`,
        ticket: t,
      });
    }
  }

  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const digitSlots = Array.from({ length: digits }, (_, i) => num[i] || "");

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
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6fb] lg:flex-row dark:bg-slate-950">
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
          {getTopUpDesign(ticketDesign).enabled && (
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              <Wallet size={16} strokeWidth={2.25} />
              Top Up
            </button>
          )}
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
              <div className="grid auto-rows-[88px] grid-cols-2 gap-2 sm:grid-cols-3 md:auto-rows-[112px] md:grid-cols-4 xl:grid-cols-5">
                {enabled.map((g) => {
                  const on = sel.includes(g.id);
                  const st = gameStatus(g);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGame(g.id)}
                      className={
                        "relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-3 text-left text-white shadow-sm transition md:p-4 " +
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

            <>
            {!primary && (
              <p className="px-1 text-xs font-semibold text-slate-400">
                Select a game above to add plays to the ticket
              </p>
            )}
            {/* Draw target + multi-draw — matches POS mockup */}
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                    className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <MultiDrawPicker multiDraw={multiDraw} setMultiDraw={setMultiDraw} primary={primary} />
              </div>
            </div>

            {primary?.format === "zodiac" && (
              <ZodiacPicker
                primary={primary}
                zodiacPick={zodiacPick}
                setZodiacPick={setZodiacPick}
                allZodiac={allZodiac}
                setAllZodiac={setAllZodiac}
              />
            )}
            {primary?.format === "whe" && (
              <PlayWhePicker
                primary={primary}
                whePicks={whePicks}
                setWhePicks={setWhePicks}
                typed={parseInt(num, 10)}
              />
            )}
            {primary?.format === "jackpot" && (
              <JackpotPicker
                primary={primary}
                jackBalls={jackBalls}
                setJackBalls={setJackBalls}
                jackMega={jackMega}
                setJackMega={setJackMega}
              />
            )}

            {(!primary || primary.format === "digit" || primary.format === "zodiac") && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {/* Bet type pills */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                  {allowedBets.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => {
                        setBt(b.key);
                        setNum("");
                        setField("num");
                      }}
                      className={
                        "rounded-full px-3.5 py-1.5 text-xs font-bold transition md:min-h-[40px] md:py-2 " +
                        (bt === b.key
                          ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600")
                      }
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* Number + stake header */}
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div>
                    <div
                      className="flex gap-1.5 font-mono text-4xl font-black tracking-[0.15em] text-slate-900 dark:text-white sm:text-5xl"
                      onClick={() => setField("num")}
                      role="button"
                      tabIndex={0}
                    >
                      {digitSlots.map((d, i) => (
                        <span
                          key={i}
                          className={
                            "inline-flex h-12 min-w-[1.6rem] items-center justify-center rounded-lg sm:h-14 " +
                            (field === "num" && (d || i === num.length)
                              ? "bg-violet-50 text-violet-700 ring-2 ring-violet-400 dark:bg-violet-950/50"
                              : d
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-300 dark:text-slate-600")
                          }
                        >
                          {d || "·"}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Bet: {activeBet?.label || "—"}
                      {activeBet?.mode === "exact" ? " Direct" : activeBet?.mode ? " " + activeBet.mode : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Stake amount
                    </div>
                    <button
                      type="button"
                      onClick={() => setField("amt")}
                      className={
                        "mt-0.5 min-h-[40px] font-mono text-2xl font-black tabular-nums transition " +
                        (field === "amt"
                          ? "text-violet-600 underline decoration-2 underline-offset-4"
                          : "text-slate-900 dark:text-white")
                      }
                    >
                      {currency} {(parseFloat(amt) || 0).toFixed(2)}
                    </button>
                  </div>
                </div>

                {/* Keypad + quick wager side by side */}
                <div className="grid gap-0 sm:grid-cols-2">
                  {/* Tactile keypad */}
                  <div className="border-b border-slate-100 p-3 sm:border-b-0 sm:border-r dark:border-slate-800">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Tactile keypad
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {field === "num" ? "Tap digits to compose" : "Enter stake"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0].map((k) => (
                        <button
                          key={String(k)}
                          type="button"
                          onClick={() => pressKey(k)}
                          className="flex h-14 min-h-[56px] md:h-16 md:min-h-[64px] items-center justify-center rounded-xl bg-slate-50 text-xl font-extrabold text-slate-800 ring-1 ring-slate-200 transition active:scale-95 active:bg-violet-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => pressKey("DEL")}
                        className="flex h-14 min-h-[56px] md:h-16 md:min-h-[64px] items-center justify-center rounded-xl bg-rose-50 text-rose-500 ring-1 ring-rose-200 transition active:scale-95 dark:bg-rose-950/40 dark:ring-rose-800"
                        aria-label="Backspace"
                      >
                        <Delete size={20} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => pressKey("CLR")}
                      className="mt-2 flex min-h-[48px] md:min-h-[60px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-3 text-sm font-bold uppercase tracking-wide text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    >
                      Clear digits
                    </button>
                  </div>

                  {/* Quick wager amount */}
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Quick wager amount
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{currency}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESETS.map((p) => {
                        const active = Math.abs((parseFloat(amt) || 0) - p) < 0.001;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setAmt(String(p));
                              setField("amt");
                            }}
                            className={
                              "relative flex h-14 min-h-[56px] md:h-16 md:min-h-[64px] flex-col items-center justify-center rounded-xl text-base font-extrabold transition " +
                              (active
                                ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                                : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700")
                            }
                          >
                            {active && (
                              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-violet-700 px-1.5 text-[8px] font-bold uppercase tracking-wide text-white">
                                Active
                              </span>
                            )}
                            <span className="text-[9px] font-semibold opacity-70">{currency}</span>
                            <span>{p.toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {BUMPS.map((b) => (
                        <button
                          key={"b" + b}
                          type="button"
                          onClick={() =>
                            setAmt((a) => String(Math.round(((parseFloat(a) || 0) + b) * 100) / 100))
                          }
                          className="flex min-h-[48px] md:min-h-[60px] flex-1 items-center justify-center rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800"
                        >
                          +{b.toFixed(2).replace(/\.00$/, "")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action row — Quick Pick / Replay / Scan + Add Play */}
            <div className="shrink-0 space-y-2 pb-1">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={quickPick}
                  className="flex min-h-[52px] md:min-h-[68px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.98]"
                >
                  <Zap size={16} strokeWidth={2.5} />
                  Quick Pick
                </button>
                <button
                  type="button"
                  onClick={openReplay}
                  className="flex min-h-[52px] md:min-h-[68px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <RotateCcw size={16} strokeWidth={2.5} />
                  Replay
                </button>
                <button
                  type="button"
                  onClick={openScan}
                  className="flex min-h-[52px] md:min-h-[68px] items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-3 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 active:scale-[0.98]"
                >
                  <Ticket size={16} strokeWidth={2.5} />
                  Scan Ticket
                </button>
              </div>
              <button
                type="button"
                onClick={addPlay}
                className="flex min-h-[56px] w-full md:min-h-[72px] items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 text-base font-extrabold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98]"
              >
                <span className="text-lg leading-none">+</span>
                Add Play to Ticket
                <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  Enter ↵
                </span>
              </button>
            </div>
            </>
          </>
        )}
      </section>

      <aside className="flex max-h-[38%] w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Ticket · {shop?.name || "Shop"}
          </span>
          <button
            type="button"
            onClick={() => clearLines()}
            className="-mr-2 min-h-[40px] px-3 text-xs font-semibold text-rose-500"
          >
            Clear
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {lines.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">No plays yet</p>
          ) : (
            lines.map((l) => (
              <div
                key={l.id}
                className="flex items-start gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    {games.find((g) => g.id === l.game)?.name || l.game} · {l.bet_type}
                  </div>
                  <div className="text-slate-500">
                    {l.number}
                    {l.session ? " · " + l.session : ""} · {l.date}
                  </div>
                </div>
                <span className="font-bold">
                  {currency} {l.amount.toFixed(2)}
                </span>
                <button type="button" onClick={() => removeLine(l.id)} className="text-rose-500">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-lg font-black">
            <span>Total</span>
            <span>
              {currency} {total.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={holdOrder}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-200 py-2.5 text-xs font-bold dark:bg-slate-700"
            >
              <Bookmark size={14} /> {heldLines?.length ? "Recall" : "Hold"}
            </button>
            <button
              type="button"
              onClick={sendTicket}
              className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white"
            >
              <Printer size={16} /> Send & Print
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">F12</span>
            </button>
          </div>
        </div>

      {topUpOpen && <TopUpModal onClose={() => setTopUpOpen(false)} />}

      {/* Replay / Scan ticket modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {modal === "replay" ? "Replay ticket" : "Scan ticket — check winner"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-500">
              {modal === "replay"
                ? "Enter or scan the ticket serial number to load its plays onto the current ticket."
                : "Enter or scan the ticket serial number to check if it is a winner."}
            </p>
            <input
              type="text"
              autoFocus
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (modal === "replay") submitReplay();
                  else submitScan();
                }
              }}
              placeholder="e.g. T00001001"
              className="mb-3 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-lg font-bold tracking-wide text-slate-900 outline-none ring-violet-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            {modal === "scan" && scanResult && (
              <div
                className={
                  "mb-3 rounded-xl border p-4 text-center " +
                  (scanResult.ok && scanResult.message.startsWith("Winner")
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : scanResult.ok
                      ? "border-slate-200 bg-slate-50 text-slate-800"
                      : "border-rose-200 bg-rose-50 text-rose-900")
                }
              >
                <p className="text-base font-bold">{scanResult.message}</p>
                {scanResult.ticket && (
                  <div className="mt-2 text-left text-xs opacity-80">
                    <p>Status: {scanResult.ticket.status}</p>
                    <p>Plays: {scanResult.ticket.lines.length}</p>
                    <p>Sold: {new Date(scanResult.ticket.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => (modal === "replay" ? submitReplay() : submitScan())}
                className={
                  "flex-1 rounded-xl py-3 text-sm font-bold text-white " +
                  (modal === "replay" ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-700 hover:bg-violet-800")
                }
              >
                {modal === "replay" ? "Load plays" : "Check ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
      </aside>
    </div>
  );
}

export default SellScreen;
