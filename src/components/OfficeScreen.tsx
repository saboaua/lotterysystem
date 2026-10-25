"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { PromosPanel } from "./office/PromosPanel";
import { ResultsPanel } from "./office/ResultsPanel";
import { GamesPanel } from "./office/GamesPanel";
import { BrandPanel } from "./office/BrandPanel";
import { TicketDesignPanel } from "./office/TicketDesignPanel";
import { RetailersPanel } from "./office/RetailersPanel";
import { HelpPanel } from "./office/HelpPanel";

type Sub =
  | "games"
  | "brand"
  | "ticket"
  | "promos"
  | "results"
  | "reports"
  | "retailers"
  | "help";

const TABS: { id: Sub; label: string }[] = [
  { id: "games", label: "Games & schedule" },
  { id: "brand", label: "Branding & message" },
  { id: "ticket", label: "Ticket design" },
  { id: "promos", label: "Promotions" },
  { id: "results", label: "Results & holidays" },
  { id: "reports", label: "Reports" },
  { id: "retailers", label: "Retailers" },
  { id: "help", label: "Help" },
];

export function OfficeScreen() {
  const [sub, setSub] = useState<Sub>("games");
  const { brand } = useStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--card)] px-4 py-2">
        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo} alt="" className="h-9 w-9 rounded-lg object-contain" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-extrabold text-white">
            SL
          </div>
        )}
        <div>
          <div className="text-sm font-extrabold">{brand.name}</div>
          <div className="text-[11px] text-[var(--mut)]">Owner back office</div>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm ${
              sub === t.id
                ? "bg-indigo-600 text-white"
                : "bg-[var(--card)] text-[var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {sub === "games" && <GamesPanel />}
        {sub === "brand" && <BrandPanel />}
        {sub === "ticket" && <TicketDesignPanel />}
        {sub === "promos" && <PromosPanel />}
        {sub === "results" && <ResultsPanel />}
        {sub === "reports" && <ReportsPanel />}
        {sub === "retailers" && <RetailersPanel />}
        {sub === "help" && <HelpPanel />}
      </div>
    </div>
  );
}

function ReportsPanel() {
  const {
    soldTickets,
    retailers,
    currency,
    user,
    selectedRetailerId,
    salesToday,
    ticketsToday,
    unpaidPrizes,
  } = useStore();
  const isOwner = user?.role === "owner";
  const list = isOwner
    ? soldTickets
    : soldTickets.filter((t) => t.retailer_id === selectedRetailerId);
  const sold = list.filter((t) => t.status !== "cancelled");
  const sales = sold.reduce((s, t) => s + t.total, 0);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-lg font-bold">Reports</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Tickets" value={String(sold.length)} />
        <Kpi label={`Sales (${currency})`} value={sales.toFixed(2)} />
        <Kpi label="Today" value={`${ticketsToday} / ${salesToday.toFixed(2)}`} />
        <Kpi label="Unpaid prizes" value={unpaidPrizes.toFixed(2)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--mut)]">
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Shop</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Promo</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 50).map((t) => (
              <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-3 py-2 font-mono font-semibold">{t.id}</td>
                <td className="px-3 py-2">
                  {retailers.find((r) => r.id === t.retailer_id)?.name || t.retailer_id}
                </td>
                <td className="px-3 py-2">
                  {currency} {t.total.toFixed(2)}
                </td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2 font-mono">{t.promo_code || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
      <div className="text-[10px] uppercase text-[var(--mut)]">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
