"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Crown, Medal, Minus, Target, TrendingUp, Trophy, Users } from "lucide-react";
import type { Retailer, Ticket } from "@/lib/types";
import {
  formatMonth,
  formatRange,
  peakRank,
  rankAgents,
  rankingPeriod,
  settleRetailer,
  type RankingKind,
  type RankRow,
} from "@/lib/settlement";
import { fetchMyPeakRank, fetchMyRank, type RankInfo } from "@/lib/ranking-api";
import { isSupabaseConfigured } from "@/lib/supabase";

interface Props {
  shop: Retailer;
  retailers: Retailer[];
  tickets: Ticket[];
  now: number;
  currency: string;
  /**
   * Seller view: show only this shop's position. Other retailers' names and sales are never
   * displayed (and, when signed in to Supabase, never even loaded).
   */
  hideOthers?: boolean;
}

interface RemoteRank {
  cur: RankInfo | null;
  prev: RankInfo | null;
  peak: number | null;
}

/** Eases a number toward `target`; starts from `start` on first mount. Respects reduced motion. */
function useCountUp(target: number, start: number, ms = 800, decimals = 0) {
  const [v, setV] = useState(start);
  const prev = useRef(start);
  useEffect(() => {
    const k = 10 ** decimals;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      prev.current = target;
      setV(target);
      return;
    }
    const from = prev.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round((from + (target - from) * e) * k) / k);
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, decimals]);
  return v;
}

