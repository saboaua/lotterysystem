import { getSupabase, isSupabaseConfigured } from "./supabase";
import { logAudit } from "./audit";

export interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  active: boolean;
  staff_role_id: string | null;
  created_at?: string;
}

type Res<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listRoles(): Promise<Res<StaffRole[]>> {
  const sb = isSupabaseConfigured ? getSupabase() : null;
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { data, error } = await sb.from("staff_roles").select("*").order("name");
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data || []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      description: String(r.description ?? ""),
      permissions: (r.permissions as string[] | null) ?? [],
    })),
  };
}

export async function saveRole(role: Omit<StaffRole, "id"> & { id?: string }): Promise<Res<StaffRole>> {
  const sb = isSupabaseConfigured ? getSupabase() : null;
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const row = { name: role.name.trim(), description: role.description.trim(), permissions: role.permissions };
  const q = role.id
    ? sb.from("staff_roles").update(row).eq("id", role.id).select().single()
    : sb.from("staff_roles").insert(row).select().single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  void logAudit({
    action: "staff",
    entity: "role",
    entity_id: String(data.id),
    summary: `${role.id ? "Changed" : "Created"} role "${row.name}" (${row.permissions.length} permissions)`,
    details: { permissions: row.permissions },
  });
  return {
    ok: true,
    data: {
      id: String(data.id),
      name: String(data.name),
      description: String(data.description ?? ""),
      permissions: (data.permissions as string[] | null) ?? [],
    },
  };
}

export async function deleteRole(role: StaffRole): Promise<Res<void>> {
  const sb = isSupabaseConfigured ? getSupabase() : null;
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("staff_roles").delete().eq("id", role.id);
  if (error) return { ok: false, error: error.message };
  void logAudit({ action: "staff", entity: "role", entity_id: role.id, summary: `Deleted role "${role.name}"` });
  return { ok: true, data: undefined };
}

export async function listStaff(): Promise<Res<StaffMember[]>> {
  const sb = isSupabaseConfigured ? getSupabase() : null;
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, name, active, staff_role_id, created_at")
    .eq("role", "staff")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data || []).map((p) => ({
      id: String(p.id),
      email: String(p.email ?? ""),
      name: String(p.name ?? ""),
      active: p.active !== false,
      staff_role_id: (p.staff_role_id as string | null) ?? null,
      created_at: p.created_at as string | undefined,
    })),
  };
}

/** Account actions run on the server (service-role key); the owner's session authorises them. */
export async function staffAction(
  body: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = isSupabaseConfigured ? getSupabase() : null;
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "Sign in again" };
  try {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return res.ok && j.ok ? { ok: true } : { ok: false, error: j.error || `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
