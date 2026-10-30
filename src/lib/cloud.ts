/**
 * Supabase sync layer: everything the back office edits is saved to Supabase and pulled back
 * on start / login. Collections are synced as whole snapshots (upsert + delete of removed rows);
 * per-row records (tickets, top ups, support, promo codes) are written when they are created.
 * Run supabase/sync.sql once so the extra columns and policies exist.
 */
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  BetType,
  BlockedNumber,
  BrandSettings,
  BroadcastMessage,
  DrawResult,
  FastPlayGame,
  Game,
  Holiday,
  Promotion,
  SupportTicket,
  TicketDesign,
  TopUp,
} from "./types";

export type Res<T = void> = { ok: true; data: T } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

export function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return stableUuid(`${Date.now()}-${Math.random()}`);
}

/** Deterministic UUID (v4-shaped) from any string, so the same key always maps to the same row. */
export function stableUuid(key: string): string {
  let h1 = 0xdeadbeef ^ key.length;
  let h2 = 0x41c6ce57 ^ key.length;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
    h3 = Math.imul(h3 ^ c, 2246822507);
    h4 = Math.imul(h4 ^ c, 3266489909);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
  const variant = "89ab"[parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function client() {
  return isSupabaseConfigured ? getSupabase() : null;
}

async function signedIn(): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return !!data.session;
}

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const num = (v: unknown): number | undefined => (v == null || v === "" ? undefined : Number(v));
const str = (v: unknown): string | undefined => (v == null ? undefined : String(v));

type Row = Record<string, unknown>;

async function upsertRows(table: string, rows: Row[], onConflict: string): Promise<Res> {
  const sb = client();
  if (!sb) return fail("Supabase not configured");
  if (!(await signedIn())) return fail("Not signed in");
  if (rows.length) {
    const { error } = await sb.from(table).upsert(rows, { onConflict });
    if (error) return fail(`${table}: ${error.message}`);
  }
  return { ok: true, data: undefined };
}

async function deleteRows(table: string, column: string, ids: string[]): Promise<Res> {
  const sb = client();
  if (!sb) return fail("Supabase not configured");
  if (!ids.length) return { ok: true, data: undefined };
  const { error } = await sb.from(table).delete().in(column, ids);
  if (error) return fail(`${table}: ${error.message}`);
  return { ok: true, data: undefined };
}

async function selectAll(table: string, order?: { col: string; asc?: boolean }, limit?: number): Promise<Res<Row[]>> {
  const sb = client();
  if (!sb) return fail("Supabase not configured");
  let q = sb.from(table).select("*");
  if (order) q = q.order(order.col, { ascending: order.asc !== false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) return fail(`${table}: ${error.message}`);
  return { ok: true, data: (data || []) as Row[] };
}

/* ───────────────────────── games ───────────────────────── */

const GAME_COLS = new Set([
  "id", "name", "color", "format", "digits", "draw_time", "cutoff", "enabled", "draw_days",
  "jackpot_current", "main_count", "main_max", "mega_count", "mega_max", "logo", "min_stake",
  "max_stake", "bet_types", "sessions",
]);

export function gameToRow(g: Game, index: number): Row {
  const row: Row = { sort_order: index };
  const config: Row = {};
  for (const [k, v] of Object.entries(g)) {
    if (v === undefined || k === "sort_order") continue;
    if (GAME_COLS.has(k)) row[k] = v;
    else config[k] = v;
  }
  row.config = config;
  return row;
}

/** `defaults` fills games that were seeded by schema.sql and never saved by the app. */
export function rowToGame(row: Row, defaults: Game[]): Game {
  const config = (row.config as Row | null) || {};
  const g: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "config" || k === "created_at" || v === null) continue;
    g[k] = v;
  }
  for (const k of ["jackpot_current", "min_stake", "max_stake"]) if (g[k] != null) g[k] = Number(g[k]);
  const merged = { ...config, ...g } as unknown as Game;
  const unsynced = Object.keys(config).length === 0;
  if (unsynced) {
    const base = defaults.find((d) => d.id === merged.id);
    if (base) return { ...base, ...merged, prize_tiers: base.prize_tiers };
  }
  return merged;
}

