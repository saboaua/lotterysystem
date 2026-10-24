"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Copy,
  Dice5,
  FileChartColumn,
  LifeBuoy,
  Printer,
  Receipt,
  RotateCcw,
  Trash2,
  Users,
  X,
  Banknote,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game } from "@/lib/types";
import { PLAY_WHE_MARKS, ZODIAC_SYMBOLS } from "@/lib/constants";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [0.25, 0.5, 0.75, 1, 2, 5, 10, 20];
const MULTI_DRAW = [1, 2, 3, 4, 5, 6, 7, 14];

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
    soldTickets,
    selectedRetailerId,
    retailers,
    total,
    toast,
    addSupport,
  } = useStore();

  const enabled = games.filter((g) => g.enabled);
  const [sel, setSel] = useState<string[]>([]);
  const [bt, setBt] = useState("4_cifra");
  const [num, setNum] = useState("");
  const [amt, setAmt] = useState("");
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [session, setSession] = useState("");
  const [multiDraw, setMultiDraw] = useState(1);
  const [modal, setModal] = useState<"clerks" | "support" | "report" | "results" | null>(null);
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

  function key(k: string | number) {
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
    setAmt("");
    setField("num");
    toast("Play added");
  }

  function sendTicket() {
    if (!lines.length) return toast("No plays on ticket", true);
    const t = sellTicket();
    if (t) toast(`Ticket ${t.id} sold · ${currency} ${t.total.toFixed(2)}`);
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
    <div className="grid h-full gap-3 p-3 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex min-h-0 flex-col gap-2.5 overflow-auto">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {enabled.map((g) => {
            const on = sel.includes(g.id);
            const st = gameStatus(g);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGame(g.id)}
                className={`relative flex flex-col items-start rounded-2xl p-3 text-left text-white transition ${
                  on
                    ? "opacity-100 ring-2 ring-white ring-offset-2 ring-offset-[var(--bg)]"
                    : st.closed
                      ? "opacity-40 grayscale"
                      : "opacity-90 hover:opacity-100"
                }`}
                style={{
                  background: `linear-gradient(145deg, ${g.color}, color-mix(in srgb, ${g.color} 50%, #000))`,
                }}
              >
                <span className="text-[15px] font-extrabold leading-tight">{g.name}</span>
                <span className="mt-0.5 text-[10px] opacity-90">
                  {g.format === "digit"
                    ? `${g.digits}D`
                    : g.format === "jackpot"
                      ? "JACKPOT"
                      : g.format === "zodiac"
                        ? "ZODIAC"
                        : "1–36"}
                </span>
                <span className="text-[10px] opacity-80">
                  Draw {g.draw_time}
                  {g.sessions?.length ? ` · ${g.sessions.map((s) => s.label).join("/")}` : ""}
                </span>
                <span className={`mt-1 text-[10px] font-semibold ${st.closed ? "text-white/70" : ""}`}>
                  {g.jackpot_current
                    ? `Pool AWG ${g.jackpot_current.toLocaleString()}`
                    : st.label}
                </span>
                {on && (
                  <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-black text-slate-900">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 text-sm shadow-sm"
          />
          {allowedBets.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                setBt(b.key);
                setNum("");
              }}
              className={`h-9 rounded-full px-3.5 text-sm font-semibold shadow-sm ${
                bt === b.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-[var(--card)] text-[var(--mut)]"
              }`}
            >
              {b.label}
            </button>
          ))}
          {!primary && <span className="text-xs text-[var(--mut)]">Tap a game to start</span>}
        </div>

        {primary?.format === "whe" && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--mut)]">Play Whe · pick 1–36</div>
            <div className="grid max-h-52 grid-cols-5 gap-1.5 overflow-auto sm:grid-cols-10">
              {PLAY_WHE_MARKS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setWhePick(m.num);
                    setNum(String(m.num));
                  }}
                  className={`flex flex-col items-center rounded-xl border p-1.5 text-center ${
                    whePick === m.num
                      ? "border-rose-400 bg-rose-500/15 ring-2 ring-rose-400"
                      : "border-[var(--line)] bg-[var(--key)]"
                  }`}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="text-[10px] font-bold">{String(m.num).padStart(2, "0")}</span>
                  <span className="w-full truncate text-[8px] text-[var(--mut)]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {primary?.format === "zodiac" && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-[var(--mut)]">Zodiac</span>
              <button type="button" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${allZodiac ? "bg-indigo-500 text-white" : "bg-[var(--key)]"}`} onClick={() => { setAllZodiac(true); setZodiacPick(ZODIAC_SYMBOLS.map((z) => z.id)); }}>All</button>
              <button type="button" className="rounded-full bg-[var(--key)] px-2.5 py-1 text-xs font-semibold" onClick={() => { setAllZodiac(false); setZodiacPick([]); }}>Clear</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {ZODIAC_SYMBOLS.map((z) => {
                const on = allZodiac || zodiacPick.includes(z.id);
                return (
                  <button key={z.id} type="button" onClick={() => { setAllZodiac(false); setZodiacPick((p) => p.includes(z.id) ? p.filter((x) => x !== z.id) : [...p, z.id]); }} className={`rounded-xl p-2 text-center text-xs font-semibold ${on ? "bg-indigo-500 text-white" : "bg-[var(--key)]"}`}>
                    <span className="block text-xl">{z.emoji}</span>
                    {z.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {primary?.format === "jackpot" && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
            <div className="mb-2 text-xs font-bold uppercase text-[var(--mut)]">
              Jackpot · pick {primary.main_count} of {primary.main_max}
              {primary.mega_count ? ` + mega 1–${primary.mega_max}` : ""}
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: primary.main_max ?? 30 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => (
                <button key={v} type="button" onClick={() => { setJackBalls((prev) => { if (prev.includes(v)) return prev.filter((x) => x !== v); if (prev.length >= (primary.main_count ?? 5)) return prev; return [...prev, v]; }); }} className={`h-9 w-9 rounded-full text-xs font-bold ${jackBalls.includes(v) ? "bg-indigo-500 text-white" : "bg-[var(--key)]"}`}>{v}</button>
              ))}
            </div>
            {!!primary.mega_count && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: primary.mega_max ?? 10 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => (
                  <button key={v} type="button" onClick={() => setJackMega(v)} className={`h-9 w-9 rounded-full text-xs font-bold ${jackMega === v ? "bg-rose-500 text-white" : "bg-[var(--key)]"}`}>{v}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {(primary?.format === "digit" || primary?.format === "zodiac") && (
          <div className="flex justify-center gap-2">
            {digitSlots.map((d, i) => (
              <div key={i} className="grid h-14 w-12 place-items-center rounded-xl border-2 border-[var(--line)] bg-[var(--card)] font-mono text-2xl font-bold shadow-sm">{d || "·"}</div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "DEL"].map((k) => (
            <button key={String(k)} type="button" onClick={() => key(k)} className="h-12 rounded-xl bg-[var(--card)] text-lg font-bold shadow-sm active:scale-95">{k === "DEL" ? "⌫" : k}</button>
          ))}
          <button type="button" onClick={() => key("CLR")} className="h-12 rounded-xl bg-rose-500/15 text-sm font-bold text-rose-600">CLR</button>
          <button type="button" onClick={quickPick} className="flex h-12 items-center justify-center gap-1 rounded-xl bg-indigo-500/15 text-sm font-bold text-indigo-600"><Dice5 size={16} /> QP</button>
          <button type="button" onClick={() => setField(field === "num" ? "amt" : "num")} className="h-12 rounded-xl bg-[var(--key)] text-xs font-bold">{field === "num" ? "→ Amt" : "→ Num"}</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => { setAmt(String(p)); setField("amt"); }} className="rounded-full bg-[var(--card)] px-3 py-1.5 text-xs font-semibold shadow-sm">{p}</button>
          ))}
          <input className="h-9 w-24 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-bold" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amt" onFocus={() => setField("amt")} />
          <button type="button" onClick={addPlay} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white">Add play</button>
        </div>

        {primary?.sessions && primary.sessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {primary.sessions.map((s) => (
              <button key={s.id} type="button" onClick={() => setSession(s.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${session === s.id ? "bg-indigo-600 text-white" : "bg-[var(--card)]"}`}>{s.label}</button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-[var(--mut)]">Multi-draw</span>
          {MULTI_DRAW.map((n) => (
            <button key={n} type="button" onClick={() => setMultiDraw(n)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${multiDraw === n ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-[var(--card)]"}`}>{n}d</button>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Ticket</h2>
          <div className="flex gap-1">
            <button type="button" onClick={clearLines} className="rounded-lg p-2 text-[var(--mut)] hover:bg-[var(--key)]" title="Clear"><Trash2 size={16} /></button>
            <button type="button" onClick={() => lastTicketId && replayTicket(lastTicketId)} className="rounded-lg p-2 text-[var(--mut)] hover:bg-[var(--key)]" title="Replay"><RotateCcw size={16} /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-xl bg-[var(--key)] px-3 py-2 text-xs">
              <span className="font-semibold">{games.find((g) => g.id === l.game)?.name} · {l.bet_type} · {l.number}</span>
              <span className="flex items-center gap-2">
                <span className="font-bold">{currency} {l.amount.toFixed(2)}</span>
                <button type="button" onClick={() => removeLine(l.id)} className="text-rose-500"><X size={14} /></button>
              </span>
            </div>
          ))}
          {!lines.length && <p className="py-8 text-center text-sm text-[var(--mut)]">No plays yet</p>}
        </div>
        <div className="border-t border-[var(--line)] pt-2">
          <div className="mb-2 flex justify-between text-lg font-extrabold">
            <span>Total</span>
            <span>{currency} {total.toFixed(2)}</span>
          </div>
          <button type="button" onClick={sendTicket} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg">
            <Printer size={18} /> Send & print
          </button>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => lastTicketId && cancelTicket(lastTicketId)} className="flex items-center justify-center gap-1 rounded-xl bg-rose-500/15 py-2 text-xs font-semibold text-rose-600"><Ban size={14} /> Cancel</button>
            <button type="button" onClick={() => lastTicketId && redeemTicket(lastTicketId)} className="flex items-center justify-center gap-1 rounded-xl bg-amber-500/15 py-2 text-xs font-semibold text-amber-700"><Banknote size={14} /> Redeem</button>
            <button type="button" onClick={() => setModal("support")} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--key)] py-2 text-xs font-semibold"><LifeBuoy size={14} /> Support</button>
          </div>
        </div>
        {shop && <p className="text-center text-[10px] text-[var(--mut)]">#{shop.number} {shop.name}</p>}
      </section>

      {modal === "support" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-[var(--card)] p-5 shadow-xl">
            <h3 className="font-bold">Support ticket</h3>
            <input className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm" placeholder="Subject" value={supSub} onChange={(e) => setSupSub(e.target.value)} />
            <textarea className="h-28 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] p-3 text-sm" placeholder="Describe the issue" value={supBody} onChange={(e) => setSupBody(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => { addSupport(supSub || "Support", supBody); setSupSub(""); setSupBody(""); setModal(null); }} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Submit</button>
              <button type="button" onClick={() => setModal(null)} className="rounded-full bg-[var(--key)] px-4 py-2 text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
