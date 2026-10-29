import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Staff account management (owner only).
 *
 * Creating / disabling Supabase Auth users needs the service-role key, which must never reach the
 * browser, so it lives only here:   SUPABASE_SERVICE_ROLE_KEY  (Vercel → Settings → Environment Variables)
 *
 * Every action is checked against the caller's session (must be the owner) and written to the audit log.
 */
type Body = {
  action?: string;
  user_id?: string;
  email?: string;
  password?: string;
  name?: string;
  staff_role_id?: string | null;
  active?: boolean;
};

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function audit(
  admin: SupabaseClient,
  actor: { id: string; name: string; email: string },
  summary: string,
  entity_id?: string,
  details: Record<string, unknown> = {}
) {
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_name: actor.name,
    actor_email: actor.email,
    actor_role: "owner",
    action: "staff",
    entity: "staff",
    entity_id: entity_id ?? null,
    summary,
    details,
  });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anon) return bad("Supabase is not configured", 501);
  if (!service) {
    return bad(
      "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables, then redeploy.",
      501
    );
  }

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return bad("Sign in required", 401);
  const { data: who, error: whoErr } = await createClient(url, anon).auth.getUser(token);
  if (whoErr || !who.user) return bad("Session expired. Sign in again.", 401);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: me } = await admin
    .from("profiles")
    .select("id, name, email, role, active")
    .eq("id", who.user.id)
    .maybeSingle();
  if (!me || me.role !== "owner" || me.active === false) return bad("Only the owner can manage staff", 403);
  const actor = { id: me.id as string, name: (me.name as string) || (me.email as string) || "owner", email: (me.email as string) || "" };

  const action = body.action;

  if (action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Enter a valid email");
    if (password.length < 8) return bad("Password must be at least 8 characters");
    if (!name) return bad("Enter the staff member's name");
    if (!body.staff_role_id) return bad("Choose a role");

    const { data: role } = await admin.from("staff_roles").select("id, name").eq("id", body.staff_role_id).maybeSingle();
    if (!role) return bad("Role not found");

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !created.user) return bad(error?.message || "Could not create the account");

    const { error: pErr } = await admin.from("profiles").upsert({
      id: created.user.id,
      email,
      name,
      role: "staff",
      staff_role_id: role.id,
      active: true,
      must_change_password: false,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return bad(`Profile could not be saved: ${pErr.message}`, 500);
    }
    await audit(admin, actor, `Created staff account ${name} <${email}> with role ${role.name}`, created.user.id, {
      email,
      role: role.name,
    });
    return NextResponse.json({ ok: true, user_id: created.user.id });
  }

  // Everything below targets an existing STAFF account (never the owner or a retailer).
  const target = String(body.user_id || "");
  if (!target) return bad("Missing user");
  const { data: t } = await admin
    .from("profiles")
    .select("id, name, email, role, active, staff_role_id")
    .eq("id", target)
    .maybeSingle();
  if (!t || t.role !== "staff") return bad("Staff account not found", 404);
  const label = `${t.name || t.email}`;

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    const changed: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim() && body.name.trim() !== t.name) {
      patch.name = body.name.trim();
      changed.name = { from: t.name, to: patch.name };
    }
    if (body.staff_role_id && body.staff_role_id !== t.staff_role_id) {
      const { data: role } = await admin.from("staff_roles").select("id, name").eq("id", body.staff_role_id).maybeSingle();
      if (!role) return bad("Role not found");
      patch.staff_role_id = role.id;
      changed.role = { to: role.name };
    }
    if (typeof body.active === "boolean" && body.active !== (t.active !== false)) {
      patch.active = body.active;
      changed.active = { from: t.active !== false, to: body.active };
      // Also block / unblock sign-in at the Auth level.
      const { error: banErr } = await admin.auth.admin.updateUserById(target, {
        ban_duration: body.active ? "none" : "876000h",
      });
      if (banErr) return bad(banErr.message, 500);
    }
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true, unchanged: true });
    const { error } = await admin.from("profiles").update(patch).eq("id", target);
    if (error) return bad(error.message, 500);
    await audit(admin, actor, `Changed staff account ${label}: ${Object.keys(changed).join(", ")}`, target, { changes: changed });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_password") {
    const password = String(body.password || "");
    if (password.length < 8) return bad("Password must be at least 8 characters");
    const { error } = await admin.auth.admin.updateUserById(target, { password });
    if (error) return bad(error.message, 500);
    await audit(admin, actor, `Reset password for staff account ${label}`, target);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(target);
    if (error) return bad(error.message, 500);
    await audit(admin, actor, `Deleted staff account ${label}`, target, { email: t.email });
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown action");
}