export async function pullGames(
  defaults: Game[]
): Promise<Res<{ games: Game[]; unsynced: boolean }>> {
  const r = await selectAll("games", { col: "sort_order" });
  if (r.ok === false) return r;
  const unsynced = r.data.some((row) => !row.config || Object.keys(row.config as Row).length === 0);
  return { ok: true, data: { games: r.data.map((row) => rowToGame(row, defaults)), unsynced } };
}

export async function pushGames(games: Game[], removed: string[]): Promise<Res> {
  const r = await upsertRows("games", games.map(gameToRow), "id");
  if (r.ok === false) return r;
  return deleteRows("games", "id", removed);
}

/* ───────────────────────── bet types ───────────────────────── */

export async function pullBetTypes(): Promise<Res<BetType[]>> {
  const r = await selectAll("bet_types");
  if (r.ok === false) return r;
  return {
    ok: true,
    data: r.data.map((x) => ({
      key: String(x.key),
      label: String(x.label ?? x.key),
      digits: Number(x.digits) || 0,
      mode: String(x.mode || "exact") as BetType["mode"],
      multiplier: Number(x.multiplier) || 1,
      enabled: x.enabled !== false,
      min_stake: num(x.min_stake),
      max_stake: num(x.max_stake),
    })),
  };
}

export async function pushBetTypes(items: BetType[], removed: string[]): Promise<Res> {
  const rows = items.map((b) => ({
    key: b.key, label: b.label, digits: b.digits, mode: b.mode, multiplier: b.multiplier,
    enabled: b.enabled, min_stake: b.min_stake ?? null, max_stake: b.max_stake ?? null,
  }));
  const r = await upsertRows("bet_types", rows, "key");
  if (r.ok === false) return r;
  return deleteRows("bet_types", "key", removed);
}

/* ───────────────────────── draw results ───────────────────────── */

export const resultRowId = (r: Pick<DrawResult, "game_id" | "draw_date" | "session">) =>
  stableUuid(`result|${r.game_id}|${r.draw_date}|${r.session ?? ""}`);

export async function pullResults(): Promise<Res<DrawResult[]>> {
  const r = await selectAll("draw_results", { col: "draw_date", asc: false }, 1000);
  if (r.ok === false) return r;
  return {
    ok: true,
    data: r.data.map((x) => ({
      id: String(x.id),
      game_id: String(x.game_id),
      draw_date: String(x.draw_date).slice(0, 10),
      session: str(x.session),
      first: str(x.first),
      second: str(x.second),
      third: str(x.third),
      balls: (x.balls as number[] | null) ?? undefined,
      mega: num(x.mega),
      zodiac: str(x.zodiac),
      whe: num(x.whe),
      source: str(x.source),
      jackpot_at_draw: num(x.jackpot_at_draw),
      jackpot_next: num(x.jackpot_next),
      jackpot_won: x.jackpot_won == null ? undefined : Boolean(x.jackpot_won),
    })),
  };
}

export async function pushResults(items: DrawResult[], removed: string[]): Promise<Res> {
  const rows = items.map((r) => ({
    id: resultRowId(r), game_id: r.game_id, draw_date: r.draw_date, session: r.session ?? null,
    first: r.first ?? null, second: r.second ?? null, third: r.third ?? null,
    balls: r.balls ?? null, mega: r.mega ?? null, zodiac: r.zodiac ?? null, whe: r.whe ?? null,
    source: r.source ?? "manual", jackpot_at_draw: r.jackpot_at_draw ?? null,
    jackpot_next: r.jackpot_next ?? null, jackpot_won: r.jackpot_won ?? null,
  }));
  const r = await upsertRows("draw_results", rows, "id");
  if (r.ok === false) return r;
  return deleteRows("draw_results", "id", removed);
}

/* ───────────────────────── holidays ───────────────────────── */

export const holidayRowId = (h: Pick<Holiday, "date">) => stableUuid(`holiday|${h.date}`);

