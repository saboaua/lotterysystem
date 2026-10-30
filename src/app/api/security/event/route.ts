import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SecurityEvent } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENTS = 500;
const SETTINGS_KEY = "security_events";

type Body = {
  type?: SecurityEvent["type"];
  country?: string | null;
  path?: string;
  email?: string;
  note?: string;
};

/**
 * Append a security event (geo block / monitor).
 * Prefer service role so blocked (unauthenticated) visitors can still be logged.
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type || "geo_block";
  if (!["geo_block", "geo_monitor", "login_denied_geo"].includes(type)) {
    return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 501 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const ua = req.headers.get("user-agent") || undefined;

  const event: SecurityEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    type,
    ip,
    country: body.country ?? null,
    path: body.path?.slice(0, 200),
    user_agent: ua?.slice(0, 300),
    email: body.email?.slice(0, 120),
    note: body.note?.slice(0, 300),
  };

  const sb = createClient(url, service || anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data } = await sb.from("settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const prev = Array.isArray((data?.value as { items?: SecurityEvent[] })?.items)
      ? ((data!.value as { items: SecurityEvent[] }).items as SecurityEvent[])
      : Array.isArray(data?.value)
        ? (data!.value as SecurityEvent[])
        : [];
    const items = [event, ...prev].slice(0, MAX_EVENTS);
    const { error } = await sb.from("settings").upsert(
      {
        key: SETTINGS_KEY,
        value: { items },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (service) {
      await sb.from("audit_log").insert({
        actor_id: null,
        actor_name: "system",
        actor_email: null,
        actor_role: "system",
        action: type,
        entity: "security",
        entity_id: event.id,
        summary: `Security: ${type} · ${event.country || "??"} · ${event.ip || "no-ip"}`,
        details: event,
      });
    }

    return NextResponse.json({ ok: true, id: event.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to store event" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anon) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (service) {
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await admin.from("settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const items = Array.isArray((data?.value as { items?: SecurityEvent[] })?.items)
      ? (data!.value as { items: SecurityEvent[] }).items
      : [];
    return NextResponse.json({ ok: true, items });
  }

  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const userSb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userSb.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await userSb.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profile?.role !== "owner") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { data } = await userSb.from("settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  const items = Array.isArray((data?.value as { items?: SecurityEvent[] })?.items)
    ? (data!.value as { items: SecurityEvent[] }).items
    : [];
  return NextResponse.json({ ok: true, items });
}
