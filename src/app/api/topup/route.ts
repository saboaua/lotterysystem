import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Player top-up gateway.
 *
 * Connects the POS to the player-account system (shocolottery.com).
 *   PLAYER_API_URL  base URL of the player system   (required to really credit accounts)
 *   PLAYER_API_KEY  secret sent as "Authorization: Bearer <key>"
 *
 * It forwards:
 *   POST {PLAYER_API_URL}/topups/credit  { reference, player_code, amount, retailer_id }
 *   POST {PLAYER_API_URL}/topups/issue   { reference, code, amount, retailer_id }
 * and expects a 2xx JSON response for success (anything else is shown to the seller as an error).
 *
 * Safety: money only moves when PLAYER_API_URL is set AND the caller has a valid Supabase login.
 * With no PLAYER_API_URL the route runs in demo mode and credits nothing.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const action = body.action;
  const amount = Number(body.amount);
  const reference = String(body.reference || "").slice(0, 64);
  const retailer_id = String(body.retailer_id || "").slice(0, 64);
  const player_code = String(body.player_code || "").trim().slice(0, 64);
  const code = String(body.code || "").trim().slice(0, 32);

  if (action !== "credit" && action !== "issue") {
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || !reference) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
  }
  if (action === "credit" && !player_code) {
    return NextResponse.json({ ok: false, error: "Player code required" }, { status: 400 });
  }
  if (action === "issue" && !code) {
    return NextResponse.json({ ok: false, error: "Voucher code required" }, { status: 400 });
  }

  const base = (process.env.PLAYER_API_URL || "").replace(/\/+$/, "");
  if (!base) {
    // Demo mode: nothing is sent anywhere.
    return NextResponse.json({ ok: true, demo: true });
  }

  // Live mode: require a signed-in POS user.
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!sbUrl || !sbKey || !token) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { data, error } = await createClient(sbUrl, sbKey).auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: "Session expired. Sign in again." }, { status: 401 });
  }

  try {
    const res = await fetch(`${base}/topups/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PLAYER_API_KEY ? { Authorization: `Bearer ${process.env.PLAYER_API_KEY}` } : {}),
      },
      body: JSON.stringify({ reference, amount, retailer_id, ...(action === "credit" ? { player_code } : { code }) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: false, error: String(j.error || j.message || `Player system error (${res.status})`) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, demo: false });
  } catch {
    return NextResponse.json({ ok: false, error: "Player system unreachable" }, { status: 502 });
  }
}
