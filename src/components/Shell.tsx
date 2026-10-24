"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Cog,
  LogOut,
  Moon,
  RefreshCw,
  ScanBarcode,
  Sun,
  Store,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { ToastHost } from "./Toast";

export function Shell({ children }: { children: ReactNode }) {
  const {
    user,
    brand,
    currency,
    retailers,
    selectedRetailerId,
    setSelectedRetailer,
    logout,
    salesToday,
    ticketsToday,
    toast,
  } = useStore();
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [scan, setScan] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const isOwner = user?.role === "owner";

  const nav = [
    { href: "/sell", label: "Sell", icon: Banknote, show: true },
    { href: "/office", label: "Back office", icon: Cog, show: isOwner },
  ].filter((n) => n.show);

  return (
    <div className="flex h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <nav className="flex w-[84px] shrink-0 flex-col items-center gap-1.5 border-r border-white/5 bg-gradient-to-b from-[#0b1020] to-[#121a33] px-1.5 py-3">
        <div className="mb-2 grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-[10px] font-extrabold leading-tight text-white shadow-lg">
          LOTTERY
          <br />
          1·2·3
        </div>
        {nav.map((n) => {
          const Icon = n.icon;
          const on = path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex w-[72px] flex-col items-center gap-0.5 rounded-2xl px-1 py-2.5 text-[11px] font-semibold transition ${
                on
                  ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-indigo-200"
              }`}
            >
              <Icon size={22} />
              {n.label}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="rounded-xl p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl p-2.5 text-slate-400 hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--card)]/90 px-3 py-1.5 backdrop-blur">
          <div className="text-sm font-extrabold tracking-tight">Lottery POS</div>
          {brand.led_on && (
            <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-black px-3 py-1">
              <div
                className="animate-[marquee_18s_linear_infinite] whitespace-nowrap font-mono text-sm font-bold tracking-wider"
                style={{ color: brand.led_color }}
              >
                {brand.led_message} · {brand.led_message}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="rounded-full bg-[var(--key)] px-2.5 py-1 text-center">
              <div className="text-[9px] uppercase text-[var(--mut)]">Sales today</div>
              <div className="text-xs font-bold">
                {currency} {salesToday.toFixed(2)}
              </div>
            </div>
            <div className="rounded-full bg-[var(--key)] px-2.5 py-1 text-center">
              <div className="text-[9px] uppercase text-[var(--mut)]">Tickets</div>
              <div className="text-xs font-bold">{ticketsToday}</div>
            </div>
            <div className="relative">
              <ScanBarcode
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mut)]"
              />
              <input
                className="h-8 w-36 rounded-full border border-[var(--line)] bg-[var(--key)] pl-8 pr-3 text-xs"
                placeholder="Scan ticket…"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scan.trim()) {
                    toast(`Lookup ${scan.trim()} (demo)`);
                    setScan("");
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--key)] text-[var(--mut)] hover:text-[var(--ink)]"
              onClick={() => toast("Refreshed")}
            >
              <RefreshCw size={14} />
            </button>
            {isOwner ? (
              <select
                className="h-8 max-w-[160px] rounded-full border border-[var(--line)] bg-[var(--key)] px-2 text-xs font-semibold"
                value={selectedRetailerId}
                onChange={(e) => setSelectedRetailer(e.target.value)}
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} · {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--key)] px-3 text-xs font-semibold">
                <Store size={12} className="text-indigo-500" />
                {retailers.find((r) => r.id === selectedRetailerId)?.name || "Shop"}
              </div>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
      <ToastHost />
    </div>
  );
}
