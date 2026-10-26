import type { DrawResult, Game, Ticket } from "./types";
import { matchLinePrize } from "./prize-tiers";

/**
 * Best-practice jackpot growth when a draw closes:
 * - If jackpot tier has a winner → reset pool to jackpot_base (or keep residual 0).
 * - If no jackpot winner → previous + fixed increment + (sales * sales_pct / 100).
 * Advertised amount becomes jackpot_current for the next draw / ticket MOTD.
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
} {
  const atDraw = game.jackpot_current ?? game.jackpot_base ?? 0;
  const base = game.jackpot_base ?? atDraw;
  const fixed = game.jackpot_increment ?? 0;
  const pct = game.jackpot_sales_pct ?? 0;

  const relevant = soldTickets.filter(
    (t) =>
      t.status !== "cancelled" &&
      t.lines.some(
        (l) =>
          l.game === result.game_id &&
          l.date === result.draw_date &&
          (result.session ? l.session === result.session : true)
      )
  );
  const sales = relevant.reduce((s, t) => {
    const part = t.lines
      .filter(
        (l) =>
          l.game === result.game_id &&
          l.date === result.draw_date &&
          (result.session ? !l.session || l.session === result.session : true)
      )
      .reduce((a, l) => a + l.amount, 0);
    return s + part;
  }, 0);

  let jackpotWon = false;
  for (const t of relevant) {
    for (const line of t.lines) {
      if (line.game !== result.game_id || line.date !== result.draw_date) continue;
      if (result.session && line.session && line.session !== result.session) continue;
      const hit = matchLinePrize(line, game, result);
      if (hit && hit.tier.rule === "jackpot_main_mega") {
        jackpotWon = true;
        break;
      }
    }
    if (jackpotWon) break;
  }

  const contribution = fixed + (sales * pct) / 100;
  const next = jackpotWon ? base : Math.round((atDraw + contribution) * 100) / 100;

  return {
    jackpot_won: jackpotWon,
    jackpot_at_draw: atDraw,
    jackpot_next: next,
    jackpot_previous: atDraw,
    sales,
  };
}

/** Default MOTD line when jackpot rolls over (tokens for ticket design). */
export function defaultJackpotMotd(currency: string): string {
  return (
    "{game} jackpot: " +
    currency +
    " {jackpot} (was " +
    currency +
    " {prev_jackpot})"
  );
}
