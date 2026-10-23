"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Dice5,
  FileChartColumn,
  LifeBuoy,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game } from "@/lib/types";

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
    total,
    toast,
  } = useStore();

  const enabled = games.filter((g) => g.enabled);
  const [sel, setSel] = useState<string[]>(enabled[0] ? [enabled[0].id] : []);
  const [bt, setBt] = useState(betTypes[0]?.key || "straight");
  const [num, setNum] = useState("");
  const [amt, setAmt] = useState("");
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [modal, setModal] = useState<"clerks" | "support" | null>(null);
  const [supSub, setSupSub] = useState("");
  const [supBody, setSupBody] = useState("");

  const primary: Game | undefined = useMemo(
    () => enabled.find((g) => sel.includes(g.id)) || enabled[0],
    [enabled, sel]
  );

  const digits = primary?.digits ?? 4;

  function toggleGame(id: string) {
    setSel((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));
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
      setNum((n) => (n.length >= digits ? n : n + String(k)));
    } else {
      if (String(k) === "." && amt.includes(".")) return;
      setAmt((a) => a + String(k));
    }
  }

  function addPlay() {
    if (!primary) return toast("Select a game", true);
    if (num.length < (primary.format === "digit" ? digits : 1))
      return toast(`Enter ${digits}-digit number`, true);
    const amount = parseFloat(amt);
    if (!amount || amount <= 0) return toast("Enter amount", true);
    addLine({
      game: primary.id,
      bet_type: bt,
      number: num.padStart(digits, "0").slice(0, digits),
      amount,
      date,
    });
    setNum("");
    setAmt("");
    setField("num");
    toast("Play added");
  }

  function sendTicket() {
    if (!lines.length) return toast("No plays on ticket", true);
    toast(`Ticket sold · ${currency} ${total.toFixed(2)}`);
    clearLines();
  }

  const presets = [1, 2, 5, 10, 20, 50];

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
                  {g.format === "digit" ? `${g.digits}d` : g.format} · Draw {g.draw_time}
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
          <div className="flex flex-wrap gap-1">
            {betTypes
              .filter((b) => b.enabled)
              .map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBt(b.key)}
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

        <div className="grid grid-cols-5 gap-1.5">
          {[
            {
              icon: Dice5,
              label: "Quick",
              fn: () =>
                setNum(String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0")),
            },
            { icon: Copy, label: "Clear", fn: () => clearLines() },
            { icon: FileChartColumn, label: "Report", fn: () => toast("Today report printed (demo)") },
            { icon: Users, label: "Clerks", fn: () => setModal("clerks") },
            { icon: LifeBuoy, label: "Support", fn: () => setModal("support") },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.fn}
              className="flex flex-col items-center gap-1 rounded-xl bg-[var(--key)] py-2 text-[11px] font-semibold text-[var(--mut)]"
            >
              <a.icon size={20} className="text-indigo-500" />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Current ticket</h2>
          <span className="rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">
            {lines.length} plays
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto">
          {lines.length === 0 && (
            <div className="py-16 text-center text-[var(--mut)]">
              <div className="text-4xl">🎟️</div>
              <p className="mt-2 text-sm">No plays yet</p>
            </div>
          )}
          {lines.map((l) => {
            const g = games.find((x) => x.id === l.game);
            return (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--key)] p-2"
              >
                <i className="h-8 w-2 rounded" style={{ background: g?.color || "#6366f1" }} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-lg font-bold tracking-wider">{l.number}</div>
                  <div className="text-xs text-[var(--mut)]">
                    {g?.name} · {betTypes.find((b) => b.key === l.bet_type)?.label} · {l.date.slice(5)}
                  </div>
                </div>
                <div className="font-bold">
                  {currency} {l.amount.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
          <div>
            <div className="text-xs text-[var(--mut)]">Total</div>
            <div className="text-3xl font-extrabold">
              {currency} {total.toFixed(2)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => clearLines()}
              className="flex h-14 items-center gap-2 rounded-2xl bg-[var(--key)] px-4 font-semibold"
            >
              <Trash2 size={18} /> Clear
            </button>
            <button
              type="button"
              onClick={sendTicket}
              className="h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-8 text-lg font-bold text-white shadow-lg shadow-emerald-500/30"
            >
              Sell
            </button>
          </div>
        </div>
      </section>

      {modal === "clerks" && (
        <Modal title="Clerks" onClose={() => setModal(null)}>
          <p className="mb-3 text-sm text-[var(--mut)]">
            POS operators for this shop. Owner manages games & promos; retailers manage clerks.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--mut)]">
                <th className="pb-2">Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">Operator 1</td>
                <td>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-1">Operator 2</td>
                <td>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 font-semibold text-white"
            onClick={() => {
              toast("Clerk added (demo)");
              setModal(null);
            }}
          >
            Add clerk
          </button>
        </Modal>
      )}

      {modal === "support" && (
        <Modal title="Support ticket" onClose={() => setModal(null)}>
          <p className="mb-3 text-sm text-[var(--mut)]">
            Report POS issues to the lottery operator (printer, network, payout).
          </p>
          <label className="mb-1 block text-xs font-semibold text-[var(--mut)]">Subject</label>
          <input
            className="mb-3 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3"
            value={supSub}
            onChange={(e) => setSupSub(e.target.value)}
            placeholder="e.g. Printer offline"
          />
          <label className="mb-1 block text-xs font-semibold text-[var(--mut)]">Details</label>
          <textarea
            className="mb-3 min-h-[100px] w-full rounded-xl border border-[var(--line)] bg-[var(--key)] p-3"
            value={supBody}
            onChange={(e) => setSupBody(e.target.value)}
          />
          <button
            type="button"
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 font-semibold text-white"
            onClick={() => {
              if (!supSub.trim()) return toast("Enter a subject", true);
              toast("Ticket submitted to operator");
              setSupSub("");
              setSupBody("");
              setModal(null);
            }}
          >
            Submit ticket
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--card)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--key)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
