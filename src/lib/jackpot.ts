import type { DrawResult, Game, Ticket } from "./types";
import { matchLinePrize } from "./prize-tiers";

/**
 * Progressive jackpot — lottery best practices
 * -----------------------------------------
 * 1. SEED (jackpot_base): guaranteed floor after a top-prize win. Funded by
 *    operator and/or a reserve skim from each rollover cycle.
 * 2. CONTRIBUTION: each draw without a jackpot winner adds to the pool:
 *      contribution = fixed_increment + (draw_sales × sales_pct / 100)
 *    Sales % is the industry norm (often 20–40% of stake allocated to the
 *    progressive tier). Fixed increment is an optional marketing boost.
 * 3. ROLLOVER: no rank-1 winner → advertised pool grows for the next draw.
 * 4. WIN / RESET: jackpot winner(s) share the advertised amount at draw close;
 *    pool resets to seed. Optional reserve_pct of the paid jackpot can stay
 *    in the seed fund for the next cycle (not implemented as cash ledger here).
 * 5. CAP (optional): hard ceiling so liability stays bounded; growth stops at cap.
 * 6. TRANSPARENCY: expose previous, at-draw, and next amounts for tickets / MOTD.
 *
 * Formula (no winner):
 *   next = min(cap, current + fixed + sales×pct/100)
 * Formula (winner):
 *   next = base  (seed)
 */
export function computeJackpotAfterDraw(
  game: Game,
  result: DrawResult,
  soldTickets: Ticket[]
): {
  jackpot_won: boolean;
  jackpot_at_draw: number;
  jackpot_next: number;
  jackpot_previous: number;
  sales: number;
  contribution: number;
  winners: number;
  /** Per-winner share when multiple tickets hit the progressive tier */
  share_each: number;
} {
  const atDraw = roundMoney(game.jackpot_current ?? game.jackpot_base ?? 0);
  const base = roundMoney(game.jackpot_base ?? Math.min(atDraw, 50_000));
  const fixed = game.jackpot_increment ?? 0;
  const pct = clampPct(game.jackpot_sales_pct ?? 0);
  const cap = game.jackpot_cap != null && game.jackpot_cap > 0 ? game.jackpot_cap : null;

  const { sales, winners } = tallyJackpotDraw(game, result, soldTickets);
  const jackpotWon = winners > 0;

  const contribution = roundMoney(fixed + (sales * pct) / 100);

  let next: number;
  if (jackpotWon) {
    // Reset to seed. Reserve % is informational for operators funding the seed.
    next = base;
  } else {
    next = roundMoney(atDraw + contribution);
    if (cap != null) next = Math.min(next, cap);
  }

  const shareEach = jackpotWon && winners > 0 ? roundMoney(atDraw / winners) : 0;

  return {
    jackpot_won: jackpotWon,
    jackpot_at_draw: atDraw,
    jackpot_next: next,
    jackpot_previous: atDraw,
    sales: roundMoney(sales),
    contribution,
    winners,
    share_each: shareEach,
  };
}

function tallyJackpotDraw(
  game: Game,
  result: DrawResult,
  soldTickets: Ticket[]
): { sales: number; winners: number } {
  let sales = 0;
  let winners = 0;

  for (const t of soldTickets) {
    if (t.status === "cancelled") continue;
    for (const line of t.lines) {
      if (line.game !== result.game_id || line.date !== result.draw_date) continue;
      if (result.session && line.session && line.session !== result.session) continue;
      sales += line.amount;
      const hit = matchLinePrize(line, game, result);
      if (hit && hit.tier.rule === "jackpot_main_mega") winners += 1;
    }
  }
  return { sales, winners };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampPct(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/** Suggested progressive defaults when an operator enables jackpot format. */
export function defaultProgressiveSettings(): Partial<Game> {
  return {
    jackpot_base: 50_000,
    jackpot_current: 50_000,
    jackpot_previous: 50_000,
    jackpot_increment: 5_000,
    jackpot_sales_pct: 30,
    jackpot_cap: undefined,
    jackpot_reserve_pct: 0,
  };
}

/** Default MOTD line when jackpot rolls or is advertised (tokens for ticket design). */
export function defaultJackpotMotd(currency: string): string {
  return (
    "{game} progressive jackpot: " +
    currency +
    " {jackpot}" +
    " (prev " +
    currency +
    " {prev_jackpot})"
  );
}

/** Human-readable growth summary for back-office results UI. */
export function describeJackpotChange(
  jp: ReturnType<typeof computeJackpotAfterDraw>,
  currency: string
): string {
  if (jp.jackpot_won) {
    const share =
      jp.winners > 1
        ? ` · ${jp.winners} winners × ${currency} ${jp.share_each.toLocaleString()}`
        : "";
    return (
      `Jackpot WON ${currency} ${jp.jackpot_at_draw.toLocaleString()}` +
      share +
      ` · next seed ${currency} ${jp.jackpot_next.toLocaleString()}`
    );
  }
  return (
    `No jackpot winner · pool ${currency} ${jp.jackpot_at_draw.toLocaleString()}` +
    ` + ${currency} ${jp.contribution.toLocaleString()}` +
    ` → next ${currency} ${jp.jackpot_next.toLocaleString()}` +
    ` (sales ${currency} ${jp.sales.toLocaleString()})`
  );
}
