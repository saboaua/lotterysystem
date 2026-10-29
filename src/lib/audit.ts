/**
 * Audit trail. Every sign-in and every back-office change is recorded in Supabase
 * (public.audit_log, append-only; the database stamps the actor and the time).
 * Without Supabase (demo mode) entries are kept in this browser instead.
 */
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { loadJson, saveJson } from "./persist";

export interface AuditEntry {
  id: string;
  at: string;
  actor_id?: string | null;
  actor_name: string;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity?: string | null;
  entity_id?: string | null;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AuditInput {
  action: string;
  entity?: string;
  entity_id?: string;
  summary: string;
  details?: Record<string, unknown>;
}

interface Actor {
  id: string;
  name: string;
  email?: string;
  role: string;
}

let actor: Actor | null = null;
/** Set by the store whenever the signed-in user changes. */
export function setAuditActor(a: Actor | null) {
  actor = a;
}

const LOCAL_KEY = "auditLog";
const PENDING_KEY = "auditPending";
const LOCAL_CAP = 1000;

function localId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Keep details small: long values (logos, prize tables) are summarised. */
function shrink(v: unknown): unknown {
  if (v === undefined) return null;
  try {
    const j = JSON.stringify(v);
    if (j && j.length > 300) return `[${Array.isArray(v) ? `${v.length} items` : "changed"}]`;
  } catch {
    return "[unserialisable]";
  }
  return v;
}

/** Field-level before/after of two plain objects (shallow, ignores listed keys). */
export function diffFields(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  ignore: string[] = []
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    if (ignore.includes(k)) continue;
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = { from: shrink(a), to: shrink(b) };
  }
  return out;
}

export function describeChanges(changes: Record<string, unknown>): string {
  const keys = Object.keys(changes);
  if (!keys.length) return "";
  return keys.length > 6 ? `${keys.slice(0, 6).join(", ")} +${keys.length - 6} more` : keys.join(", ");
}

function appendLocal(entry: AuditEntry) {
  const all = loadJson<AuditEntry[]>(LOCAL_KEY, []);
  saveJson(LOCAL_KEY, [entry, ...all].slice(0, LOCAL_CAP));
}

async function insertRemote(input: AuditInput): Promise<boolean> {
  const sb = isSupabaseConfigured ? getSupabase() : null;
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  if (!data.session) return false;
  const { error } = await sb.from("audit_log").insert({
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entity_id ?? null,
    summary: input.summary,
    details: input.details ?? {},
  });
  if (error) {
    console.warn("[audit] insert:", error.message);
    return false;
  }
  return true;
}

/** Record an event. Never throws; failed remote writes are queued and retried. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    if (isSupabaseConfigured) {
      const ok = await insertRemote(input);
      if (!ok) {
        const queue = loadJson<AuditInput[]>(PENDING_KEY, []);
        saveJson(PENDING_KEY, [...queue, { ...input, details: { ...input.details, queued_at: new Date().toISOString() } }].slice(-200));
      }
      return;
    }
    appendLocal({
      id: localId(),
      at: new Date().toISOString(),
      actor_id: actor?.id ?? null,
      actor_name: actor?.name || "unknown",
      actor_email: actor?.email ?? null,
      actor_role: actor?.role ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entity_id ?? null,
      summary: input.summary,
      details: input.details ?? {},
    });
  } catch (e) {
    console.warn("[audit] log failed:", e);
  }
}

/** Retry entries that could not be written earlier (offline, expired session...). */
export async function flushPendingAudit(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const queue = loadJson<AuditInput[]>(PENDING_KEY, []);
  if (!queue.length) return;
  const left: AuditInput[] = [];
  for (const item of queue) {
    const ok = await insertRemote(item);
    if (!ok) left.push(item);
  }
  saveJson(PENDING_KEY, left);
}

