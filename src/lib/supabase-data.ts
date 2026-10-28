import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { BrandSettings, Retailer, RetailerStatus, TicketDesign } from "./types";
import { DEMO_BRAND, DEMO_TICKET_DESIGN } from "./demo-data";

function mapRetailer(row: Record<string, unknown>): Retailer {
  const active = row.active !== false;
  const statusRaw = row.status != null ? String(row.status) : "";
  const status: RetailerStatus | undefined =
    statusRaw === "active" || statusRaw === "suspended" || statusRaw === "disabled"
      ? statusRaw
      : active
        ? "active"
        : "disabled";

  return {
    id: String(row.id),
    number: String(row.number ?? ""),
    name: String(row.name ?? ""),
    first_name: row.first_name != null ? String(row.first_name) : undefined,
    last_name: row.last_name != null ? String(row.last_name) : undefined,
    address: row.address != null ? String(row.address) : undefined,
    phone: row.phone != null ? String(row.phone) : undefined,
    commission_sell: Number(row.commission_sell) || 0,
    commission_redeem: Number(row.commission_redeem) || 0,
    active,
    status,
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    username: row.username != null ? String(row.username) : undefined,
    last_seen: row.last_seen != null ? String(row.last_seen) : undefined,
    last_ack: row.last_ack != null ? String(row.last_ack) : undefined,
  };
}

/** Load all retailers from Supabase (public read policy). */
export async function fetchRetailersFromSupabase(): Promise<
  { ok: true; retailers: Retailer[] } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await sb
    .from("retailers")
    .select("*")
    .order("number", { ascending: true });

  if (error) {
    console.warn("[supabase-data] retailers:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, retailers: (data || []).map((r) => mapRetailer(r as Record<string, unknown>)) };
}

/** Load brand + ticket_design from public.settings singleton rows. */
export async function fetchSettingsFromSupabase(): Promise<
  | { ok: true; brand?: BrandSettings; ticketDesign?: TicketDesign }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await sb.from("settings").select("key, value").in("key", [
    "brand",
    "ticket_design",
  ]);

  if (error) {
    console.warn("[supabase-data] settings:", error.message);
    return { ok: false, error: error.message };
  }

  let brand: BrandSettings | undefined;
  let ticketDesign: TicketDesign | undefined;

  for (const row of data || []) {
    const key = String((row as { key: string }).key);
    const value = (row as { value: unknown }).value;
    if (!value || typeof value !== "object") continue;
    if (key === "brand") {
      brand = { ...DEMO_BRAND, ...(value as Partial<BrandSettings>) };
    } else if (key === "ticket_design") {
      ticketDesign = { ...DEMO_TICKET_DESIGN, ...(value as Partial<TicketDesign>) };
    }
  }

  return { ok: true, brand, ticketDesign };
}

/**
 * Persist brand and/or ticket design into settings (owner only via RLS).
 * Best-effort; errors are logged, not thrown.
 */
export async function persistSettingsToSupabase(opts: {
  brand?: BrandSettings;
  ticketDesign?: TicketDesign;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const sb = getSupabase();
  if (!sb) return;

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return;

  const upserts: { key: string; value: unknown; updated_at: string }[] = [];
  if (opts.brand) {
    upserts.push({
      key: "brand",
      value: opts.brand,
      updated_at: new Date().toISOString(),
    });
  }
  if (opts.ticketDesign) {
    upserts.push({
      key: "ticket_design",
      value: opts.ticketDesign,
      updated_at: new Date().toISOString(),
    });
  }
  if (!upserts.length) return;

  const { error } = await sb.from("settings").upsert(upserts, { onConflict: "key" });
  if (error) console.warn("[supabase-data] persist settings:", error.message);
}

/** Upsert a retailer row (owner). Returns the saved retailer or error. */
export async function persistRetailerToSupabase(
  retailer: Retailer
): Promise<{ ok: true; retailer: Retailer } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(retailer.id);

  const payload: Record<string, unknown> = {
    number: retailer.number,
    name: retailer.name,
    first_name: retailer.first_name ?? null,
    last_name: retailer.last_name ?? null,
    address: retailer.address ?? null,
    phone: retailer.phone ?? null,
    commission_sell: retailer.commission_sell,
    commission_redeem: retailer.commission_redeem,
    active: retailer.status ? retailer.status === "active" : retailer.active,
    lat: retailer.lat ?? null,
    lng: retailer.lng ?? null,
    username: retailer.username ?? null,
  };

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  if (isUuid) {
    payload.id = retailer.id;
    const res = await sb
      .from("retailers")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    data = res.data as Record<string, unknown> | null;
    error = res.error;
  } else {
    const res = await sb.from("retailers").insert(payload).select("*").maybeSingle();
    data = res.data as Record<string, unknown> | null;
    error = res.error;
  }

  if (error) {
    console.warn("[supabase-data] retailer upsert:", error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "No retailer returned" };
  return { ok: true, retailer: mapRetailer(data) };
}
