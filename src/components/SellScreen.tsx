"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dice5,
  LifeBuoy,
  Printer,
  Trash2,
  X,
  Banknote,
  Bookmark,
  Copy,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, TicketLine } from "@/lib/types";
import { PLAY_WHE_MARKS, ZODIAC_SYMBOLS } from "@/lib/constants";
import { printReceipt } from "@/lib/print-receipt";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [0.5, 1, 2, 3, 4, 5, 10, 20, 50, 100];
const MULTI_DRAW = [1, 2, 3, 5, 10];

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
    cancelTicket,
    redeemTicket,
    replayTicket,
    lastTicketId,
    selectedRetailerId,
    retailers,
    total,
    toast,
    addSupport,
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
  const [modal, setModal] = useState<"support" | null>(null);
  const [supSub, setSupSub] = useState("");
  const [supBody, setSupBody] = useState("");
  const [zodiacPick, setZodiacPick] = useState<string[]>([]);
  const [allZodiac, setAllZodiac] = useState(false);
  const [whePick, setWhePick] = useState<number | null>(null);
  const [jackBalls, setJackBalls] = useState<string[]>([]);
  const [jackMega, setJackMega] = useState<string | null>(null);

  const primary: Game | undefined = useMemo(
    () => (sel.length ? enabled.find((g) => g.id === sel[0]) : undefined),
    [enabled, sel]
  );

  const allowedBets = useMemo(() => {
    if (!primary) return [];
    if (primary.format === "digit") {
      const keys = primary.bet_types?.length
        ? primary.bet_types
        : ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"];
      return betTypes.filter((b) => b.enabled && keys.includes(b.key));
    }
    if (primary.format === "zodiac") return betTypes.filter((b) => b.key === "zodiac");
    if (primary.format === "whe") return betTypes.filter((b) => b.key === "play_whe");
    if (primary.format === "jackpot") return betTypes.filter((b) => b.key === "jackpot");
    return [];
  }, [primary, betTypes]);

  const activeBet = allowedBets.find((b) => b.key === bt) || allowedBets[0];
  const digits = activeBet?.digits ?? primary?.digits ?? 4;

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
    if (!primary) return toast("Select a game", true);
    const amount = parseFloat(amt);
    if (!amount || amount <= 0) return toast("Enter amount", true);
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
      if (num.length < digits) return toast(`Enter ${digits}-digit number`, true);
      const number = num.padStart(digits, "0").slice(0, digits);
      for (const gid of sel) {
        for (const d of dates) {
          addLine({ game: gid, bet_type: bt, number, amount, date: d, session: session || undefined });
        }
      }
      setNum("");
    } else if (primary.format === "zodiac") {
      const syms = allZodiac ? ZODIAC_SYMBOLS.map((z) => z.id) : zodiacPick;
      if (!syms.length) return toast("Pick at least one sign", true);
      if (num.length < (primary.digits || 2)) return toast("Enter number", true);
      for (const z of syms) {
        addLine({ game: primary.id, bet_type: "zodiac", number: `${num}-${z}`, amount, date, symbols: [z] });
      }
      setNum("");
      setZodiacPick([]);
      setAllZodiac(false);
    } else if (primary.format === "whe") {
      if (whePick == null) return toast("Pick a Play Whe mark", true);
      addLine({ game: primary.id, bet_type: "play_whe", number: String(whePick), amount, date, session: session || undefined });
      setWhePick(null);
      setNum("");
    } else if (primary.format === "jackpot") {
      const need = primary.main_count ?? 5;
      if (jackBalls.length !== need) return toast(`Pick ${need} numbers`, true);
      if (primary.mega_count && !jackMega) return toast("Pick mega", true);
      addLine({
        game: primary.id,
        bet_type: "jackpot",
        number: [...jackBalls].sort().join("-") + (jackMega ? `+${jackMega}` : ""),
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
    if (!lines.length) return toast("No plays on ticket", true);
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
      /* pop-up blocked */
    }
    toast(`Ticket ${t.id} sold · ${currency} ${t.total.toFixed(2)}`);
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
        const { id: _id, ...rest } = l;
        addLine(rest);
      });
      setHeldLines(null);
      toast("Order recalled");
      return;
    }
    toast("Nothing to hold", true);
  }

  function quickPick() {
    if (!primary) return toast("Select a game", true);
    if (primary.format === "digit") {
      let s = "";
      for (let i = 0; i < digits; i++) s += Math.floor(Math.random() * 10);
      setNum(s);
      setField("num");
    } else if (primary.format === "zodiac") {
      const z = ZODIAC_SYMBOLS[Math.floor(Math.random() * ZODIAC_SYMBOLS.length)];
      setZodiacPick([z.id]);
      let s = "";
      for (let i = 0; i < (primary.digits || 2); i++) s += Math.floor(Math.random() * 10);
      setNum(s);
    } else if (primary.format === "whe") {
      const n = Math.floor(Math.random() * 36) + 1;
      setWhePick(n);
      setNum(String(n));
    } else if (primary.format === "jackpot") {
      const max = primary.main_max ?? 30;
      const need = primary.main_count ?? 5;
      const set = new Set<string>();
      while (set.size < need) set.add(String(Math.floor(Math.random() * max) + 1).padStart(2, "0"));
      setJackBalls([...set]);
      if (primary.mega_max) setJackMega(String(Math.floor(Math.random() * primary.mega_max) + 1).padStart(2, "0"));
    }
  }

  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const digitSlots = Array.from({ length: digits }, (_, i) => num[i] || "");
  const amtDisplay = amt || "0";

  function gameStatus(g: Game) {
    const [hh, mm] = (g.cutoff || "12:00").split(":").map(Number);
    const now = new Date();
    const cut = new Date();
    cut.setHours(hh, mm, 0, 0);
    if (g.format === "digit" && now > cut && !g.sessions?.length) {
      return { closed: true, label: "Closed" };
    }
    if (g.jackpot_current)
      return { closed: false, label: `Closes in ${Math.max(1, Math.floor((cut.getTime() - now.getTime()) / 60000))}m` };
    const mins = Math.floor((cut.getTime() - now.getTime()) / 60000);
    if (mins < 0) return { closed: false, label: g.draw_time };
    return { closed: false, label: mins < 60 ? `Closes in ${mins}m` : `Draw ${g.draw_time}` };
  }

  return (
    <div className="flex h-full min-h-0 gap-0 bg-slate-50 dark:bg-slate-900">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Select Game</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{enabled.length} Games Active</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {enabled.map((g) => {
              const on = sel.includes(g.id);
              const st = gameStatus(g);
              return (
                <button key={g.id} type="button" onClick={() => toggleGame(g.id)}
                  className={`btn-tactile relative overflow-hidden rounded-xl border p-3 text-left text-white shadow-sm transition ${on ? "ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900" : st.closed ? "opacity-40 grayscale" : "hover:shadow-md"}`}
                  style={{ background: `linear-gradient(145deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #000))` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/30 text-xs font-black shadow-inner" style={{ background: "rgba(0,0,0,0.25)" }}>
                        {g.format === "jackpot" ? "*" : g.format === "zodiac" ? "Z" : g.format === "whe" ? "W" : `${g.digits}D`}
                      </div>
                      <span className="text-base font-black leading-tight tracking-tight">{g.name}</span>
                    </div>
                    {on && <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-black text-slate-900">OK</span>}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs font-medium opacity-90">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(0,0,0,0.25)" }}>
                      {g.format === "digit" ? `${g.digits}d` : g.format === "jackpot" ? "JACKPOT" : g.format === "zodiac" ? "ZODIAC" : "1-36"}
                    </span>
                    <span>{g.jackpot_current ? `AWG ${g.jackpot_current.toLocaleString()}` : st.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold shadow-sm dark:border-slate-600 dark:bg-slate-800" />
          {allowedBets.map((b) => (
            <button key={b.key} type="button" onClick={() => { setBt(b.key); setNum(""); }} className={`btn-tactile h-9 rounded-full px-3.5 text-sm font-semibold shadow-sm ${bt === b.key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{b.label}</button>
          ))}
          {!primary && <span className="text-xs text-slate-400">Tap a game to start</span>}
        </div>

        {primary?.format === "whe" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Play Whe - pick 1-36</div>
            <div className="grid max-h-52 grid-cols-5 gap-1.5 overflow-auto sm:grid-cols-10">
              {PLAY_WHE_MARKS.map((m) => (
                <button key={m.id} type="button" onClick={() => { setWhePick(m.num); setNum(String(m.num)); }} className={`btn-tactile flex flex-col items-center rounded-xl border p-1.5 text-center ${whePick === m.num ? "border-rose-400 bg-rose-500/15 ring-2 ring-rose-400" : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700"}`}>
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="text-[10px] font-bold">{String(m.num).padStart(2, "0")}</span>
                  <span className="w-full truncate text-[8px] text-slate-400">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {primary?.format === "zodiac" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-400">Zodiac</span>
              <button type="button" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${allZodiac ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700"}`} onClick={() => { setAllZodiac(true); setZodiacPick(ZODIAC_SYMBOLS.map((z) => z.id)); }}>All</button>
              <button type="button" className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-700" onClick={() => { setAllZodiac(false); setZodiacPick([]); }}>Clear</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {ZODIAC_SYMBOLS.map((z) => {
                const on = allZodiac || zodiacPick.includes(z.id);
                return (
                  <button key={z.id} type="button" onClick={() => { setAllZodiac(false); setZodiacPick((p) => (p.includes(z.id) ? p.filter((x) => x !== z.id) : [...p, z.id])); }} className={`btn-tactile rounded-xl p-2 text-center text-xs font-semibold ${on ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700"}`}>
                    <span className="block text-xl">{z.emoji}</span>{z.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {primary?.format === "jackpot" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 text-xs font-bold uppercase text-slate-400">Jackpot - pick {primary.main_count} of {primary.main_max}{primary.mega_count ? ` + mega 1-${primary.mega_max}` : ""}</div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: primary.main_max ?? 30 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => (
                <button key={v} type="button" onClick={() => { setJackBalls((prev) => { if (prev.includes(v)) return prev.filter((x) => x !== v); if (prev.length >= (primary.main_count ?? 5)) return prev; return [...prev, v]; }); }} className={`btn-tactile h-9 w-9 rounded-full text-xs font-bold ${jackBalls.includes(v) ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700"}`}>{v}</button>
              ))}
            </div>
            {!!primary.mega_count && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: primary.mega_max ?? 10 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => (
                  <button key={v} type="button" onClick={() => setJackMega(v)} className={`btn-tactile h-9 w-9 rounded-full text-xs font-bold ${jackMega === v ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-700"}`}>{v}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-2xl border-2 border-indigo-200 bg-white p-3.5 shadow-sm dark:border-indigo-900/50 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col space-y-2.5">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Number ({activeBet?.label || `${digits}D`})</span>
                  <span className="text-xs font-semibold text-indigo-600">{num.length}/{digits} digits</span>
                </div>
                <div className="flex items-center justify-center py-1.5">
                  <div className="flex gap-2 font-mono text-3xl font-extrabold tracking-wider">
                    {digitSlots.map((d, i) => (
                      <span key={i} className={`flex h-12 w-10 items-center justify-center rounded-lg border-2 font-mono shadow-sm ${d ? "border-indigo-500 bg-white text-indigo-600 dark:bg-slate-800" : i === num.length ? "animate-pulse border-indigo-500 bg-white text-indigo-600 dark:bg-slate-800" : "border-slate-300 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-800"}`}>{d || "_"}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                  <button key={k} type="button" onClick={() => { setField("num"); pressKey(k); }} className="btn-tactile flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 py-3 font-mono text-2xl font-bold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">{k}</button>
                ))}
                <button type="button" onClick={() => { setField("num"); pressKey("CLR"); }} className="btn-tactile flex h-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-bold text-rose-600 shadow-sm dark:border-rose-900 dark:bg-rose-950/40">CLR</button>
                <button type="button" onClick={() => { setField("num"); pressKey(0); }} className="btn-tactile flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 py-3 font-mono text-2xl font-bold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700">0</button>
                <button type="button" onClick={() => { setField("num"); pressKey("DEL"); }} className="btn-tactile flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 py-3 text-lg font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700">DEL</button>
              </div>
              <button type="button" onClick={quickPick} className="btn-tactile flex h-12 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"><Dice5 size={16} /> Quick Pick</button>
            </div>

            <div className="flex flex-col space-y-2.5">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Wager Amount ({currency})</span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40">Min {currency} 0.50</span>
                </div>
                <div className="flex items-baseline justify-end gap-1 px-3 py-1.5">
                  <span className="font-mono text-xl font-bold text-slate-400">{currency}</span>
                  <span className="font-mono text-4xl font-black tracking-tight text-slate-900 dark:text-white">{amtDisplay}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.slice(0, 6).map((p) => (
                  <button key={p} type="button" onClick={() => { setAmt(String(p)); setField("amt"); }} className={`btn-tactile flex h-12 flex-col items-center justify-center rounded-xl border font-mono text-sm font-extrabold shadow-sm ${parseFloat(amt) === p ? "border-indigo-600 bg-indigo-600 text-white" : "border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"}`}>
                    <span className={`text-[9px] font-sans font-bold leading-none ${parseFloat(amt) === p ? "text-indigo-200" : "text-indigo-400"}`}>{currency}</span>
                    {p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.slice(6).map((p) => (
                  <button key={p} type="button" onClick={() => { setAmt(String(p)); setField("amt"); }} className={`btn-tactile flex h-12 flex-col items-center justify-center rounded-xl border font-mono text-sm font-bold shadow-sm ${parseFloat(amt) === p ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"}`}>
                    <span className="text-[9px] font-sans font-bold leading-none text-slate-400">{currency}</span>{p}
                  </button>
                ))}
              </div>
              <button type="button" onClick={addPlay} className="btn-tactile flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700">+ Add to ticket</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
            {primary?.sessions && primary.sessions.length > 0 && primary.sessions.map((s) => (
              <button key={s.id} type="button" onClick={() => setSession(s.id)} className={`btn-tactile rounded-full px-3 py-1.5 text-xs font-semibold ${session === s.id ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700"}`}>{s.label}</button>
            ))}
            <span className="text-xs font-semibold text-slate-400">Multi-draw</span>
            {MULTI_DRAW.map((n) => (
              <button key={n} type="button" onClick={() => setMultiDraw(n)} className={`btn-tactile rounded-full px-2.5 py-1 text-xs font-semibold ${multiDraw === n ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700"}`}>{n}d</button>
            ))}
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 dark:bg-slate-700">
              <button type="button" className="btn-tactile h-7 w-7 rounded-full text-sm font-bold" onClick={() => setMultiDraw((n) => Math.max(1, n - 1))}>-</button>
              <span className="min-w-[2.5rem] text-center text-xs font-bold">{multiDraw}d</span>
              <button type="button" className="btn-tactile h-7 w-7 rounded-full text-sm font-bold" onClick={() => setMultiDraw((n) => Math.min(28, n + 1))}>+</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <button type="button" onClick={() => lastTicketId && replayTicket(lastTicketId)} className="btn-tactile relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-slate-700 shadow-sm hover:bg-amber-50 dark:border-slate-600 dark:bg-slate-800">
            <span className="absolute right-1 top-1 font-mono text-[9px] text-slate-400">F3</span>
            <Copy size={14} className="mb-1 text-amber-500" /><span className="text-[10px] font-bold">Replay</span>
          </button>
          <button type="button" onClick={() => lastTicketId && cancelTicket(lastTicketId)} className="btn-tactile relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-slate-700 shadow-sm hover:bg-rose-50 dark:border-slate-600 dark:bg-slate-800">
            <span className="absolute right-1 top-1 font-mono text-[9px] text-rose-400">F4</span>
            <X size={14} className="mb-1 text-rose-500" /><span className="text-[10px] font-bold">Cancel</span>
          </button>
          <button type="button" onClick={clearLines} className="btn-tactile relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
            <span className="absolute right-1 top-1 font-mono text-[9px] text-slate-400">ESC</span>
            <Trash2 size={14} className="mb-1 text-slate-500" /><span className="text-[10px] font-bold">Clear</span>
          </button>
          <button type="button" onClick={() => lastTicketId && redeemTicket(lastTicketId)} className="btn-tactile flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-slate-700 shadow-sm hover:bg-amber-50 dark:border-slate-600 dark:bg-slate-800">
            <Banknote size={14} className="mb-1 text-amber-600" /><span className="text-[10px] font-bold">Redeem</span>
          </button>
          <button type="button" onClick={() => setModal("support")} className="btn-tactile flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-slate-700 shadow-sm hover:bg-cyan-50 dark:border-slate-600 dark:bg-slate-800">
            <LifeBuoy size={14} className="mb-1 text-cyan-600" /><span className="text-[10px] font-bold">Support</span>
          </button>
          <button type="button" onClick={sendTicket} className="btn-tactile relative flex flex-col items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 py-2 text-emerald-800 shadow-sm hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="absolute right-1 top-1 font-mono text-[9px] text-emerald-600">F12</span>
            <Printer size={14} className="mb-1 text-emerald-600" /><span className="text-[10px] font-bold">Print</span>
          </button>
        </div>
      </section>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-slate-200/90 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 xl:w-[420px]">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Printer size={14} className="text-indigo-600" />
                <h2 className="text-sm font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">Current Ticket</h2>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Terminal {shop?.number || "-"} - {lines.length} line{lines.length === 1 ? "" : "s"}</p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Due</span>
              <span className="font-mono text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">{currency} {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
          {lines.map((l, idx) => (
            <div key={l.id} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100/70 dark:border-slate-600 dark:bg-slate-700/40">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-mono text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">{idx + 1}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{games.find((g) => g.id === l.game)?.name}</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-600 dark:text-slate-300">{l.bet_type}</span>
                  </div>
                  <div className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300">{l.number}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold">{currency} {l.amount.toFixed(2)}</span>
                <button type="button" onClick={() => removeLine(l.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete line"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {!lines.length && (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-slate-700"><Printer size={28} /></div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No plays yet</p>
              <p className="mt-1 max-w-[200px] text-xs text-slate-400">Select game, enter numbers and tap + Add to ticket</p>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between font-medium text-slate-500"><span>Lines count:</span><span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lines.length} play(s)</span></div>
            <div className="flex justify-between font-medium text-slate-500"><span>Government Tax (0%):</span><span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currency} 0.00</span></div>
            <div className="ticket-dashed-line flex items-baseline justify-between pt-2 font-bold text-slate-900 dark:text-white">
              <span className="text-sm">Net Payable:</span>
              <span className="font-mono text-lg font-black text-indigo-700 dark:text-indigo-400">{currency} {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={clearLines} className="btn-tactile flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-300"><Trash2 size={14} /> Clear Ticket</button>
            <button type="button" onClick={holdOrder} className="btn-tactile flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-300"><Bookmark size={14} /> {heldLines && !lines.length ? "Recall Order" : "Hold Order"}</button>
          </div>
          <button type="button" onClick={sendTicket} className="btn-tactile flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 text-base font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-600 active:bg-emerald-700">
            <Printer size={18} /><span>Send & Print</span><span className="ml-1 rounded bg-emerald-950/20 px-2 py-0.5 font-mono text-xs">F12</span>
          </button>
        </div>
      </aside>

      {modal === "support" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
            <h3 className="font-bold">Support ticket</h3>
            <input className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-700" placeholder="Subject" value={supSub} onChange={(e) => setSupSub(e.target.value)} />
            <textarea className="h-28 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-700" placeholder="Describe the issue" value={supBody} onChange={(e) => setSupBody(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => { addSupport(supSub || "Support", supBody); setSupSub(""); setSupBody(""); setModal(null); }} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Submit</button>
              <button type="button" onClick={() => setModal(null)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold dark:bg-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
