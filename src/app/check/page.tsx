"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export default function CheckPage() {
  const { checkPromoCode, soldTickets, brand, currency } = useStore();
  const [code, setCode] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [result, setResult] = useState<{
    kind: "promo" | "ticket";
    ok: boolean;
    message: string;
    prize?: number;
    ticket?: (typeof soldTickets)[0];
  } | null>(null);

  function onPromo() {
    const r = checkPromoCode(code.trim());
    setResult({ kind: "promo", ...r });
  }

  function onTicket() {
    const t = soldTickets.find((x) => x.id === ticketId.trim().toUpperCase());
    if (!t) {
      setResult({ kind: "ticket", ok: false, message: "Ticket not found" });
      return;
    }
    setResult({
      kind: "ticket",
      ok: true,
      message:
        t.status === "paid"
          ? `Paid · prize ${currency} ${(t.prize ?? 0).toFixed(2)}`
          : t.status === "won"
            ? `Winner · claim ${currency} ${(t.prize ?? 0).toFixed(2)}`
            : t.status === "cancelled"
              ? "Ticket was cancelled"
              : `Sold · total ${currency} ${t.total.toFixed(2)}`,
      ticket: t,
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg,#f0f2f8)] px-4 py-10 text-[var(--ink,#0f172a)]">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-extrabold">{brand.name}</h1>
          <p className="text-sm text-[var(--mut,#64748b)]">{brand.tagline}</p>
        </header>

        <section className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--mut,#64748b)]">
            Check promotion code
          </h2>
          <div className="flex gap-2">
            <input
              className="h-11 flex-1 rounded-xl border border-[var(--line,#e2e8f0)] px-3 text-sm"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onPromo()}
            />
            <button
              type="button"
              onClick={onPromo}
              className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
            >
              Check
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--mut,#64748b)]">
            Check ticket
          </h2>
          <div className="flex gap-2">
            <input
              className="h-11 flex-1 rounded-xl border border-[var(--line,#e2e8f0)] px-3 text-sm"
              placeholder="Ticket ID e.g. T00001234"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onTicket()}
            />
            <button
              type="button"
              onClick={onTicket}
              className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              Check
            </button>
          </div>
        </section>

        {result && (
          <div
            className={`rounded-2xl border p-5 text-center shadow-sm ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <p className="text-lg font-bold">{result.message}</p>
            {result.prize != null && (
              <p className="mt-1 text-sm">
                Prize: {currency} {result.prize.toFixed(2)}
              </p>
            )}
            {result.ticket && (
              <div className="mt-3 text-left text-xs opacity-80">
                <p>Status: {result.ticket.status}</p>
                <p>Plays: {result.ticket.lines.length}</p>
                <p>Sold: {new Date(result.ticket.created_at).toLocaleString()}</p>
                {result.ticket.promo_code && <p>Promo: {result.ticket.promo_code}</p>}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-[var(--mut,#64748b)]">
          Play responsibly · 18+
        </p>
      </div>
    </div>
  );
}
