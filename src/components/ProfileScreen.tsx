"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  MapPin,
  Minus,
  Phone,
  Store,
  Trophy,
  User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  countdown,
  formatClose,
  formatRange,
  periodAt,
  rankAgents,
  settleRetailer,
} from "@/lib/settlement";

const HISTORY_WEEKS = 4;

export function ProfileScreen() {
  const { user, retailers, soldTickets, selectedRetailerId, currency } = useStore();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const money = (n: number) => `${currency} ${Math.abs(n).toFixed(2)}`;

  const data = useMemo(() => {
    if (!now || !shop) return null;
    const cur = periodAt(now, 0);
    const last = periodAt(now, 1);
    const ranking = rankAgents(retailers, soldTickets, cur);
    const lastRanking = rankAgents(retailers, soldTickets, last);
    const me = ranking.find((r) => r.retailerId === shop.id);
    const meLast = lastRanking.find((r) => r.retailerId === shop.id);
    const mySettlement = settleRetailer(shop, soldTickets, cur);
    const totalNetwork = ranking.reduce((s, r) => s + r.sales, 0);
    const history = Array.from({ length: HISTORY_WEEKS }, (_, i) => {
      const p = periodAt(now, i + 1);
      const rk = rankAgents(retailers, soldTickets, p);
      return {
        period: p,
        settlement: settleRetailer(shop, soldTickets, p),
        rank: rk.find((r) => r.retailerId === shop.id)?.rank,
        of: rk.length,
      };
    });
    return { cur, ranking, me, meLast, mySettlement, totalNetwork, history, lastCount: lastRanking.length };
  }, [now, shop, retailers, soldTickets]);

  if (!shop) {
    return <div className="p-6 text-sm text-slate-500">Retailer profile not found.</div>;
  }

  const fullName = [shop.first_name, shop.last_name].filter(Boolean).join(" ");
  const initials = shop.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const status = shop.status ?? (shop.active ? "active" : "disabled");

  const me = data?.me;
  const s = data?.mySettlement;
  const total = data?.ranking.length ?? 0;
  const above = me && me.rank > 1 ? data!.ranking.filter((r) => r.rank < me.rank).slice(-1)[0] : undefined;
  const noSales = !me || me.sales <= 0;
  const rankDelta = me && data?.meLast ? data.meLast.rank - me.rank : 0; // + = moved up
  const share = me && data!.totalNetwork > 0 ? (me.sales / data!.totalNetwork) * 100 : 0;

  // Leaderboard: top 5, plus own row when outside top 5
  const board = (() => {
    if (!data) return [];
    const top = data.ranking.slice(0, 5);
    if (me && !top.some((r) => r.retailerId === me.retailerId)) return [...top, me];
    return top;
  })();
  const maxSales = Math.max(1, ...(data?.ranking.map((r) => r.sales) ?? [1]));

  const card =
    "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-5";
  const label = "text-[10px] font-bold uppercase tracking-wide text-slate-400";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 md:p-5">
      <Link
        href="/sell"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={16} /> Back to Sell
      </Link>

      {/* Profile */}
      <section className={card + " flex flex-col gap-4 sm:flex-row sm:items-center"}>
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-2xl font-black text-white shadow-lg shadow-violet-200 dark:shadow-none">
          {initials || <Store />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{shop.name}</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              #{shop.number}
            </span>
            <span
              className={
                "rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase " +
                (status === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300")
              }
            >
              {status}
            </span>
          </div>
          <div className="mt-2 grid gap-1.5 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            {fullName && (
              <span className="inline-flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> {fullName}
              </span>
            )}
            {shop.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} className="text-slate-400" /> {shop.phone}
              </span>
            )}
            {shop.address && (
              <span className="inline-flex items-center gap-1.5 sm:col-span-2">
                <MapPin size={14} className="shrink-0 text-slate-400" /> {shop.address}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:w-64">
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            <div className={label}>Sell comm.</div>
            <div className="text-base font-extrabold">{shop.commission_sell}%</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            <div className={label}>Redeem</div>
            <div className="text-base font-extrabold">{shop.commission_redeem}%</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            <div className={label}>Clerk</div>
            <div className="truncate text-sm font-extrabold">{user?.name || "—"}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ranking */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-extrabold">
              <Trophy size={18} className="text-amber-500" /> Ranking this week
            </h3>
            <span className={label + " whitespace-nowrap"}>{data ? formatRange(data.cur) : ""}</span>
          </div>

          <div className="flex items-end gap-4">
            <div>
              <div className="text-5xl font-black leading-none text-violet-700 dark:text-violet-400">
                {noSales ? "—" : `#${me?.rank}`}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {noSales ? "No sales yet this week" : `of ${total} agents`}
              </div>
            </div>
            <div className="mb-1 space-y-1 text-xs font-semibold">
              {!noSales && data?.meLast && (
                <div
                  className={
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 " +
                    (rankDelta > 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50"
                      : rankDelta < 0
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800")
                  }
                >
                  {rankDelta > 0 ? <ArrowUp size={12} /> : rankDelta < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                  {rankDelta === 0 ? "Same as last week" : `${Math.abs(rankDelta)} vs last week (#${data.meLast.rank})`}
                </div>
              )}
              <div className="text-slate-500">Network share: {share.toFixed(1)}%</div>
            </div>
          </div>

          {noSales && (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Make your first sale this week to enter the ranking.
            </p>
          )}
          {me && !noSales && (
            <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
              {me.rank === 1
                ? "You're leading the network this week. Keep it up!"
                : above
                  ? `${money(above.sales - me.sales)} more in sales to pass #${above.rank} (${above.name}).`
                  : ""}
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {board.map((r) => {
              const mine = r.retailerId === shop.id;
              return (
                <li key={r.retailerId}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={"font-bold " + (mine ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-200")}>
                      #{r.rank} · {r.name}
                      {mine && " (you)"}
                    </span>
                    <span className="font-mono font-semibold text-slate-500">{money(r.sales)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={"h-full rounded-full " + (mine ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600")}
                      style={{ width: `${Math.max(2, (r.sales / maxSales) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Settlement */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-extrabold">
              <CalendarClock size={18} className="text-indigo-500" /> Settlement
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              Open
            </span>
          </div>
          {data && (
            <p className="mb-3 text-xs font-semibold text-slate-500">
              {formatRange(data.cur)} · closes {formatClose(data.cur.end)}
              <span className="ml-1 font-mono text-indigo-600 dark:text-indigo-400">
                ({countdown(data.cur.end - now)} left)
              </span>
            </p>
          )}

          {s && (
            <>
              <dl className="space-y-2 text-sm">
                <Row k={`Sales (${s.tickets} tickets)`} v={money(s.sales)} />
                <Row k={`Sell commission (${shop.commission_sell}%)`} v={`− ${money(s.salesCommission)}`} tone="green" />
                <Row k="Prizes paid out" v={`− ${money(s.prizesPaid)}`} />
                <Row k={`Redeem commission (${shop.commission_redeem}%)`} v={`+ ${money(s.redeemCommission)}`} tone="green" />
              </dl>
              <div
                className={
                  "mt-4 rounded-2xl p-4 " +
                  (s.netDue >= 0
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "bg-emerald-50 dark:bg-emerald-950/40")
                }
              >
                <div className={label}>{s.netDue >= 0 ? "To settle with the operator" : "Operator owes you"}</div>
                <div className="mt-1 font-mono text-3xl font-black text-slate-900 dark:text-white">
                  {money(s.netDue)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Estimate until the week closes. Final amount is confirmed at close.
                </div>
              </div>
              {s.prizesPending > 0 && (
                <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {money(s.prizesPending)} in winning tickets not yet redeemed (not deducted).
                </p>
              )}
              {s.cancelled > 0 && (
                <p className="mt-1 text-xs text-slate-500">{s.cancelled} cancelled ticket(s) excluded.</p>
              )}
            </>
          )}
        </section>
      </div>

      {/* History */}
      <section className={card}>
        <h3 className="mb-3 text-base font-extrabold">Closed settlements</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left">
                {["Week", "Sales", "Commission", "Prizes paid", "Net", "Rank"].map((h) => (
                  <th key={h} className={label + " py-2 pr-3 " + (h !== "Week" ? "text-right" : "")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.history.map((h) => (
                <tr key={h.period.end} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-3 font-semibold">{formatRange(h.period)}</td>
                  <td className="py-3 pr-3 text-right font-mono">{money(h.settlement.sales)}</td>
                  <td className="py-3 pr-3 text-right font-mono">
                    {money(h.settlement.salesCommission + h.settlement.redeemCommission)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono">{money(h.settlement.prizesPaid)}</td>
                  <td className="py-3 pr-3 text-right font-mono font-bold">
                    {h.settlement.netDue < 0 ? "−" : ""}
                    {money(h.settlement.netDue)}
                  </td>
                  <td className="py-3 text-right font-bold">{h.rank ? `#${h.rank}/${h.of}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "green" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-100 pb-2 dark:border-slate-800">
      <dt className="text-slate-600 dark:text-slate-300">{k}</dt>
      <dd className={"font-mono font-semibold " + (tone === "green" ? "text-emerald-600 dark:text-emerald-400" : "")}>{v}</dd>
    </div>
  );
}

export default ProfileScreen;
