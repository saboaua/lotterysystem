import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_GEO_POLICY, type GeoPolicy } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public read of geo policy (country allowlist only — no secrets).
 * Used by middleware / edge checks. Cached briefly via Cache-Control.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json(
      { ok: true, policy: DEFAULT_GEO_POLICY },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  }

  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.from("settings").select("value").eq("key", "security_geo").maybeSingle();
    if (error) {
      return NextResponse.json({ ok: true, policy: DEFAULT_GEO_POLICY, warning: error.message });
    }
    const raw = (data?.value || {}) as Partial<GeoPolicy>;
    const policy: GeoPolicy = {
      ...DEFAULT_GEO_POLICY,
      ...raw,
      allowed_countries: Array.isArray(raw.allowed_countries)
        ? raw.allowed_countries.map((c) => String(c).toUpperCase())
        : DEFAULT_GEO_POLICY.allowed_countries,
    };
    return NextResponse.json(
      { ok: true, policy },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    return NextResponse.json({
      ok: true,
      policy: DEFAULT_GEO_POLICY,
      warning: e instanceof Error ? e.message : "lookup failed",
    });
  }
}
