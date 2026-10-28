import type { Game } from "./types";
import { sanitizeToken } from "./jackpot-tokens";

/** Built-in ticket tokens a game shortcut must never shadow. */
const RESERVED = new Set([
  "game",
  "game1",
  "amount",
  "amount1",
  "currency",
  "retailer",
  "ticket_id",
  "promo",
  "date",
  "draw_time",
  "jackpot",
  "prev_jackpot",
  "number",
  "name",
  "address",
  "phone",
]);

function isFree(key: string, used: Set<string>): boolean {
  return !!key && !RESERVED.has(key) && !used.has(key) && !key.startsWith("jackpot_") && !key.startsWith("prev_jackpot_");
}

/** Default shortcut: first 3 letters of the game name ("Diario" → "dia"). */
export function defaultGameToken(g: Pick<Game, "name" | "id">): string {
  return sanitizeToken(g.name).replace(/_/g, "").slice(0, 3) || sanitizeToken(g.id);
}

/**
 * Resolve one unique ticket shortcut per game (game.id → token, lowercase).
 * Explicit `token` values win; the rest get a 3-letter default, falling back to the game id
 * when that is taken or reserved.
 */
export function resolveGameTokens(games: Game[]): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();

  for (const g of games) {
    const t = sanitizeToken(g.token || "");
    if (isFree(t, used)) {
      out.set(g.id, t);
      used.add(t);
    }
  }
  for (const g of games) {
    if (out.has(g.id)) continue;
    const candidates = [defaultGameToken(g), sanitizeToken(g.id)];
    let pick = candidates.find((c) => isFree(c, used));
    for (let i = 2; !pick && i < 100; i++) {
      const c = `${sanitizeToken(g.id)}${i}`;
      if (isFree(c, used)) pick = c;
    }
    if (pick) {
      out.set(g.id, pick);
      used.add(pick);
    }
  }
  return out;
}

/**
 * Ticket / MOTD tokens for EVERY game:
 *   {dia}       → game name (Diario)
 *   {dia_time}  → draw time
 * Also reachable by game id, e.g. {diario}. Lookup is case-insensitive, so {Dia} works.
 */
export function buildGameTokenContext(games: Game[]): Record<string, string> {
  const ctx: Record<string, string> = {};
  const tokens = resolveGameTokens(games);
  for (const g of games) {
    const keys = new Set<string>();
    const t = tokens.get(g.id);
    if (t) keys.add(t);
    const idKey = sanitizeToken(g.id);
    if (idKey && !RESERVED.has(idKey) && !idKey.startsWith("jackpot_")) keys.add(idKey);
    for (const k of keys) {
      if (ctx[k] != null && !(tokens.get(g.id) === k)) continue;
      ctx[k] = g.name;
      ctx[`${k}_time`] = g.draw_time || "";
    }
  }
  return ctx;
}

/** Help lines for the Ticket Design screen, e.g. "{dia} = Diario". */
export function listGameTokenHelp(games: Game[]): string[] {
  const tokens = resolveGameTokens(games);
  return games.flatMap((g) => {
    const t = tokens.get(g.id);
    return t ? [`{${t}} = ${g.name}`] : [];
  });
}
