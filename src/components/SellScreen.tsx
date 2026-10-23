"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Dice5,
  FileChartColumn,
  LifeBuoy,
  Printer,
  RotateCcw,
  ScanBarcode,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game } from "@/lib/types";
import { PLAY_WHE_MARKS, ZODIAC_SYMBOLS } from "@/lib/constants";

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [sel, setSel] = useState<string[]>(enabled[0] ? [enabled[0].id] : []);
  const [bt, setBt] = useState(betTypes[0]?.key || "4_cifra");
  const [num, setNum] = useState("");
  const [amt, setAmt] = useState("");
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [session, setSession] = useState<string>("");
  const [modal, setModal] = useState<"clerks" | "support" | "scan" | "report" | null>(null);
  const [supSub, setSupSub] = useState("");
  const [supBody, setSupBody] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [zodiacPick, setZodiacPick] = useState<string[]>([]);
  const [whePick, setWhePick] = useState<number | null>(null);
  const [jackBalls, setJackBalls] = useState<number[]>([]);
  const [jackMega, setJackMega] = useState<number | null>(null);

  const primary: Game | undefined = useMemo(
    () => enabled.find((g) => sel.includes(g.id)) || enabled[0],
    [enabled, sel]
  );

  const allowedBets = useMemo(() => {
    if (!primary?.bet_types?.length) return betTypes.filter((b) => b.enabled);
    return betTypes.filter((b) => b.enabled && primary.bet_types!.includes(b.key));
  }, [primary, betTypes]);

  const activeBet = allowedBets.find((b) => b.key === bt) || allowedBets[0];
  const digits = activeBet?.digits ?? primary?.digits ?? 4;

  useMemo(() => {
    if (allowedBets.length && !allowedBets.find((b) => b.key === bt)) {
      setBt(allowedBets[0].key);
    }
  }, [allowedBets, bt]);

  useMemo(() => {
    if (primary?.sessions?.length && !session) {
      setSession(primary.sessions[0].id);
    } else if (!primary?.sessions?.length) {
      setSession("");
    }
  }, [primary, session]);

  function toggleGame(id: string) {
    setSel((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));
    setNum("");
    setZodiacPick([]);
    setWhePick(null);
    setJackBalls([]);
    setJackMega(null);
  }

  function key(k: string | number) {
    if (k === "CLR") {
      if (field === "num") setNum("");
      else setAmt("");
      return;
    }
    if (k === "DEL") {
      if (field === "num") setNum((n) => n.slice(0, -1));
      else setAmt((a) => a.slice(0, -1));
      return;
    }
    if (field === "num") {
      if (primary?.format === "digit") {
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
    if (activeBet?.min_stake && amount < activeBet.min_stake)
      return toast(`Min stake ${currency} ${activeBet.min_stake}`, true);

    if (primary.format === "digit") {
      if (num.length < digits) return toast(`Enter ${digits}-digit number`, true);
      for (const gid of sel) {
        const g = enabled.find((x) => x.id === gid);
        if (!g) continue;
        addLine({
          game: g.id,
          bet_type: bt,
          number: num.padStart(digits, "0").slice(0, digits),
          amount,
          date,
          session: session || undefined,
        });
      }
      setNum("");
    } else if (primary.format === "zodiac") {
      if (!zodiacPick.length) return toast("Pick at least one sign", true);
      addLine({
        game: primary.id,
        bet_type: "zodiac",
        number: zodiacPick.join(","),
        amount,
        date,
        symbols: [...zodiacPick],
      });
      setZodiacPick([]);
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
    } else if (primary.format === "jackpot") {
      const need = primary.main_count ?? 5;
      if (jackBalls.length !== need) return toast(`Pick ${need} numbers`, true);
      if (primary.mega_count && jackMega == null) return toast("Pick mega number", true);
      addLine({
        game: primary.id,
        bet_type: "jackpot",
        number:
          [...jackBalls].sort((a, b) => a - b).join("-") +
          (jackMega != null ? `+${jackMega}` : ""),
        amount,
        date,
        balls: [...jackBalls].sort((a, b) => a - b),
        mega: jackMega ?? undefined,
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
    if (!primary) return;
    if (primary.format === "digit") {
      let s = "";
      for (let i = 0; i < digits; i++) s += Math.floor(Math.random() * 10);
      setNum(s);
      setField("num");
    } else if (primary.format === "zodiac") {
      const z = ZODIAC_SYMBOLS[Math.floor(Math.random() * ZODIAC_SYMBOLS.length)];
      setZodiacPick([z.id]);
    } else if (primary.format === "whe") {
      setWhePick(Math.floor(Math.random() * 36) + 1);
    } else if (primary.format === "jackpot") {
      const max = primary.main_max ?? 30;
      const need = primary.main_count ?? 5;
      const set = new Set<number>();
      while (set.size < need) set.add(Math.floor(Math.random() * max) + 1);
      setJackBalls([...set]);
      if (primary.mega_max) setJackMega(Math.floor(Math.random() * primary.mega_max) + 1);
    }
  }

  function handleScan() {
    const code = scanCode.trim();
    if (!code) return toast("Enter or scan barcode", true);
    const match = code.match(/T?\d{6,}/i);
    const tid = match ? (match[0].startsWith("T") ? match[0] : `T${match[0]}`) : code;
    const t = soldTickets.find((x) => x.id === tid || x.id.endsWith(tid.replace(/^T/i, "")));
    if (!t) {
      toast("Ticket not found", true);
      return;
    }
    if (t.status === "won") {
      redeemTicket(t.id);
    } else if (t.status === "sold") {
      replayTicket(t.id);
    } else {
      toast(`Ticket ${t.id} is ${t.status}`, true);
    }
    setScanCode("");
    setModal(null);
  }

  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const presets = [0.5, 1, 2, 5, 10, 20];

  return (
    <div className="grid h-full gap-3 p-3 lg:grid-cols-[1.2fr_0.9fr]">
      <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {enabled.map((g) => {
            const on = sel.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGame(g.id)}
                className={`relative flex flex-col items-start rounded-2xl p-3 text-left text-white transition ${
                  on ? "opacity-100 ring-2 ring-white/40 ring-offset-2 ring-offset-[var(--card)]" : "opacity-55"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #000))`,
                }}
              >
                <span className="text-lg font-bold">{g.name}</span>
                <span className="text-[11px] opacity-90">
                  {g.format === "digit" ? `${g.digits}d` : g.format}
                  {g.jackpot_current != null
                    ? ` · AWG ${g.jackpot_current.toLocaleString()}`
                    : ` · Draw ${g.draw_time}`}
                </span>
                {on && (
                  <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-slate-900">
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
            className="h-10 rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
          />
          {primary?.sessions && primary.sessions.length > 0 && (
            <div className="flex gap-1">
              {primary.sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSession(s.id)}
                  className={`h-10 rounded-xl px-3 text-sm font-semibold ${
                    session === s.id
                      ? "bg-emerald-500 text-white"
                      : "bg-[var(--key)] text-[var(--mut)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {allowedBets.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => {
                  setBt(b.key);
                  setNum("");
                }}
                className={`h-10 rounded-xl px-3 text-sm font-semibold ${
                  bt === b.key
                    ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                    : "bg-[var(--key)] text-[var(--mut)]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {primary?.format === "digit" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setField("num")}
              className={`relative rounded-2xl border-2 p-3 text-left ${
                field === "num" ? "border-indigo-500" : "border-[var(--line)]"
              } bg-[var(--key)]`}
            >
              <span className="text-[10px] uppercase text-[var(--mut)]">Number</span>
              <div className="font-mono text-3xl font-extrabold tracking-widest text-indigo-600 dark:text-indigo-300">
                {num || "—".repeat(digits)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setField("amt")}
              className={`relative rounded-2xl border-2 p-3 text-left ${
                field === "amt" ? "border-indigo-500" : "border-[var(--line)]"
              } bg-[var(--key)]`}
            >
              <span className="text-[10px] uppercase text-[var(--mut)]">Amount ({currency})</span>
              <div className="text-3xl font-extrabold">{amt || "0.00"}</div>
            </button>
          </div>
        )}

        {primary?.format === "zodiac" && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {ZODIAC_SYMBOLS.map((z) => {
                const on = zodiacPick.includes(z.id);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() =>
                      setZodiacPick((p) =>
                        p.includes(z.id) ? p.filter((x) => x !== z.id) : [...p, z.id]
                      )
                    }
                    className={`rounded-xl p-2 text-center text-xs font-semibold ${
                      on
                        ? "bg-indigo-500 text-white ring-2 ring-indigo-300"
                        : "bg-[var(--key)] text-[var(--ink)]"
                    }`}
                  >
                    <span className="block text-xl">{z.emoji}</span>
                    {z.label}
                  </button>
                );
              })}
            </div>
            <AmtField field={field} setField={setField} amt={amt} currency={currency} />
          </div>
        )}

        {primary?.format === "whe" && (
          <div className="space-y-2">
            <div className="grid max-h-48 grid-cols-4 gap-1 overflow-auto sm:grid-cols-6">
              {PLAY_WHE_MARKS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setWhePick(m.num)}
                  className={`rounded-xl p-1.5 text-center text-[10px] font-semibold ${
                    whePick === m.num
                      ? "bg-rose-500 text-white ring-2 ring-rose-300"
                      : "bg-[var(--key)] text-[var(--ink)]"
                  }`}
                >
                  <span className="block text-base">{m.emoji}</span>
                  {m.num} {m.label}
                </button>
              ))}
            </div>
            <AmtField field={field} setField={setField} amt={amt} currency={currency} />
          </div>
        )}

        {primary?.format === "jackpot" && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--mut)]">
              Pick {primary.main_count} of {primary.main_max}
              {primary.mega_count ? ` + mega (1–${primary.mega_max})` : ""}
            </p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: primary.main_max ?? 30 }, (_, i) => i + 1).map((n) => {
                const on = jackBalls.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setJackBalls((prev) => {
                        if (prev.includes(n)) return prev.filter((x) => x !== n);
                        if (prev.length >= (primary.main_count ?? 5)) return prev;
                        return [...prev, n];
                      });
                    }}
                    className={`h-9 w-9 rounded-full text-sm font-bold ${
                      on ? "bg-indigo-500 text-white" : "bg-[var(--key)] text-[var(--ink)]"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {primary.mega_count ? (
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: primary.mega_max ?? 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={`m${n}`}
                    type="button"
                    onClick={() => setJackMega(n)}
                    className={`h-9 w-9 rounded-full text-sm font-bold ${
                      jackMega === n ? "bg-amber-500 text-white" : "bg-[var(--key)] text-[var(--ink)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : null}
            <AmtField field={field} setField={setField} amt={amt} currency={currency} />
          </div>
        )}

        <button
          type="button"
          onClick={addPlay}
          className="h-14 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-lg font-bold text-white shadow-lg shadow-rose-500/30"
        >
          + Add to ticket
        </button>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "CLR", 0, "DEL"].map((k) => (
              <button
                key={String(k)}
                type="button"
                onClick={() => key(k)}
                className="h-12 rounded-xl bg-[var(--key)] text-lg font-bold active:scale-95"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex w-24 flex-col gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAmt(String(p));
                  setField("amt");
                }}
                className="flex-1 rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-300"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {[
            { icon: Dice5, label: "Quick", fn: quickPick },
            {
              icon: Trash2,
              label: "Clear",
              fn: () => {
                clearLines();
                toast("Ticket cleared");
              },
            },
            {
              icon: RotateCcw,
              label: "Replay",
              fn: () => {
                if (lastTicketId) replayTicket(lastTicketId);
                else toast("No last ticket", true);
              },
            },
            {
              icon: Copy,
              label: "Último",
              fn: () => {
                if (lastTicketId) {
                  toast(`Last ticket: ${lastTicketId}`);
                  replayTicket(lastTicketId);
                } else toast("No last ticket", true);
              },
            },
            {
              icon: X,
              label: "Cancel",
              fn: () => {
                if (lastTicketId) cancelTicket(lastTicketId);
                else toast("No ticket to cancel", true);
              },
            },
            { icon: ScanBarcode, label: "Scan", fn: () => setModal("scan") },
            { icon: FileChartColumn, label: "Report", fn: () => setModal("report") },
            { icon: LifeBuoy, label: "Support", fn: () => setModal("support") },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.fn}
              className="flex flex-col items-center gap-0.5 rounded-xl bg-[var(--key)] py-2 text-[10px] font-semibold text-[var(--mut)] hover:text-[var(--ink)]"
            >
              <a.icon size={18} />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div>
            <div className="text-sm font-bold">Current ticket</div>
            <div className="text-xs text-[var(--mut)]">
              {shop?.number} · {shop?.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-[var(--mut)]">Total</div>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-300">
              {currency} {total.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-3">
          {lines.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--mut)]">No plays yet — add from the left</p>
          )}
          {lines.map((l) => {
            const g = games.find((x) => x.id === l.game);
            const b = betTypes.find((x) => x.key === l.bet_type);
            return (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2.5"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: g?.color || "#888" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {g?.name} · {b?.label || l.bet_type}
                    {l.session ? ` · ${l.session.toUpperCase()}` : ""}
                  </div>
                  <div className="font-mono text-xs text-[var(--mut)]">
                    {l.number} · {l.date} · {currency} {l.amount.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  className="rounded-lg p-1.5 text-[var(--mut)] hover:bg-rose-500/15 hover:text-rose-500"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--line)] p-3">
          <button
            type="button"
            onClick={sendTicket}
            disabled={!lines.length}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-40"
          >
            <Printer size={20} />
            Send &amp; Print
          </button>
        </div>
      </section>

      {modal === "support" && (
        <Modal title="Support ticket" onClose={() => setModal(null)}>
          <input
            className="mb-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            placeholder="Subject"
            value={supSub}
            onChange={(e) => setSupSub(e.target.value)}
          />
          <textarea
            className="mb-3 h-28 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm"
            placeholder="Describe the issue…"
            value={supBody}
            onChange={(e) => setSupBody(e.target.value)}
          />
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-indigo-500 font-semibold text-white"
            onClick={() => {
              if (!supSub.trim()) return toast("Subject required", true);
              addSupport(supSub.trim(), supBody.trim());
              setSupSub("");
              setSupBody("");
              setModal(null);
            }}
          >
            Submit
          </button>
        </Modal>
      )}

      {modal === "scan" && (
        <Modal title="Scan / lookup ticket" onClose={() => setModal(null)}>
          <p className="mb-2 text-xs text-[var(--mut)]">
            Scan barcode or type ticket number. Winning tickets redeem; others replay lines.
          </p>
          <input
            className="mb-3 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 font-mono text-sm"
            placeholder="T00001234 or barcode"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            autoFocus
          />
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-indigo-500 font-semibold text-white"
            onClick={handleScan}
          >
            Lookup
          </button>
        </Modal>
      )}

      {modal === "report" && (
        <Modal title="Shop report (today)" onClose={() => setModal(null)}>
          <ShopReportInline />
        </Modal>
      )}

      {modal === "clerks" && (
        <Modal title="Clerks" onClose={() => setModal(null)}>
          <p className="text-sm text-[var(--mut)]">Clerk PIN login — wire to Supabase clerks table.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--key)] px-3 py-3">
            <Users size={18} />
            <span className="text-sm font-semibold">Demo clerk · PIN 1234</span>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AmtField({
  field,
  setField,
  amt,
  currency,
}: {
  field: string;
  setField: (f: "num" | "amt") => void;
  amt: string;
  currency: string;
}) {
  return (
    <button
      type="button"
      onClick={() => setField("amt")}
      className={`w-full rounded-2xl border-2 p-3 text-left ${
        field === "amt" ? "border-indigo-500" : "border-[var(--line)]"
      } bg-[var(--key)]`}
    >
      <span className="text-[10px] uppercase text-[var(--mut)]">Amount ({currency})</span>
      <div className="text-2xl font-extrabold">{amt || "0.00"}</div>
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--key)]">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ShopReportInline() {
  const { soldTickets, selectedRetailerId, currency, ticketsToday, salesToday } = useStore();
  const shopTickets = soldTickets.filter((t) => t.retailer_id === selectedRetailerId);
  const cancelled = shopTickets.filter((t) => t.status === "cancelled").length;

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Tickets today" value={String(ticketsToday)} />
        <Stat label="Sales today" value={`${currency} ${salesToday.toFixed(2)}`} />
        <Stat label="All tickets" value={String(shopTickets.length)} />
        <Stat label="Cancelled" value={String(cancelled)} />
      </div>
      <div className="max-h-48 space-y-1 overflow-auto">
        {shopTickets.slice(0, 20).map((t) => (
          <div key={t.id} className="flex justify-between rounded-lg bg-[var(--key)] px-3 py-2 text-xs">
            <span className="font-mono font-bold">{t.id}</span>
            <span className="text-[var(--mut)]">{t.status}</span>
            <span>
              {currency} {t.total.toFixed(2)}
            </span>
          </div>
        ))}
        {!shopTickets.length && <p className="text-center text-[var(--mut)]">No tickets yet</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--key)] p-3">
      <div className="text-[10px] uppercase text-[var(--mut)]">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
