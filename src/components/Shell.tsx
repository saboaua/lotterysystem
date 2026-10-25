"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Banknote,
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
  } = useStore();
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isOwner = user?.role === "owner";
  const shop = retailers.find((r) => r.id === selectedRetailerId);

  const nav = isOwner
    ? [{ href: "/office", label: "Back Office", icon: LayoutDashboard }]
    : [{ href: "/sell", label: "Sell", icon: Banknote }];

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <aside className="z-30 flex w-20 shrink-0 flex-col items-center justify-between border-r border-slate-800 bg-slate-950 py-4">
        <div className="flex w-full flex-col items-center gap-5">
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo}
              alt={brand.name}
              title={brand.name}
              className="h-12 w-12 rounded-2xl object-contain bg-white/10 p-1 shadow-lg"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-rose-950/50"
              title={brand.name}
            >
              SL
            </div>
          )}
          <nav aria-label="Terminal Navigation" className="flex w-full flex-col gap-2 px-2">
            {nav.map((n) => {
              const Icon = n.icon;
              const on = path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`group flex h-16 w-full flex-col items-center justify-center rounded-xl border transition ${
                    on
                      ? "border-indigo-500/30 bg-indigo-600/20 text-indigo-400 shadow-inner"
                      : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <Icon size={18} className="mb-1 transition-transform group-hover:scale-110" />
                  <span className="text-center text-[10px] font-bold leading-tight tracking-tight">{n.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex w-full flex-col items-center gap-2.5 px-2">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-900 hover:text-amber-400"
            title="Toggle Theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-400 transition hover:bg-rose-500/10"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                  {isOwner ? "Back Office" : "Sell Terminal"}
                </h1>
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    isOwner
                      ? "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
                      : "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  }`}
                >
                  <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  {isOwner ? "OWNER" : "RETAILER"}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {isOwner ? (
                  <>
                    Signed in as{" "}
                    <span className="font-semibold text-violet-700 dark:text-violet-400">{user?.name || "Owner"}</span>
                  </>
                ) : (
                  <>
                    Clerk:{" "}
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">{user?.name || "Cashier"}</span>
                    {" · "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Terminal #{shop?.number || "—"}</span>
                  </>
                )}
              </p>
            </div>
            {brand.led_on && !isOwner && (
              <div className="hidden max-w-md items-center gap-2 overflow-hidden rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 xl:flex dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate">{brand.led_message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden text-right md:block">
              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{clock}</div>
              <div className="text-[11px] font-medium text-slate-400">Oranjestad, Aruba (AST)</div>
            </div>
            {!isOwner && (
              <>
                <div className="hidden h-7 w-px bg-slate-200 md:block dark:bg-slate-600" />
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift Sales</div>
                  <div className="flex items-center justify-end gap-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                    <span className="text-xs font-medium text-slate-500">{currency}</span>
                    <span>{salesToday.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  <span>
                    {shop?.number} · {shop?.name || "Shop"}
                  </span>
                </div>
              </>
            )}
            {isOwner && (
              <select
                className="rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={selectedRetailerId}
                onChange={(e) => setSelectedRetailer(e.target.value)}
                title="Filter / preview retailer"
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} · {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
      <ToastHost />
    </div>
  );
}
