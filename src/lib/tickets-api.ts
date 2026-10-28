import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Ticket, TicketLine } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: string | undefined | null): v is string {
  return !!v && UUID_RE.test(v);
}

function lineDrawDate(line: TicketLine): string {
  // TicketLine.date is YYYY-MM-DD or similar
  const d = (line.date || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date().toISOString().slice(0, 10);
}

/**
 * Insert a sold ticket + its lines into Supabase.
 * Requires: authenticated session, profiles.retailer_id UUID, tickets/ticket_lines tables,
 * and a matching row in public.retailers.
 */
export async function persistSoldTicket(
  ticket: Ticket,
  opts?: { userId?: string; retailerId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Supabase not configured" };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    return {
      ok: false,
      error: "Sign in with a Supabase retailer account to save tickets to the server",
    };
  }

  const retailerId = opts?.retailerId || ticket.retailer_id;
  if (!isUuid(retailerId)) {
    return {
      ok: false,
      error:
        "Retailer id must be a UUID linked in profiles.retailer_id (demo r001 will not save to Supabase)",
    };
  }

  const { error: ticketErr } = await sb.from("tickets").insert({
    id: ticket.id,
    retailer_id: retailerId,
    total: ticket.total,
    status: ticket.status || "sold",
    prize: ticket.prize ?? null,
    promo_code: ticket.promo_code ?? null,
    promo_id: ticket.promo_id ?? null,
    created_at: ticket.created_at || new Date().toISOString(),
    created_by: opts?.userId || sessionData.session.user.id,
  });

  if (ticketErr) {
    console.warn("[tickets] insert ticket failed:", ticketErr.message);
    return { ok: false, error: ticketErr.message };
  }

  if (ticket.lines?.length) {
    const rows = ticket.lines.map((l) => ({
      ticket_id: ticket.id,
      game_id: l.game,
      bet_type: l.bet_type,
      number: l.number || "",
      amount: l.amount,
      draw_date: lineDrawDate(l),
      session: l.session ?? null,
      symbols: l.symbols ?? null,
      balls: l.balls ?? null,
      mega: l.mega ?? null,
      prize: l.prize ?? null,
      status: l.status || "open",
    }));

    const { error: linesErr } = await sb.from("ticket_lines").insert(rows);
    if (linesErr) {
      console.warn("[tickets] insert lines failed:", linesErr.message);
      // Ticket header exists; report line error so operator knows
      return { ok: false, error: `Ticket saved but lines failed: ${linesErr.message}` };
    }
  }

  return { ok: true };
}

/** Load recent tickets for the current user (owner = all, retailer = own shop). */
export async function fetchTicketsFromSupabase(limit = 200): Promise<
  { ok: true; tickets: Ticket[] } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return { ok: false, error: "Not signed in" };

  const { data: tickets, error } = await sb
    .from("tickets")
    .select("*, ticket_lines(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };

  const mapped: Ticket[] = (tickets || []).map((row: Record<string, unknown>) => {
    const linesRaw = (row.ticket_lines as Record<string, unknown>[]) || [];
    const lines: TicketLine[] = linesRaw.map((l) => ({
      id: String(l.id || ""),
      game: String(l.game_id || ""),
      bet_type: String(l.bet_type || ""),
      number: String(l.number || ""),
      amount: Number(l.amount) || 0,
      date: String(l.draw_date || ""),
      session: l.session ? String(l.session) : undefined,
      symbols: (l.symbols as string[]) || undefined,
      balls: (l.balls as number[]) || undefined,
      mega: l.mega != null ? Number(l.mega) : undefined,
      prize: l.prize != null ? Number(l.prize) : undefined,
      status: l.status ? String(l.status) : undefined,
    }));
    return {
      id: String(row.id),
      retailer_id: String(row.retailer_id),
      lines,
      total: Number(row.total) || 0,
      status: (row.status as Ticket["status"]) || "sold",
      created_at: String(row.created_at || ""),
      prize: row.prize != null ? Number(row.prize) : undefined,
      promo_code: row.promo_code ? String(row.promo_code) : undefined,
      promo_id: row.promo_id ? String(row.promo_id) : undefined,
      cancelled_at: row.cancelled_at ? String(row.cancelled_at) : undefined,
      redeemed_at: row.redeemed_at ? String(row.redeemed_at) : undefined,
    };
  });

  return { ok: true, tickets: mapped };
}
