"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Printer, ScanLine, Ticket, Wallet, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TopUp, TopUpKind } from "@/lib/types";
import { printTopUp } from "@/lib/print-topup";
import {
  callTopUpGateway,
  generateVoucherCode,
  getTopUpDesign,
  maskPlayerCode,
  topUpId,
  validateAmount,
} from "@/lib/topup";

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function TopUpModal({ onClose }: { onClose: () => void }) {
  const {
    ticketDesign,
    brand,
    retailers,
    selectedRetailerId,
    currency,
    user,
    topUps,
    addTopUp,
    toast,
  } = useStore();
  const cfg = getTopUpDesign(ticketDesign);
  const shop = retailers.find((r) => r.id === selectedRetailerId);

  const [mode, setMode] = useState<TopUpKind>("direct");
  const [amount, setAmount] = useState("");
  const [playerCode, setPlayerCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<TopUp | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "direct" && !done && !confirming) codeRef.current?.focus();
  }, [mode, done, confirming]);

  const value = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const money = (n: number) => `${currency} ${n.toFixed(2)}`;
  const mine = topUps.filter((t) => t.retailer_id === selectedRetailerId).slice(0, 5);

  const print = (t: TopUp, reprint = false, win?: Window | null) =>
    printTopUp({ topUp: t, brand, design: ticketDesign, retailer: shop, currency, reprint, win });

  /** Validate and move to the confirm step (direct) or run immediately (voucher). */
  function submit() {
    const err = validateAmount(value, cfg, currency);
    if (err) {
      toast(err, true);
      amountRef.current?.focus();
      return;
    }
    if (mode === "direct") {
      if (playerCode.replace(/\s/g, "").length < 4) {
        toast("Scan or enter the player code", true);
        codeRef.current?.focus();
        return;
      }
      setConfirming(true);
      return;
    }
    void run();
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    // Open the print window now (inside the tap) so browsers don't block it after the network call.
    const willPrint = mode === "voucher" || cfg.print_on_direct;
    const win = willPrint ? window.open("", "_blank", "width=420,height=720") : null;

    const id = topUpId();
    const base = {
      id,
      kind: mode,
      amount: value,
      retailer_id: selectedRetailerId,
      clerk: user?.name,
      created_at: new Date().toISOString(),
    };

    if (mode === "voucher") {
      const code = generateVoucherCode(cfg, topUps);
      const res = await callTopUpGateway({
        action: "issue",
        reference: id,
        amount: value,
        retailer_id: selectedRetailerId,
        code,
      });
      if (!res.ok) {
        win?.close();
        toast(res.error || "Could not issue the voucher", true);
        setBusy(false);
        return;
      }
      const t: TopUp = { ...base, kind: "voucher", code, status: "issued", demo: res.demo };
      addTopUp(t);
      print(t, false, win);
      setDone(t);
    } else {
      const code = playerCode.trim();
      const res = await callTopUpGateway({
        action: "credit",
        reference: id,
        amount: value,
        retailer_id: selectedRetailerId,
        player_code: code,
      });
      if (!res.ok) {
        win?.close();
        addTopUp({ ...base, kind: "direct", player_code: code, status: "failed", error: res.error });
        toast(res.error || "Top-up failed. Nothing was added.", true);
        setConfirming(false);
        setBusy(false);
        return;
      }
      const t: TopUp = { ...base, kind: "direct", player_code: code, status: "credited", demo: res.demo };
      addTopUp(t);
      if (cfg.print_on_direct) print(t, false, win);
      setDone(t);
    }
    setBusy(false);
    setConfirming(false);
  }

  function reset() {
    setDone(null);
    setAmount("");
    setPlayerCode("");
    setConfirming(false);
  }

  const tab = (k: TopUpKind, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => {
        setMode(k);
        setConfirming(false);
      }}
      className={
        "flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition " +
        (mode === k
          ? "bg-emerald-600 text-white shadow"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300")
      }
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Wallet size={18} />
            </span>
            Player top-up
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          /* ---------- Success ---------- */
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40">
              <Check size={34} strokeWidth={3} />
            </div>
            <div className="mt-3 text-xl font-black text-slate-900 dark:text-white">
              {done.kind === "voucher" ? "Voucher ready" : "Top-up added"}
            </div>
            <div className="mt-1 font-mono text-3xl font-black text-emerald-600">{money(done.amount)}</div>
            {done.kind === "voucher" ? (
              <div className="mx-auto mt-3 max-w-xs rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-950/30">
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  Player enters this code
                </div>
                <div className="mt-1 font-mono text-3xl font-black tracking-[0.16em] text-slate-900 dark:text-white">
                  {done.code}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Added to player account {maskPlayerCode(done.player_code || "")}
              </p>
            )}
            {done.demo && (
              <p className="mx-auto mt-3 flex max-w-xs items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-left text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Demo mode: the player system is not connected, so nothing was really credited.
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => print(done, true)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer size={16} /> {done.kind === "direct" && !cfg.print_on_direct ? "Print receipt" : "Reprint"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-[52px] rounded-xl bg-emerald-600 text-sm font-extrabold text-white"
              >
                New top-up
              </button>
            </div>
            <button type="button" onClick={onClose} className="mt-2 min-h-[44px] w-full text-sm font-bold text-slate-500">
              Done
            </button>
          </div>
        ) : confirming ? (
          /* ---------- Confirm direct credit ---------- */
          <div>
            <p className="text-center text-sm font-semibold text-slate-500">Please confirm</p>
            <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800">
              <div className="font-mono text-3xl font-black text-emerald-600">{money(value)}</div>
              <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                will be added to player account
              </div>
              <div className="mt-1 font-mono text-xl font-black tracking-widest text-slate-900 dark:text-white">
                {playerCode.trim()}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">Collect the cash from the player before confirming.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="flex min-h-[56px] items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={() => void run()}
                disabled={busy}
                className="min-h-[56px] rounded-xl bg-emerald-600 text-base font-extrabold text-white disabled:opacity-60"
              >
                {busy ? "Adding…" : "Confirm top-up"}
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Form ---------- */
          <>
            <div className="flex gap-2">
              {tab("direct", "Add to account", <ScanLine size={18} />)}
              {tab("voucher", "Print voucher", <Ticket size={18} />)}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {mode === "direct"
                ? "Scan the player's code and the amount goes straight to their account."
                : `Prints a ticket with a code. The player signs in at ${cfg.website} and enters it.`}
            </p>

            {mode === "direct" && (
              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Player code
                <input
                  ref={codeRef}
                  value={playerCode}
                  onChange={(e) => setPlayerCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (value > 0) submit();
                      else amountRef.current?.focus();
                    }
                  }}
                  placeholder="Scan or type code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="mt-1 h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 font-mono text-xl font-bold tracking-widest text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            )}

            <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Amount</div>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {cfg.quick_amounts.slice(0, 8).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={
                    "min-h-[52px] rounded-xl border text-base font-extrabold transition " +
                    (value === a
                      ? "border-emerald-600 bg-emerald-600 text-white shadow"
                      : "border-slate-200 bg-white text-slate-800 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white")
                  }
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currency}
              </span>
              <input
                ref={amountRef}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                inputMode="decimal"
                placeholder="Other amount"
                className="h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-14 pr-4 text-right font-mono text-xl font-black text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Min {money(cfg.min_amount)} · Max {money(cfg.max_amount)}
            </p>

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-4 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-60 dark:shadow-none"
            >
              {mode === "direct" ? <ScanLine size={18} /> : <Printer size={18} />}
              {busy
                ? "Working…"
                : mode === "direct"
                  ? value > 0
                    ? `Add ${money(value)} to account`
                    : "Add to account"
                  : value > 0
                    ? `Print voucher ${money(value)}`
                    : "Print voucher"}
            </button>

            {mine.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent top-ups</div>
                <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {mine.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {money(t.amount)}{" "}
                          <span className="text-xs font-semibold text-slate-400">
                            {t.kind === "voucher" ? "voucher" : "to account"} · {timeFmt(t.created_at)}
                          </span>
                        </div>
                        <div className="truncate font-mono text-xs text-slate-500">
                          {t.kind === "voucher" ? t.code : maskPlayerCode(t.player_code || "")}
                          {t.status === "failed" && <span className="ml-2 font-sans font-bold text-rose-600">Failed</span>}
                          {t.status === "redeemed" && <span className="ml-2 font-sans font-bold text-emerald-600">Used</span>}
                        </div>
                      </div>
                      {t.status !== "failed" && (
                        <button
                          type="button"
                          onClick={() => print(t, true)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                          aria-label="Reprint"
                        >
                          <Printer size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TopUpModal;
