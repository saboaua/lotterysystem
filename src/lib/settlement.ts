import type { Retailer, Ticket } from "@/lib/types";

/**
 * Weekly settlement.
 * A settlement week closes every Sunday evening (Aruba time, AST = UTC-4, no DST).
 * Week N covers: previous Sunday close  →  this Sunday close.
 */
export const SETTLEMENT_TZ_OFFSET_HOURS = -4; // America/Aruba
export const SETTLEMENT_CLOSE_DAY = 0; // Sunday
export const SETTLEMENT_CLOSE_HOUR = 20; // 8:00 PM local — change here if the cut-off differs

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Fake "wall clock" Date whose UTC fields equal Aruba local time. */
function toLocalWall(ms: number) {
  return new Date(ms + SETTLEMENT_TZ_OFFSET_HOURS * HOUR);
}

/** The next settlement close at or after `ms` (epoch ms). */
export function nextCloseAfter(ms: number): number {
  const w = toLocalWall(ms);
  const wallMidnight = Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
  const daysToClose = (SETTLEMENT_CLOSE_DAY - w.getUTCDay() + 7) % 7;
  let closeWall = wallMidnight + daysToClose * DAY + SETTLEMENT_CLOSE_HOUR * HOUR;
  const nowWall = ms + SETTLEMENT_TZ_OFFSET_HOURS * HOUR;
  if (closeWall < nowWall) closeWall += WEEK;
  return closeWall - SETTLEMENT_TZ_OFFSET_HOURS * HOUR;
}

export interface SettlementPeriod {
  start: number; // epoch ms (exclusive of previous week's close)
  end: number; // epoch ms close
  open: boolean; // still running
  /** 0 = current open week, 1 = last closed week, ... */
  offset: number;
}

export function periodAt(now: number, offset = 0): SettlementPeriod {
  const end = nextCloseAfter(now) - offset * WEEK;
  return { start: end - WEEK, end, open: offset === 0, offset };
}

const inPeriod = (iso: string | undefined, p: SettlementPeriod) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t > p.start && t <= p.end;
};

export interface RetailerSettlement {
  retailerId: string;
  sales: number;
  tickets: number;
  cancelled: number;
  salesCommission: number;
  prizesPaid: number; // prizes redeemed (paid out) by this retailer in the week
  redeemCommission: number;
  prizesPending: number; // won but not yet redeemed (info only)
  /** Positive = retailer owes the operator. Negative = operator owes retailer. */
  netDue: number;
}

export function settleRetailer(
  r: Retailer,
  tickets: Ticket[],
  p: SettlementPeriod
): RetailerSettlement {
  const mine = tickets.filter((t) => t.retailer_id === r.id);
  const sold = mine.filter(
    (t) => t.status !== "cancelled" && t.status !== "void" && inPeriod(t.created_at, p)
  );
  const cancelled = mine.filter(
    (t) => (t.status === "cancelled" || t.status === "void") && inPeriod(t.created_at, p)
  ).length;
  const sales = sold.reduce((s, t) => s + t.total, 0);
  const paid = mine.filter((t) => t.status === "paid" && inPeriod(t.redeemed_at, p));
  const prizesPaid = paid.reduce((s, t) => s + (t.prize || 0), 0);
  const prizesPending = mine
    .filter((t) => t.status === "won")
    .reduce((s, t) => s + (t.prize || 0), 0);
  const salesCommission = (sales * (r.commission_sell || 0)) / 100;
  const redeemCommission = (prizesPaid * (r.commission_redeem || 0)) / 100;
  const netDue = sales - salesCommission - prizesPaid + redeemCommission;
  return {
    retailerId: r.id,
    sales,
    tickets: sold.length,
    cancelled,
    salesCommission,
    prizesPaid,
    redeemCommission,
    prizesPending,
    netDue,
  };
}

export interface RankRow extends RetailerSettlement {
  rank: number;
  name: string;
  number: string;
}

const isActive = (r: Retailer) =>
  (r.status ?? (r.active ? "active" : "disabled")) === "active";

/** Rank all active agents by weekly sales (ties share the better rank). */
export function rankAgents(
  retailers: Retailer[],
  tickets: Ticket[],
  p: SettlementPeriod
): RankRow[] {
  const rows = retailers
    .filter(isActive)
    .map((r) => ({ r, s: settleRetailer(r, tickets, p) }))
    .sort((a, b) => b.s.sales - a.s.sales || a.r.number.localeCompare(b.r.number));
  let prevSales = Number.NaN;
  let prevRank = 0;
  return rows.map(({ r, s }, i) => {
    const rank = s.sales === prevSales ? prevRank : i + 1;
    prevSales = s.sales;
    prevRank = rank;
    return { ...s, rank, name: r.name, number: r.number };
  });
}

export function formatClose(ms: number) {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "America/Aruba",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRange(p: SettlementPeriod) {
  const f = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      timeZone: "America/Aruba",
      month: "short",
      day: "numeric",
    });
  return `${f(p.start + 1)} – ${f(p.end)}`;
}

export function countdown(ms: number) {
  if (ms <= 0) return "Closing now";
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / 60_000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}
