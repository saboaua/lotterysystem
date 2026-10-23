"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

export function ReportsScreen() {
  const {
    user,
    soldTickets,
    selectedRetailerId,
    retailers,
    games,
    currency,
  } = useStore();

  const isOwner = user?.role === "owner";
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const scoped = useMemo(() => {
    let list = soldTickets.filter((t) => {
      const d = t.created_at.slice(0, 10);
      return d >= from && d <= to;
    });
    if (!isOwner) {
      list = list.filter((t) => t.retailer_id === selectedRetailerId);
    }
    return list;
  }, [soldTickets, from, to, isOwner, selectedRetailerId]);

  const sold = scoped.filter((t) => t.status !== "cancelled");
  const cancelled = scoped.filter((t) => t.status === "cancelled");
  const sales = sold.reduce((s, t) => s + t.total, 0);
  const plays = sold.reduce((s, t) => s + t.lines.length, 0);

  const byGame = useMemo(() => {
    const m: Record<string, { sales: number; plays: number }> = {};
    for (const t of sold) {
      for (const l of t.lines) {
        if (!m[l.game]) m[l.game] = { sales: 0, plays: 0 };
        m[l.game].sales += l.amount;
        m[l.game].plays += 1;
      }
    }
    return m;
  }, [sold]);

  const byRetailer = useMemo(() => {
    if (!isOwner) return {};
    const m: Record<string, { sales: number; tickets: number }> = {};
    for (const t of sold) {
      if (!m[t.retailer_id]) m[t.retailer_id] = { sales: 0, tickets: 0 };
      m[t.retailer_id].sales += t.total;
      m[t.retailer_id].tickets += 1;
    }
    return m;
  }, [sold, isOwner]);

  const shop = retailers.find((r) => r.id === selectedRetailerId);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-sm text-[var(--mut)]">
            {isOwner
              ? "Network-wide (all retailers)"
              : `Your shop only · ${shop?.number} ${shop?.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <label className="text-xs font-semibold text-[var(--mut)]">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block h-10 rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block h-10 rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Tickets sold" value={String(sold.length)} />
        <Card label="Cancelled" value={String(cancelled.length)} />
        <Card label="Plays" value={String(plays)} />
        <Card label="Sales" value={`${currency} ${sales.toFixed(2)}`} />
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <h2 className="mb-3 font-bold">By game</h2>
        <div className="space-y-1">
          {Object.entries(byGame).map(([gid, v]) => {
            const g = games.find((x) => x.id === gid);
            return (
              <div
                key={gid}
                className="flex items-center justify-between rounded-xl bg-[var(--key)] px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: g?.color || "#888" }}
                  />
                  {g?.name || gid}
                </span>
                <span className="text-[var(--mut)]">{v.plays} plays</span>
                <span className="font-bold">
                  {currency} {v.sales.toFixed(2)}
                </span>
              </div>
            );
          })}
          {!Object.keys(byGame).length && (
            <p className="py-4 text-center text-sm text-[var(--mut)]">No data in range</p>
          )}
        </div>
      </section>

      {isOwner && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
          <h2 className="mb-3 font-bold">By retailer</h2>
          <div className="space-y-1">
            {Object.entries(byRetailer).map(([rid, v]) => {
              const r = retailers.find((x) => x.id === rid);
              return (
                <div
                  key={rid}
                  className="flex items-center justify-between rounded-xl bg-[var(--key)] px-3 py-2 text-sm"
                >
                  <span className="font-semibold">
                    #{r?.number} {r?.name}
                  </span>
                  <span className="text-[var(--mut)]">{v.tickets} tickets</span>
                  <span className="font-bold">
                    {currency} {v.sales.toFixed(2)}
                  </span>
                </div>
              );
            })}
            {!Object.keys(byRetailer).length && (
              <p className="py-4 text-center text-sm text-[var(--mut)]">No data in range</p>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <h2 className="mb-3 font-bold">Ticket list</h2>
        <div className="max-h-72 space-y-1 overflow-auto">
          {scoped.slice(0, 50).map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--key)] px-3 py-2 text-xs"
            >
              <span className="font-mono font-bold">{t.id}</span>
              <span className="text-[var(--mut)]">{t.created_at.slice(0, 16).replace("T", " ")}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-bold ${
                  t.status === "sold"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : t.status === "cancelled"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                      : "bg-amber-500/15 text-amber-700"
                }`}
              >
                {t.status}
              </span>
              <span className="font-bold">
                {currency} {t.total.toFixed(2)}
              </span>
            </div>
          ))}
          {!scoped.length && (
            <p className="py-4 text-center text-sm text-[var(--mut)]">No tickets in range</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-[var(--mut)]">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  );
}