export interface AuditFilters {
  search?: string;
  action?: string;
  entity?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  before?: string; // ISO timestamp cursor (older than)
  limit?: number;
}

export async function fetchAudit(
  f: AuditFilters
): Promise<{ ok: true; entries: AuditEntry[] } | { ok: false; error: string }> {
  const limit = f.limit ?? 100;
  if (!isSupabaseConfigured) {
    let list = loadJson<AuditEntry[]>(LOCAL_KEY, []);
    const q = (f.search || "").toLowerCase();
    list = list.filter(
      (e) =>
        (!f.action || e.action === f.action) &&
        (!f.entity || e.entity === f.entity) &&
        (!f.from || e.at >= f.from) &&
        (!f.to || e.at <= `${f.to}T23:59:59.999Z`) &&
        (!f.before || e.at < f.before) &&
        (!q || `${e.actor_name} ${e.summary} ${e.entity_id ?? ""}`.toLowerCase().includes(q))
    );
    return { ok: true, entries: list.slice(0, limit) };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  let q = sb.from("audit_log").select("*").order("at", { ascending: false }).limit(limit);
  if (f.action) q = q.eq("action", f.action);
  if (f.entity) q = q.eq("entity", f.entity);
  if (f.from) q = q.gte("at", `${f.from}T00:00:00`);
  if (f.to) q = q.lte("at", `${f.to}T23:59:59.999`);
  if (f.before) q = q.lt("at", f.before);
  const s = (f.search || "").trim().replace(/[%,()]/g, " ");
  if (s) q = q.or(`summary.ilike.%${s}%,actor_name.ilike.%${s}%,entity_id.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, entries: (data || []) as AuditEntry[] };
}

/** Labels shown in the audit screen. */
export const AUDIT_ACTIONS: Record<string, string> = {
  login: "Sign in",
  logout: "Sign out",
  create: "Created",
  update: "Changed",
  delete: "Deleted",
  cancel_ticket: "Ticket cancelled",
  redeem_ticket: "Ticket redeemed",
  topup: "Top up",
  broadcast: "Broadcast",
  staff: "Staff / roles",
};

/** Compare two snapshots of a collection and record created / changed / deleted rows. */
export function auditCollectionChanges<T>(
  entity: string,
  prev: T[],
  cur: T[],
  idOf: (t: T) => string,
  label: (t: T) => string,
  opts: { ignore?: string[] } = {}
): void {
  const prevMap = new Map(prev.map((x) => [idOf(x), x]));
  const curMap = new Map(cur.map((x) => [idOf(x), x]));
  const created = cur.filter((x) => !prevMap.has(idOf(x)));
  const deleted = prev.filter((x) => !curMap.has(idOf(x)));
  const updated = cur.filter((x) => {
    const p = prevMap.get(idOf(x));
    return p !== undefined && JSON.stringify(p) !== JSON.stringify(x);
  });

  const emit = (action: string, items: T[], verb: string) => {
    if (items.length > 8) {
      void logAudit({ action, entity, summary: `${verb} ${items.length} ${entity} records`, details: { count: items.length } });
      return;
    }
    for (const it of items) {
      void logAudit({ action, entity, entity_id: idOf(it), summary: `${verb} ${entity} "${label(it)}"` });
    }
  };
  emit("create", created, "Created");
  emit("delete", deleted, "Deleted");

  if (updated.length > 12) {
    void logAudit({ action: "update", entity, summary: `Changed ${updated.length} ${entity} records`, details: { count: updated.length } });
    return;
  }
  for (const it of updated) {
    const before = prevMap.get(idOf(it)) as Record<string, unknown>;
    const changes = diffFields(before, it as Record<string, unknown>, opts.ignore);
    if (!Object.keys(changes).length) continue;
    void logAudit({
      action: "update",
      entity,
      entity_id: idOf(it),
      summary: `Changed ${entity} "${label(it)}": ${describeChanges(changes)}`,
      details: { changes },
    });
  }
}
