"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Cog,
  LogOut,
  Moon,
  Sun,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { ToastHost } from "./Toast";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, brand, currency, retailers, selectedRetailerId, setSelectedRetailer, logout } =
    useStore();
  const path = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const isOwner = user?.role === "owner";
  const salesToday = 0; // demo placeholder

  const nav = [
    { href: "/sell", label: "Sell", icon: Banknote, show: true },
    { href: "/office", label: "Back office", icon: Cog, show: isOwner },
  ].filter((n) => n.show);

  return (
    <div className="flex h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <nav className="flex w-[88px] shrink-0 flex-col items-center gap-2 border-r border-white/5 bg-gradient-to-b from-[#0b1020] to-[#121a33] px-2 py-3">
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-lg font-extrabold text-white shadow-lg">
          SL
        </div>
        {nav.map((n) => {
          const Icon = n.icon;
          const on = path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex w-[72px] flex-col items-center gap-1 rounded-2xl px-1 py-3 text-[11px] font-semibold transition ${
                on
                  ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-indigo-200"
              }`}
            >
              <Icon size={24} />
              {n.label}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="rounded-xl p-3 text-slate-400 hover:bg-white/5 hover:text-white"
            title="Theme"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl p-3 text-slate-400 hover:bg-white/5 hover:text-rose-300"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--card)]/80 px-4 py-2 backdrop-blur">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{brand}</div>
            <div className="truncate text-xs text-[var(--mut)]">
              {user?.name} · {user?.role === "owner" ? "Owner" : "Retailer"}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-[var(--key)] px-3 py-1.5 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-[var(--mut)]">Sales today</div>
              <div className="text-sm font-bold">
                {currency} {salesToday.toFixed(2)}
              </div>
            </div>
            {isOwner ? (
              <select
                className="h-10 max-w-[200px] rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
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
              <div className="flex items-center gap-2 rounded-xl bg-[var(--key)] px-3 py-2 text-sm font-semibold">
                <Store size={16} className="text-indigo-500" />
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
