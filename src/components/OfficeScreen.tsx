"use client";

import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileBarChart,
  Gamepad2,
  Gift,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Ban,
  Network,
  Shield,
  Sparkles,
  Store,
  Ticket,
  Trophy,
  User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PromosPanel } from "./office/PromosPanel";
import { ResultsPanel } from "./office/ResultsPanel";
import { GamesPanel } from "./office/GamesPanel";
import { FastPlayPanel } from "./office/FastPlayPanel";
import { BrandPanel } from "./office/BrandPanel";
import { TicketDesignPanel } from "./office/TicketDesignPanel";
import { RetailersPanel } from "./office/RetailersPanel";
import { HelpPanel } from "./office/HelpPanel";
import { IspPanel } from "./office/IspPanel";
import { DrawSchedulePanel } from "./office/DrawSchedule";
import { BroadcastPanel } from "./office/BroadcastPanel";
import { TAB_MODULE, can, isBackOffice } from "@/lib/permissions";
import { SecurityPanel } from "./office/SecurityPanel";
import { NumberControlPanel } from "./office/NumberControlPanel";
import { ChangePasswordCard } from "./ChangePasswordCard";
import { MyProfileCard } from "./MyProfileCard";

/** Top-level nav tabs (some open a hub with inner sub-tabs). */
type Nav =
  | "games"
  | "fast_play"
  | "calendar"
  | "comms"
  | "ticket"
  | "promos"
  | "results"
  | "reports_hub"
  | "retailers"
  | "numbers"
  | "isp"
  | "staff"
  | "account"
  | "help";

type ReportsSub = "draw" | "sales";
type CommsSub = "brand" | "broadcast";

const ICON_SIZE = 26;
const ICON_STROKE = 1.75;

const TABS: { id: Nav; label: string; icon: typeof Gamepad2 }[] = [
  { id: "games", label: "Games & schedule", icon: Gamepad2 },
  { id: "numbers", label: "Number control", icon: Ban },
  { id: "fast_play", label: "Fast Play", icon: Sparkles },
  { id: "calendar", label: "Draw calendar", icon: CalendarDays },
  { id: "comms", label: "Branding & broadcast", icon: Megaphone },
  { id: "ticket", label: "Ticket design", icon: Ticket },
  { id: "promos", label: "Promotions", icon: Gift },
  { id: "results", label: "Results & winners", icon: Trophy },
  { id: "reports_hub", label: "Reports", icon: ClipboardList },
  { id: "retailers", label: "Retailers", icon: Store },
  { id: "isp", label: "ISP / network", icon: Network },
  { id: "staff", label: "Security & access", icon: Shield },
  { id: "account", label: "Account", icon: User },
  { id: "help", label: "Help", icon: HelpCircle },
];

/** Map nav id → permission module used for can() / view-only. */
function navModule(nav: Nav, reportsSub: ReportsSub, commsSub: CommsSub): string | undefined {
  if (nav === "comms") return TAB_MODULE[commsSub === "broadcast" ? "broadcast" : "brand"];
  if (nav === "reports_hub") return TAB_MODULE[reportsSub === "draw" ? "draw_reports" : "reports"];
  return TAB_MODULE[nav];
}

function canSeeNav(user: ReturnType<typeof useStore>["user"], id: Nav): boolean {
  if (id === "staff") return user?.role === "owner";
  if (id === "comms") {
    return can(user, "brand:view") || can(user, "broadcast:view");
  }
  if (id === "reports_hub") {
    return can(user, "results:view") || can(user, "reports:view");
  }
  const mod = TAB_MODULE[id];
  return !mod || can(user, `${mod}:view`);
}

function SubTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string; icon?: typeof Gamepad2 }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {items.map((t) => {
        const Icon = t.icon;
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold " +
              (on
                ? "bg-violet-600 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300")
            }
          >
            {Icon ? <Icon size={14} /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function OfficeScreen() {
  const { brand, user } = useStore();
  const visibleTabs = TABS.filter((t) => canSeeNav(user, t.id));
  const [chosen, setNav] = useState<Nav | null>(null);
  const [reportsSub, setReportsSub] = useState<ReportsSub>("draw");
  const [commsSub, setCommsSub] = useState<CommsSub>("brand");

  const nav: Nav =
    chosen && visibleTabs.some((t) => t.id === chosen)
      ? chosen
      : (visibleTabs.find((t) => t.id === "games") ?? visibleTabs[0] ?? TABS[0]).id;

  const mod = navModule(nav, reportsSub, commsSub);
  const readOnly =
    !!mod &&
    !can(user, `${mod}:edit`) &&
    !(["reports", "isp"] as string[]).includes(mod);

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
            <div className="text-[11px] text-slate-500">
              {user?.role === "owner" ? "Owner back office" : `Back office · ${user?.staff_role || "Staff"}`}
            </div>
          </div>
        </div>

        <div className="mb-3 overflow-x-auto">
          <div className="inline-flex min-w-full items-stretch gap-1 rounded-[1.25rem] bg-slate-100/90 p-1.5 dark:bg-slate-800/80">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const on = nav === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setNav(t.id)}
                  className={
                    "flex min-w-[5.75rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 transition " +
                    (on
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200")
                  }
                >
                  <Icon
                    size={ICON_SIZE}
                    strokeWidth={ICON_STROKE}
                    className="h-7 w-7 shrink-0"
                    aria-hidden
                  />
                  <span className="max-w-[7rem] text-center text-[10px] font-semibold leading-tight">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 text-[15px]">
        {readOnly && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
            View only — your role does not allow changes in this area.
          </div>
        )}
        <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
          {nav === "games" && <GamesPanel />}
          {nav === "fast_play" && <FastPlayPanel />}
          {nav === "calendar" && <ResultsPanel mode="calendar" />}

          {nav === "comms" && (
            <div>
              <div className="mb-1">
                <h2 className="text-lg font-bold">Branding & broadcast</h2>
                <p className="text-xs text-slate-500">Look & feel, LED bulletin, and seller popups.</p>
              </div>
              <SubTabs
                items={[
                  { id: "brand" as const, label: "Branding & bulletin", icon: MessageSquare },
                  { id: "broadcast" as const, label: "Broadcast", icon: Megaphone },
                ]}
                value={commsSub}
                onChange={setCommsSub}
              />
              {commsSub === "brand" && <BrandPanel />}
              {commsSub === "broadcast" && <BroadcastPanel />}
            </div>
          )}

          {nav === "ticket" && <TicketDesignPanel />}
          {nav === "promos" && <PromosPanel />}
          {nav === "results" && <ResultsPanel mode="results" />}

          {nav === "reports_hub" && (
            <div>
              <div className="mb-1">
                <h2 className="text-lg font-bold">Reports</h2>
                <p className="text-xs text-slate-500">Draw calculations, winners, and sales / ticket reports.</p>
              </div>
              <SubTabs
                items={[
                  { id: "draw" as const, label: "Draw reports", icon: FileBarChart },
                  { id: "sales" as const, label: "Sales & tickets", icon: ClipboardList },
                ]}
                value={reportsSub}
                onChange={setReportsSub}
              />
              {reportsSub === "draw" && (
                <div className="mx-auto max-w-5xl space-y-6">
                  <DrawSchedulePanel />
                  <ResultsPanel mode="reports" />
                </div>
              )}
              {reportsSub === "sales" && <SalesReportsPanel />}
            </div>
          )}

          {nav === "retailers" && <RetailersPanel />}
          {nav === "isp" && <IspPanel />}
          {nav === "account" && <AccountPanel />}
          {nav === "numbers" && <NumberControlPanel />}
          {nav === "staff" && <SecurityPanel />}
          {nav === "help" && <HelpPanel />}
        </fieldset>
      </div>
    </div>
  );
}

function AccountPanel() {
  const { user, brand, logout } = useStore();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold">Account</h2>
        <div className="text-sm">
          <div className="text-slate-500">Signed in as</div>
          <div className="font-bold">{user?.name}</div>
          <div className="text-slate-500">{user?.email}</div>
          <div className="mt-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
            {user?.role === "staff" && user.staff_role
              ? `STAFF · ${user.staff_role.toUpperCase()}`
              : user?.role?.toUpperCase()}
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
      <MyProfileCard />
      <ChangePasswordCard />
    </div>
  );
}

function SalesReportsPanel() {
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
  const isOwner = isBackOffice(user);
  const list = isOwner
    ? soldTickets
    : soldTickets.filter((t) => t.retailer_id === selectedRetailerId);
  const sold = list.filter((t) => t.status !== "cancelled");
  const sales = sold.reduce((s, t) => s + t.total, 0);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
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
