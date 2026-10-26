"use client";

import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileBarChart,
  Gamepad2,
  Gift,
  HelpCircle,
  MessageSquare,
  Network,
  Store,
  Ticket,
  Trophy,
  User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PromosPanel } from "./office/PromosPanel";
import { ResultsPanel } from "./office/ResultsPanel";
import { GamesPanel } from "./office/GamesPanel";
import { BrandPanel } from "./office/BrandPanel";
import { TicketDesignPanel } from "./office/TicketDesignPanel";
import { RetailersPanel } from "./office/RetailersPanel";
import { HelpPanel } from "./office/HelpPanel";
import { IspPanel } from "./office/IspPanel";

type Sub =
  | "games"
  | "calendar"
  | "brand"
  | "ticket"
  | "promos"
  | "results"
  | "draw_reports"
  | "reports"
  | "retailers"
  | "isp"
  | "account"
  | "help";

const TABS: { id: Sub; label: string; icon: typeof Gamepad2 }[] = [
  { id: "games", label: "Games & schedule", icon: Gamepad2 },
  { id: "calendar", label: "Draw calendar", icon: CalendarDays },
  { id: "brand", label: "Branding & message", icon: MessageSquare },
  { id: "ticket", label: "Ticket design", icon: Ticket },
  { id: "promos", label: "Promotions", icon: Gift },
  { id: "results", label: "Results & winners", icon: Trophy },
  { id: "draw_reports", label: "Draw reports", icon: FileBarChart },
  { id: "reports", label: "Reports", icon: ClipboardList },
  { id: "retailers", label: "Retailers", icon: Store },
  { id: "isp", label: "ISP / network", icon: Network },
  { id: "account", label: "Account", icon: User },
  { id: "help", label: "Help", icon: HelpCircle },
];

export function OfficeScreen() {
  const [sub, setSub] = useState<Sub>("results");
  const { brand } = useStore();

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white px-3 pt-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-3">
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo} alt="" className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-extrabold text-white">
              SL
            </div>
          )}
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">{brand.name}</div>
            <div className="text-[11px] text-slate-500">Owner back office</div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = sub === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSub(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  on
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {sub === "games" && <GamesPanel />}
        {sub === "calendar" && <ResultsPanel mode="calendar" />}
        {sub === "brand" && <BrandPanel />}
        {sub === "ticket" && <TicketDesignPanel />}
        {sub === "promos" && <PromosPanel />}
        {sub === "results" && <ResultsPanel mode="results" />}
        {sub === "draw_reports" && <ResultsPanel mode="reports" />}
        {sub === "reports" && <ReportsPanel />}
        {sub === "retailers" && <RetailersPanel />}
        {sub === "isp" && <IspPanel />}
        {sub === "account" && <AccountPanel />}
        {sub === "help" && <HelpPanel />}
      </div>
    </div>
  );
}

function AccountPanel() {
  const { user, brand, logout } = useStore();
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold">Account</h2>
      <div className="text-sm">
        <div className="text-slate-500">Signed in as</div>
        <div className="font-bold">{user?.name}</div>
        <div className="text-slate-500">{user?.email}</div>
        <div className="mt-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
          {user?.role?.toUpperCase()}
        </div>
      </div>
      <div className="text-sm text-slate-500">Brand: {brand.name}</div>
      <button
        type="button"
        onClick={logout}
        className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white"
      >
        Sign out
      </button>
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Shop</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Promo</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 50).map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-2 font-mono font-semibold">{t.id}</td>
                <td className="px-3 py-2">
                  {retailers.find((r) => r.id === t.retailer_id)?.name || t.retailer_id}
                </td>
                <td className="px-3 py-2">
                  {currency} {t.total.toFixed(2)}
                </td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2 font-mono">{t.promo_code || "-"}</td>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
