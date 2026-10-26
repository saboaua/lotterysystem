import type { Game } from "./types";

/**
 * Build ticket/MOTD token map for progressive pools.
 *
 * Each jackpot game may set `jackpot_token` (e.g. "lm" for Lotto Mac).
 * That registers:
 *   {jackpot_lm}       → current advertised pool
 *   {prev_jackpot_lm}  → previous pool
 *
 * Also registers by full game id (sanitized): {jackpot_lottomac}.
 * Generic {jackpot} / {prev_jackpot} use `primaryGame` when provided,
 * otherwise the first enabled jackpot game with a pool.
 */
export function buildJackpotTokenContext(
  games: Game[],
  primaryGame?: Game | null
): Record<string, string> {
  const ctx: Record<string, string> = {};

  for (const g of games) {
    if (g.format !== "jackpot") continue;
    const current = formatPool(g.jackpot_current ?? g.jackpot_base);
    const prev = formatPool(g.jackpot_previous ?? g.jackpot_current ?? g.jackpot_base);

    const keys = new Set<string>();
    if (g.jackpot_token) keys.add(sanitizeToken(g.jackpot_token));
    keys.add(sanitizeToken(g.id));

    for (const key of keys) {
      if (!key) continue;
      ctx[`jackpot_${key}`] = current;
      ctx[`prev_jackpot_${key}`] = prev;
    }
  }

  const fallback =
    primaryGame?.format === "jackpot"
      ? primaryGame
      : games.find((g) => g.format === "jackpot" && g.enabled) ||
        games.find((g) => g.format === "jackpot");

  if (fallback) {
    ctx.jackpot = formatPool(fallback.jackpot_current ?? fallback.jackpot_base);
    ctx.prev_jackpot = formatPool(
      fallback.jackpot_previous ?? fallback.jackpot_current ?? fallback.jackpot_base
    );
    ctx.amount1 = ctx.jackpot;
  } else {
    ctx.jackpot = "-";
    ctx.prev_jackpot = "-";
    ctx.amount1 = "-";
  }

  return ctx;
}

function formatPool(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "-";
  return Number(n).toLocaleString();
}

/** Lowercase alphanumeric + underscore only. */
export function sanitizeToken(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** List of named tokens for help text in Ticket Design. */
export function listJackpotTokenHelp(games: Game[]): string[] {
  const out: string[] = [];
  for (const g of games) {
    if (g.format !== "jackpot") continue;
    const key = sanitizeToken(g.jackpot_token || g.id);
    if (!key) continue;
    const val = formatPool(g.jackpot_current ?? g.jackpot_base);
    out.push(`{jackpot_${key}} = ${val} (${g.name})`);
  }
  return out;
}