export async function pullHolidays(): Promise<Res<Holiday[]>> {
  const r = await selectAll("holidays", { col: "date" });
  if (r.ok === false) return r;
  return {
    ok: true,
    data: r.data.map((x) => ({
      id: String(x.id), date: String(x.date).slice(0, 10), name: String(x.name ?? ""), note: str(x.note),
    })),
  };
}

export async function pushHolidays(items: Holiday[], removed: string[]): Promise<Res> {
  const rows = items.map((h) => ({ id: holidayRowId(h), date: h.date, name: h.name, note: h.note ?? null }));
  const r = await upsertRows("holidays", rows, "date");
  if (r.ok === false) return r;
  return deleteRows("holidays", "id", removed);
}

/* ───────────────────────── promotions ───────────────────────── */

export async function pullPromotions(): Promise<Res<Promotion[]>> {
  const r = await selectAll("promotions", { col: "created_at" });
  if (r.ok === false) return r;
  return {
    ok: true,
    data: r.data.map((x) => ({
      id: String(x.id),
      name: String(x.name ?? ""),
      label: String(x.label ?? ""),
      instruction: String(x.instruction ?? ""),
      code_len: Number(x.code_len) || 6,
      min_plays: num(x.min_plays),
      min_games: num(x.min_games),
      min_amount: num(x.min_amount),
      game_ids: (x.game_ids as string[] | null) ?? undefined,
      prize: num(x.prize),
      prizes: (x.prizes as Promotion["prizes"]) ?? undefined,
      active: Boolean(x.active),
      start: str(x.start_at),
      end: str(x.end_at),
      url: str(x.url),
    })),
  };
}

export async function pushPromotions(items: Promotion[], removed: string[]): Promise<Res> {
  const rows = items.map((p) => ({
    id: p.id, name: p.name, label: p.label || "", instruction: p.instruction || "",
    code_len: p.code_len || 6, min_plays: p.min_plays ?? null, min_games: p.min_games ?? null,
    min_amount: p.min_amount ?? null, game_ids: p.game_ids ?? null, prize: p.prize ?? null,
    prizes: p.prizes ?? [], active: p.active, start_at: p.start || null, end_at: p.end || null,
    url: p.url ?? null,
  }));
  const r = await upsertRows("promotions", rows, "id");
  if (r.ok === false) return r;
  return deleteRows("promotions", "id", removed);
}

/* ───────────────────────── settings (singleton rows) ───────────────────────── */

export async function pullSetting<T>(key: string): Promise<Res<T | null>> {
  const sb = client();
  if (!sb) return fail("Supabase not configured");
  const { data, error } = await sb.from("settings").select("value").eq("key", key).maybeSingle();
  if (error) return fail(`settings.${key}: ${error.message}`);
  const value = (data as { value?: unknown } | null)?.value;
  return { ok: true, data: value && typeof value === "object" ? (value as T) : null };
}

export async function pushSetting(key: string, value: unknown): Promise<Res> {
  return upsertRows("settings", [{ key, value, updated_at: new Date().toISOString() }], "key");
}

export const pushBrand = (b: BrandSettings) => pushSetting("brand", b);
export const pushTicketDesign = (d: TicketDesign) => pushSetting("ticket_design", d);
export const pushFastPlay = (items: FastPlayGame[]) => pushSetting("fast_play_games", { items });
export async function pullFastPlay(): Promise<Res<FastPlayGame[] | null>> {
  const r = await pullSetting<{ items?: FastPlayGame[] }>("fast_play_games");
  if (r.ok === false) return r;
  return { ok: true, data: r.data?.items?.length ? r.data.items : null };
}

export const pushBlockedNumbers = (items: BlockedNumber[]) => pushSetting("blocked_numbers", { items });
export async function pullBlockedNumbers(): Promise<Res<BlockedNumber[] | null>> {
  const r = await pullSetting<{ items?: BlockedNumber[] }>("blocked_numbers");
  if (r.ok === false) return r;
  return { ok: true, data: r.data?.items ?? null };
}

