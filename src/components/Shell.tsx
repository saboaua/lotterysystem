"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Banknote,
  LifeBuoy,
  Newspaper,
  Star,
  Flame,
  CircleDot,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { ToastHost } from "./Toast";
import { PresencePing } from "./PresencePing";
import { BroadcastPopup } from "./BroadcastPopup";

const ITEM_ICONS = [CircleDot, Star, Flame, CircleDot, Star, Flame];
const ITEM_COLORS = [
  "text-emerald-500",
  "text-amber-500",
  "text-orange-500",
  "text-sky-500",
  "text-violet-500",
  "text-rose-500",
];

export function Shell({ children }: { children: ReactNode }) {
  const {
    user,
    brand,
    currency,
    retailers,
    selectedRetailerId,
    logout,
    salesToday,
    addSupport,
    toast,
  } = useStore();
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [clock, setClock] = useState("");
  const [clockShort, setClockShort] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [supSub, setSupSub] = useState("");
  const [supBody, setSupBody] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setClockShort(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isOwner = user?.role === "owner";
  const shop = retailers.find((r) => r.id === selectedRetailerId);

  const nav = isOwner
    ? [{ href: "/office", label: "Back Office", icon: LayoutDashboard }]
    : [{ href: "/sell", label: "Sell", icon: Banknote }];

  const tickerItems = useMemo(() => {
    const items: string[] = [];
    if (brand.led_message?.trim()) items.push(brand.led_message.trim());
    for (const m of brand.led_schedule || []) {
      if (!m.enabled) continue;
      const today = new Date().toISOString().slice(0, 10);
      if (m.start && today < m.start) continue;
      if (m.end && today > m.end) continue;
      if (m.text?.trim()) items.push(m.text.trim());
    }
    return items;
  }, [brand.led_message, brand.led_schedule]);

  const duration = Math.max(
    18,
    Math.min(80, (tickerItems.join(" ").length || 40) / Math.max(6, (brand.led_speed || 40) / 6))
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <PresencePing />
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
                  <span className="text-center text-[10px] font-bold leading-tight tracking-tight">
                    {n.label}
                  </span>
                </Link>
              );
            })}
            {!isOwner && (
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="group flex h-16 w-full flex-col items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
              >
                <LifeBuoy size={18} className="mb-1 transition-transform group-hover:scale-110" />
                <span className="text-center text-[10px] font-bold leading-tight tracking-tight">
                  Help
                </span>
              </button>
            )}
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
        <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="shrink-0">
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
                    <span className="font-semibold text-violet-700 dark:text-violet-400">
                      {user?.name || "Owner"}
                    </span>
                  </>
                ) : (
                  <>
                    Clerk:{" "}
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                      {user?.name || "Cashier"}
                    </span>
                    {" · "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Terminal #{shop?.number || "-"}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="hidden text-right md:block">
              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{clock}</div>
              <div className="text-[11px] font-medium text-slate-400">Oranjestad, Aruba (AST)</div>
            </div>
            {!isOwner && (
              <>
                <div className="hidden h-7 w-px bg-slate-200 md:block dark:bg-slate-600" />
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Shift Sales
                  </div>
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
          </div>
        </header>

        {brand.led_on && !isOwner && tickerItems.length > 0 && (
          <div className="relative z-10 shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-slate-100 via-indigo-50/60 to-slate-100 px-2 py-1.5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
            <div className="flex items-center gap-2 overflow-hidden rounded-full border border-slate-200/80 bg-white/90 py-1 pl-1 pr-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800/90">
              {/* LATEST NEWS pill */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-white dark:bg-slate-950">
                <Newspaper size={12} className="text-indigo-300" strokeWidth={2.5} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">
                  Latest News
                </span>
              </div>

              {/* Time */}
              <span className="hidden shrink-0 font-mono text-[11px] font-bold text-slate-500 sm:inline dark:text-slate-400">
                {clockShort}
              </span>

              {/* Scrolling track */}
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <div
                  className="flex w-max items-center gap-6 whitespace-nowrap"
                  style={{
                    animation: `shell-news-marquee ${duration}s linear infinite`,
                  }}
                >
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex items-center gap-6">
                      {tickerItems.map((text, i) => {
                        const Icon = ITEM_ICONS[i % ITEM_ICONS.length];
                        const color = ITEM_COLORS[i % ITEM_COLORS.length];
                        return (
                          <span
                            key={`${dup}-${i}`}
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200"
                          >
                            <Icon size={13} className={color} strokeWidth={2.5} />
                            <span>{text}</span>
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* LIVE pill */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-800 dark:bg-emerald-950/50">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Live
                </span>
              </div>
            </div>
            <style>{`
              @keyframes shell-news-marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
      <ToastHost />
      <BroadcastPopup />

      {helpOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-bold">Help / Support</h3>
            <p className="text-xs text-slate-500">Send a message to the owner / back office.</p>
            <input
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Subject"
              value={supSub}
              onChange={(e) => setSupSub(e.target.value)}
            />
            <textarea
              className="h-28 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Describe the issue"
              value={supBody}
              onChange={(e) => setSupBody(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  addSupport(supSub || "Support", supBody || "(no details)");
                  setSupSub("");
                  setSupBody("");
                  setHelpOpen(false);
                  toast("Support message sent");
                }}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold dark:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
