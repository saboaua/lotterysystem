import type { TicketDesign, TopUp, TopUpDesign } from "./types";
import { DEFAULT_TOPUP_DESIGN } from "./demo-data";
import { getSupabase } from "./supabase";

/** Top-up settings with defaults filled in (older saved designs have none). */
export function getTopUpDesign(design: TicketDesign | undefined): TopUpDesign {
  return { ...DEFAULT_TOPUP_DESIGN, ...(design?.topup || {}) };
}

// No 0/O/1/I so codes can be read out and typed without mistakes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/** Display format: groups of 4, e.g. K7QM-9XTD */
export function formatCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1-");
}

export const normalizeCode = (raw: string) => raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** New unique voucher code (prefix + random part). */
export function generateVoucherCode(cfg: TopUpDesign, existing: TopUp[]): string {
  const taken = new Set(existing.map((t) => normalizeCode(t.code || "")));
  const prefix = normalizeCode(cfg.code_prefix || "").slice(0, 4);
  const len = Math.min(16, Math.max(6, cfg.code_length || 8));
  for (let i = 0; i < 50; i++) {
    const code = normalizeCode(prefix) + randomChars(len);
    if (!taken.has(code)) return formatCode(code);
  }
  return formatCode(prefix + randomChars(len + 2));
}

export function validateAmount(n: number, cfg: TopUpDesign, currency: string): string | null {
  if (!Number.isFinite(n) || n <= 0) return "Enter an amount";
  if (n < cfg.min_amount) return `Minimum top-up is ${currency} ${cfg.min_amount}`;
  if (n > cfg.max_amount) return `Maximum top-up is ${currency} ${cfg.max_amount}`;
  return null;
}

export function topUpId(): string {
  return "TU" + Date.now().toString(36).toUpperCase() + randomChars(3);
}

export interface GatewayResult {
  ok: boolean;
  /** True when no player-account system is connected: nothing was really credited. */
  demo: boolean;
  error?: string;
}

/**
 * Talks to /api/topup, which forwards to the player-account system when PLAYER_API_URL is set.
 * action "credit": add `amount` straight to the account of `player_code`.
 * action "issue":  register a printed voucher `code` so the player site can redeem it.
 */
export async function callTopUpGateway(body: {
  action: "credit" | "issue";
  reference: string;
  amount: number;
  retailer_id: string;
  player_code?: string;
  code?: string;
}): Promise<GatewayResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    const res = await fetch("/api/topup", { method: "POST", headers, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { ok: false, demo: false, error: json.error || `Request failed (${res.status})` };
    }
    return { ok: true, demo: Boolean(json.demo) };
  } catch {
    return { ok: false, demo: false, error: "Could not reach the server" };
  }
}

/** Mask a player code for the printed confirmation (keeps the last 4). */
export function maskPlayerCode(code: string): string {
  const c = code.replace(/\s/g, "");
  return c.length <= 4 ? c : "•".repeat(c.length - 4) + c.slice(-4);
}
