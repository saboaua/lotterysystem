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
    if (!primary) return toast("Select a game", true);
    let amount = parseFloat(amt);
    if (primary.format === "jackpot" && primary.min_stake != null) {
      amount = primary.min_stake;
    }
    if (!amount || amount <= 0) return toast("Enter amount", true);
    if (primary.format !== "jackpot") {
      if (primary.min_stake != null && amount < primary.min_stake)
        return toast(`Min stake ${currency} ${primary.min_stake}`, true);
      if (primary.max_stake != null && amount > primary.max_stake)
        return toast(`Max stake ${currency} ${primary.max_stake}`, true);
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
      if (num.length < digits) return toast(`Enter ${digits}-digit number`, true);
      const number = num.padStart(digits, "0").slice(0, digits);
      for (const gid of sel) {
        for (const dd of dates) {
          addLine({ game: gid, bet_type: bt, number, amount, date: dd, session: session || undefined });
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
      /* popup blocked */
    }
    toast(`Ticket ${t.id} sold - ${currency} ${t.total.toFixed(2)}`);
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
      if (primary.mega_max) {
        setJackMega(String(Math.floor(Math.random() * primary.mega_max) + 1).padStart(2, "0"));
      }
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
    if (g.jackpot_current) {
      return {
        closed: false,
        label: `Closes in ${Math.max(1, Math.floor((cut.getTime() - now.getTime()) / 60000))}m`,
      };
    }
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
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {enabled.length} Games Active
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {enabled.map((g) => {
              const on = sel.includes(g.id);
              const st = gameStatus(g);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGame(g.id)}
                  className={`btn-tactile relative overflow-hidden rounded-xl border p-3 text-left text-white shadow-sm transition ${
                    on
                      ? "ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
                      : st.closed
                        ? "opacity-40 grayscale"
                        : "hover:shadow-md"
                  }`}
                  style={{
                    background: `linear-gradient(145deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #000))`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {g.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.logo}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-lg border border-white/40 object-cover shadow-inner"
                        />
                      ) : (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/30 text-xs font-black shadow-inner"
                          style={{ background: "rgba(0,0,0,0.25)" }}
                        >
                          {g.format === "jackpot"
                            ? "*"
                            : g.format === "zodiac"
                              ? "Z"
                              : g.format === "whe"
                                ? "W"
                                : `${g.digits}D`}
                        </div>
                      )}
                      <span className="text-base font-black leading-tight tracking-tight">{g.name}</span>
                    </div>
                    {on && (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-black text-slate-900">
                        OK
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs font-medium opacity-90">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(0,0,0,0.25)" }}
                    >
                      {g.format === "digit"
                        ? `${g.digits}d`
                        : g.format === "jackpot"
                          ? "JACKPOT"
                          : g.format === "zodiac"
                            ? "ZODIAC"
                            : "1-36"}
                    </span>
                    <span>
                      {g.jackpot_current ? `AWG ${g.jackpot_current.toLocaleString()}` : st.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold shadow-sm dark:border-slate-600 dark:bg-slate-800"
          />
          {allowedBets.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                setBt(b.key);
                setNum("");
              }}
              className={`btn-tactile h-9 rounded-full px-3.5 text-sm font-semibold shadow-sm ${
                bt === b.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {b.label}
            </button>
          ))}
          {!primary && <span className="text-xs text-slate-400">Tap a game to start</span>}
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-indigo-200 bg-white p-3.5 shadow-sm dark:border-indigo-900/50 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col space-y-2.5">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Number</span>
                  <span className="text-xs font-semibold text-indigo-600">
                    {num.length}/{digits}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setField("num")}
                  className={`mt-1 flex min-h-[48px] items-center justify-center gap-2 rounded-lg border-2 py-1 font-mono text-3xl font-extrabold tracking-wider ${
                    field === "num"
                      ? "border-indigo-500 bg-white dark:bg-slate-800"
                      : "border-transparent"
                  }`}
                >
                  {digitSlots.map((dd, i) => (
                    <span
                      key={i}
                      className={`grid h-10 w-8 place-items-center rounded-md ${
                        dd ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-700"
                      }`}
                    >
                      {dd || "-"}
                    </span>
                  ))}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "CLR", 0, "DEL"].map((k) => (
                  <button
                    key={String(k)}
                    type="button"
                    onClick={() => {
                      setField("num");
                      pressKey(k);
                    }}
                    className={`btn-tactile h-12 rounded-xl text-lg font-bold shadow-sm ${
                      k === "CLR" || k === "DEL"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        : "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col space-y-2.5">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900/50">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Amount ({currency})
                </div>
                <button
                  type="button"
                  onClick={() => setField("amt")}
                  className={`mt-1 flex min-h-[48px] items-center justify-center rounded-lg border-2 font-mono text-3xl font-extrabold ${
                    field === "amt"
                      ? "border-emerald-500 bg-white dark:bg-slate-800"
                      : "border-transparent"
                  }`}
                >
                  {amtDisplay}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "DEL"].map((k) => (
                  <button
                    key={String(k)}
                    type="button"
                    onClick={() => {
                      setField("amt");
                      pressKey(k);
                    }}
                    className={`btn-tactile h-12 rounded-xl text-lg font-bold shadow-sm ${
                      k === "DEL"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        : "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setAmt(String(p));
                      setField("amt");
                    }}
                    className="btn-tactile rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addPlay}
              className="btn-tactile flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-extrabold text-white shadow-md"
            >
              <Banknote size={16} /> Add Play
            </button>
            <button
              type="button"
              onClick={quickPick}
              className="btn-tactile flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold dark:border-slate-600 dark:bg-slate-700"
            >
              <Dice5 size={16} /> QP
            </button>
            <button
              type="button"
              onClick={() => setModal("support")}
              className="btn-tactile flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold dark:border-slate-600 dark:bg-slate-700"
            >
              <LifeBuoy size={16} /> Help
            </button>
          </div>
        </div>
      </section>

      <aside className="flex w-full max-w-sm shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Ticket</h2>
            <span className="text-xs font-semibold text-slate-400">{shop?.name || "Shop"}</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
            {currency} {total.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">{lines.length} play(s)</div>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {lines.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No plays yet.</p>
          )}
          {lines.map((l) => {
            const gg = games.find((x) => x.id === l.game);
            return (
              <div
                key={l.id}
                className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900/40"
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: gg?.color || "#6366f1" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{gg?.name || l.game}</div>
                  <div className="font-mono text-xs text-slate-500">
                    {l.bet_type} · {l.number} · {currency} {l.amount.toFixed(2)}
                  </div>
                </div>
                <button type="button" onClick={() => removeLine(l.id)} className="text-rose-500">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={clearLines}
              className="btn-tactile flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-bold"
            >
              <Trash2 size={14} /> Clear
            </button>
            <button
              type="button"
              onClick={holdOrder}
              className="btn-tactile flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-bold"
            >
              <Bookmark size={14} /> {heldLines && !lines.length ? "Recall" : "Hold"}
            </button>
          </div>
          <button
            type="button"
            onClick={sendTicket}
            className="btn-tactile flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 text-base font-extrabold text-white shadow-lg"
          >
            <Printer size={18} />
            <span>Send & Print</span>
          </button>
        </div>
      </aside>

      {modal === "support" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
            <h3 className="font-bold">Support</h3>
            <input
              className="h-10 w-full rounded-xl border px-3 text-sm"
              placeholder="Subject"
              value={supSub}
              onChange={(e) => setSupSub(e.target.value)}
            />
            <textarea
              className="h-28 w-full rounded-xl border p-3 text-sm"
              placeholder="Issue"
              value={supBody}
              onChange={(e) => setSupBody(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  addSupport(supSub || "Support", supBody);
                  setSupSub("");
                  setSupBody("");
                  setModal(null);
                }}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Submit
              </button>
              <button type="button" onClick={() => setModal(null)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellScreen;