export async function pullBroadcast(): Promise<Res<BroadcastMessage | null>> {
  const r = await pullSetting<{ message?: BroadcastMessage | null }>("broadcast");
  if (r.ok === false) return r;
  return { ok: true, data: r.data?.message ?? null };
}
export const pushBroadcast = (message: BroadcastMessage | null) => pushSetting("broadcast", { message });

/* ───────────────────────── per-row records ───────────────────────── */

export async function pullTopUps(): Promise<Res<TopUp[]>> {
  if (!(await signedIn())) return fail("Not signed in");
  const r = await selectAll("topups", { col: "created_at", asc: false }, 300);
  if (r.ok === false) return r;
  return {
    ok: true,
    data: r.data.map((x) => ({
      id: String(x.id),
      kind: String(x.kind) as TopUp["kind"],
      amount: Number(x.amount) || 0,
      retailer_id: String(x.retailer_id ?? ""),
      clerk: str(x.clerk),
      code: str(x.code),
      player_code: str(x.player_code),
      status: String(x.status) as TopUp["status"],
      created_at: String(x.created_at ?? ""),
      redeemed_at: str(x.redeemed_at),
      demo: x.demo ? true : undefined,
      error: str(x.error),
    })),
  };
}

export async function pushTopUp(t: TopUp): Promise<Res> {
  if (!isUuid(t.retailer_id)) return fail("topups: retailer is not a Supabase retailer");
  return upsertRows(
    "topups",
    [{
      id: t.id, kind: t.kind, amount: t.amount, retailer_id: t.retailer_id, clerk: t.clerk ?? null,
      code: t.code ?? null, player_code: t.player_code ?? null, status: t.status,
      created_at: t.created_at, redeemed_at: t.redeemed_at ?? null, demo: Boolean(t.demo),
      error: t.error ?? null,
    }],
    "id"
  );
}

export async function pullSupport(): Promise<Res<SupportTicket[]>> {
  if (!(await signedIn())) return fail("Not signed in");
  const r = await selectAll("support_tickets", { col: "created_at", asc: false }, 300);
  if (r.ok === false) return r;
  return {
    ok: true,
    data: r.data.map((x) => ({
      id: String(x.id),
      retailer_id: String(x.retailer_id),
      subject: String(x.subject ?? ""),
      body: String(x.body ?? ""),
      status: String(x.status || "open") as SupportTicket["status"],
      created_at: String(x.created_at ?? ""),
    })),
  };
}

export async function pushSupport(t: SupportTicket, userId?: string): Promise<Res> {
  if (!isUuid(t.retailer_id)) return fail("support: retailer is not a Supabase retailer");
  return upsertRows(
    "support_tickets",
    [{
      id: t.id, retailer_id: t.retailer_id, subject: t.subject, body: t.body, status: t.status,
      created_at: t.created_at, created_by: userId ?? null,
    }],
    "id"
  );
}

export async function pushPromoCode(p: {
  code: string; promotion_id: string; ticket_id: string; retailer_id: string;
}): Promise<Res> {
  if (!isUuid(p.retailer_id)) return fail("promo code: retailer is not a Supabase retailer");
  return upsertRows("promo_codes", [{ ...p, status: "issued" }], "code");
}

/** Cancel / redeem: update the status columns of an existing ticket. */
export async function pushTicketStatus(
  id: string,
  patch: { status: string; prize?: number; cancelled_at?: string; redeemed_at?: string }
): Promise<Res> {
  const sb = client();
  if (!sb) return fail("Supabase not configured");
  if (!(await signedIn())) return fail("Not signed in");
  const { error } = await sb.from("tickets").update(patch).eq("id", id);
  if (error) return fail(`tickets: ${error.message}`);
  return { ok: true, data: undefined };
}

/** Seller presence (needs public.ping_retailer() from sync.sql). */
export async function pingRetailerRemote(): Promise<void> {
  const sb = client();
  if (!sb || !(await signedIn())) return;
  const { error } = await sb.rpc("ping_retailer");
  if (error) console.warn("[cloud] ping_retailer:", error.message);
}