function tierOf(rank: number, total: number) {
  const pct = Math.max(1, Math.ceil((rank / Math.max(1, total)) * 100));
  if (rank === 1 || pct <= 1)
    return { n: 1, label: "Leader", pct, cls: "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 dark:border-amber-500/30 dark:from-amber-950/40 dark:to-orange-950/40 dark:text-amber-300" };
  if (rank <= 3 || pct <= 10)
    return { n: 2, label: "Elite", pct, cls: "border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 dark:border-violet-500/30 dark:from-violet-950/40 dark:to-fuchsia-950/40 dark:text-violet-300" };
  if (pct <= 25)
    return { n: 3, label: "Pro", pct, cls: "border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-700 dark:border-sky-500/30 dark:from-sky-950/40 dark:to-indigo-950/40 dark:text-sky-300" };
  if (pct <= 50)
    return { n: 4, label: "Rising", pct, cls: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 dark:border-emerald-500/30 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300" };
  return { n: 5, label: "Starter", pct, cls: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" };
}

const MEDAL = [
  "bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950", // 1
  "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800", // 2
  "bg-gradient-to-br from-orange-300 to-amber-600 text-orange-950", // 3
];

function Bar({ pct, mine, delay }: { pct: number; mine: boolean; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={
          "bar-grow h-full rounded-full transition-[width] duration-700 ease-out " +
          (mine ? "sheen bg-gradient-to-r from-violet-500 to-indigo-500" : "bg-slate-300 dark:bg-slate-600")
        }
        style={{ width: `${w}%`, transitionDelay: `${delay}ms` }}
      />
    </div>
  );
}

export function RankingCard({ shop, retailers, tickets, now, currency, hideOthers = false }: Props) {
  const [kind, setKind] = useState<RankingKind>("month");
  // Signed-in sellers cannot read other shops' tickets, so their position comes from the server.
  const useRemote = hideOthers && isSupabaseConfigured;
  const [remote, setRemote] = useState<RemoteRank | null>(null);
  const bucket = Math.floor(now / 60_000);

  useEffect(() => {
    if (!useRemote || !now) return;
    let cancelled = false;
    const cur = rankingPeriod(kind, now, 0);
    const prev = rankingPeriod(kind, now, 1);
    void Promise.all([
      fetchMyRank(cur.start, cur.end),
      fetchMyRank(prev.start, prev.end),
      fetchMyPeakRank(cur.start, cur.end),
    ]).then(([c, p, pk]) => {
      if (!cancelled) setRemote({ cur: c, prev: p, peak: pk });
    });
    return () => {
      cancelled = true;
    };
  }, [useRemote, kind, bucket, now]);
  const money = (n: number) => `${currency} ${Math.abs(n).toFixed(2)}`;

  const v = useMemo(() => {
    const cur = rankingPeriod(kind, now, 0);
    const prev = rankingPeriod(kind, now, 1);
    if (useRemote) {
      // Own sales come from this shop's own tickets; positions come from the server.
      const mk = (p: typeof cur, info: RankInfo | null | undefined): RankRow | undefined =>
        info
          ? { ...settleRetailer(shop, tickets, p), rank: info.rank, name: shop.name, number: shop.number }
          : undefined;
      const me = mk(cur, remote?.cur);
      return {
        cur,
        ranking: me ? [me] : ([] as RankRow[]),
        me,
        mePrev: mk(prev, remote?.prev),
        peak: remote?.peak ?? null,
        network: 0,
        remoteTotal: remote?.cur?.total ?? 0,
      };
    }
    const ranking = rankAgents(retailers, tickets, cur);
    const prevRanking = rankAgents(retailers, tickets, prev);
    const me = ranking.find((r) => r.retailerId === shop.id);
    const mePrev = prevRanking.find((r) => r.retailerId === shop.id);
    const peak = peakRank(retailers, tickets, cur, now, shop.id);
    const network = ranking.reduce((s, r) => s + r.sales, 0);
    return { cur, ranking, me, mePrev, peak, network, remoteTotal: 0 };
  }, [kind, now, retailers, tickets, shop, useRemote, remote]);

  const { cur, ranking, me, mePrev, peak, network, remoteTotal } = v;
  const total = useRemote ? remoteTotal : ranking.length;
  const noSales = !me || me.sales <= 0;
  const rank = me?.rank ?? total;
  const tier = noSales ? null : tierOf(rank, total);
  const above = me && rank > 1 ? ranking.filter((r) => r.rank < rank).slice(-1)[0] : undefined;
  const second = rank === 1 ? ranking.find((r) => r.rank > 1) : undefined;
  const share = me && network > 0 ? (me.sales / network) * 100 : 0;
  const rankDelta = !noSales && mePrev && mePrev.sales > 0 ? mePrev.rank - rank : 0; // + = moved up
  const salesDelta = me && mePrev && mePrev.sales > 0 ? ((me.sales - mePrev.sales) / mePrev.sales) * 100 : null;
  const periodWord = kind === "month" ? "month" : "week";
  const peakShown = peak ?? rank;

  const rankAnim = useCountUp(noSales ? total : rank, total, 900);
  const peakAnim = useCountUp(noSales ? total : peakShown, total, 900);
  const salesAnim = useCountUp(me?.sales ?? 0, 0, 900, 2);
  const shareAnim = useCountUp(Math.round(share * 10) / 10, 0, 900, 1);

  const board = (() => {
    const top = ranking.slice(0, 5);
    return me && !top.some((r) => r.retailerId === me.retailerId) ? [...top, me] : top;
  })();
  const maxSales = Math.max(1, ...ranking.map((r) => r.sales));

  const subtitle = `${kind === "month" ? formatMonth(cur) : formatRange(cur)} · ${useRemote && !remote ? "Loading position…" : `All ${total} retailers`}`;
  const progressToNext = above && me ? Math.min(100, (me.sales / Math.max(1, above.sales)) * 100) : 100;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 dark:shadow-none">
            <BarChart3 size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold leading-tight text-slate-900 dark:text-white">
                {kind === "month" ? "Monthly" : "Weekly"} Ranking
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
                </span>
                Live
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Ranking period" className="flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            {(["month", "week"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={
                  "min-h-[36px] rounded-full px-3.5 text-xs font-bold transition " +
                  (kind === k
                    ? "bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400")
                }
              >
                {k === "month" ? "This month" : "This week"}
              </button>
            ))}
          </div>
          {tier && (
            <span
              key={`${kind}-${tier.n}`}
              className={`anim-rank-pop inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold ${tier.cls}`}
            >
              <Trophy size={14} /> Tier {tier.n} {tier.label}
            </span>
          )}
        </div>
      </div>

      {/* Hero: your position */}
      <div className="relative mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-indigo-50/80 p-4 dark:border-violet-500/20 dark:from-violet-950/30 dark:via-slate-900 dark:to-indigo-950/30 md:p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-500/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div key={`${kind}-${rank}-${noSales}`} className="anim-rank-pop relative shrink-0">
              <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-300/60 ring-4 ring-white dark:shadow-none dark:ring-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">Rank</span>
                <span className="text-2xl font-black leading-none">{noSales ? "—" : `#${rank}`}</span>
              </div>
              {!noSales && rank <= 3 && (
                <span
                  className={`absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 ${MEDAL[rank - 1]}`}
                >
                  {rank === 1 ? <Crown size={16} /> : <Medal size={16} />}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-lg font-extrabold text-slate-900 dark:text-white">{shop.name}</span>
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  You
                </span>
                {!noSales && mePrev && mePrev.sales > 0 && (
                  <span
                    className={
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold " +
                      (rankDelta > 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : rankDelta < 0
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")
                    }
                    title={`Previous ${periodWord}: #${mePrev.rank}`}
                  >
                    {rankDelta > 0 ? <ArrowUp size={11} /> : rankDelta < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                    {rankDelta === 0 ? "No change" : Math.abs(rankDelta)}
                  </span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                {noSales ? (
                  <span>No sales yet this {periodWord} — make a sale to enter the ranking.</span>
                ) : (
                  <>
                    <span>
                      Position {rank} of {total} retailers
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Top {tier!.pct}% Retailer</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <div className="flex items-baseline gap-2 sm:justify-end">
              <span className="text-4xl font-black leading-none text-violet-700 dark:text-violet-300">
                {noSales ? "—" : `#${peakAnim}`}
              </span>
              <span className="text-lg font-bold text-slate-400">/ {total}</span>
            </div>
            <div className="mt-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Peak position
            </div>
            {!noSales && peak !== null && peak !== rank && (
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Now #{rankAnim}</div>
            )}
          </div>
        </div>
      </div>

      {/* Stat chips */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="anim-rise rounded-2xl border border-slate-100 p-3.5 dark:border-slate-700" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <TrendingUp size={13} /> Sales this {periodWord}
          </div>
          <div className="mt-1 font-mono text-xl font-black text-slate-900 dark:text-white">
            {currency} {salesAnim.toFixed(2)}
          </div>
          <div
            className={
              "mt-0.5 text-[11px] font-bold " +
              (salesDelta === null ? "text-slate-400" : salesDelta >= 0 ? "text-emerald-600" : "text-rose-600")
            }
          >
            {salesDelta === null ? `No previous ${periodWord} to compare` : `${salesDelta >= 0 ? "▲" : "▼"} ${Math.abs(salesDelta).toFixed(0)}% vs last ${periodWord}`}
          </div>
        </div>

        <div className="anim-rise rounded-2xl border border-slate-100 p-3.5 dark:border-slate-700" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Target size={13} />{" "}
            {noSales ? "Get started" : rank === 1 ? (hideOthers ? "Your spot" : "Lead over #2") : hideOthers ? "Next position" : `To reach #${rank - 1}`}
          </div>
          <div className="mt-1 font-mono text-xl font-black text-slate-900 dark:text-white">
            {noSales
              ? "First sale"
              : hideOthers
                ? rank === 1
                  ? "Top spot"
                  : `#${rank - 1}`
                : rank === 1
                  ? second
                    ? money(me!.sales - second.sales)
                    : "Unchallenged"
                  : money(above!.sales - me!.sales)}
          </div>
          {!hideOthers && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="bar-grow h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-700 ease-out"
                style={{ width: `${noSales ? 0 : progressToNext}%` }}
              />
            </div>
          )}
        </div>

        <div className="anim-rise rounded-2xl border border-slate-100 p-3.5 dark:border-slate-700" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Users size={13} /> {hideOthers ? "Your standing" : "Network share"}
          </div>
          <div className="mt-1 font-mono text-xl font-black text-slate-900 dark:text-white">
            {hideOthers ? (noSales ? "—" : `Top ${tier!.pct}%`) : `${shareAnim.toFixed(1)}%`}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="bar-grow h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-[width] duration-700 ease-out"
              style={{
                width: `${
                  hideOthers
                    ? noSales || total < 1
                      ? 0
                      : Math.max(4, ((total - rank + 1) / total) * 100)
                    : Math.min(100, share)
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {hideOthers ? (
        <div className="mt-5">
          <ul className="space-y-1.5">
            {Array.from({ length: Math.min(5, total) }, (_, k) => k + 1).map((pos) => {
              const mine = !noSales && pos === rank;
              return (
                <li
                  key={pos}
                  className={
                    "flex items-center gap-3 rounded-xl px-2.5 py-2 " +
                    (mine
                      ? "bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-950/30 dark:ring-violet-500/30"
                      : "")
                  }
                >
                  <span
                    className={
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black " +
                      (pos <= 3 ? MEDAL[pos - 1] : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
                    }
                  >
                    {pos}
                  </span>
                  <span
                    className={
                      "text-sm font-bold " +
                      (mine ? "text-violet-800 dark:text-violet-200" : "text-slate-400 dark:text-slate-500")
                    }
                  >
                    {mine ? `${shop.name} · you` : pos === 1 ? "Top retailer" : "Retailer"}
                  </span>
                </li>
              );
            })}
            {!noSales && rank > 5 && (
              <>
                <li className="py-0.5 text-center text-xs font-bold tracking-widest text-slate-300">···</li>
                <li className="flex items-center gap-3 rounded-xl bg-violet-50 px-2.5 py-2 ring-1 ring-violet-200 dark:bg-violet-950/30 dark:ring-violet-500/30">
                  <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-1 text-xs font-black text-slate-600 dark:bg-slate-800">
                    {rank}
                  </span>
                  <span className="text-sm font-bold text-violet-800 dark:text-violet-200">{shop.name} · you</span>
                </li>
              </>
            )}
          </ul>
          <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
            Only positions are shown — other retailers&apos; sales are private.
          </p>
        </div>
      ) : (
        <>
      <ul key={kind} className="mt-5 space-y-1.5">
        {board.map((r, i) => {
          const mine = r.retailerId === shop.id;
          const gap = mine && board[i - 1] && i > 0 && r.rank !== board[i - 1].rank + 1;
          return (
            <li key={r.retailerId}>
              {gap && <div className="py-0.5 text-center text-xs font-bold tracking-widest text-slate-300">···</div>}
              <div
                className={
                  "anim-rise flex items-center gap-3 rounded-xl px-2.5 py-2 transition " +
                  (mine
                    ? "bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-950/30 dark:ring-violet-500/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60")
                }
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className={
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black " +
                    (r.rank <= 3 && r.sales > 0
                      ? MEDAL[r.rank - 1]
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
                  }
                >
                  {r.sales > 0 ? r.rank : "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span
                      className={
                        "truncate font-bold " +
                        (mine ? "text-violet-800 dark:text-violet-200" : "text-slate-700 dark:text-slate-200")
                      }
                    >
                      {r.name}
                      {mine && <span className="ml-1.5 text-[10px] font-extrabold uppercase text-violet-500">you</span>}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-500">{money(r.sales)}</span>
                  </div>
                  <Bar pct={Math.max(r.sales > 0 ? 3 : 0, (r.sales / maxSales) * 100)} mine={mine} delay={i * 70} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
        </>
      )}
    </section>
  );
}

export default RankingCard;
