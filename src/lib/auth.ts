import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { AppUser, Role } from "./types";

export type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; error: string };

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, error: error?.message || "Login failed" };
  }

  const profile = await loadProfile(data.user.id);
  if (!profile) {
    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.email?.split("@")[0] || "User",
        role: "retailer",
      },
    };
  }
  if ((profile as AppUser & { disabled?: boolean }).disabled) {
    await sb.auth.signOut();
    return { ok: false, error: "This account has been disabled. Contact the owner." };
  }
  return { ok: true, user: profile };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

async function loadProfile(userId: string): Promise<AppUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, name, role, retailer_id, username, must_change_password, active, staff_role_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;

  let staffRole: string | undefined;
  let permissions: string[] | undefined;
  if (data.role === "staff" && data.staff_role_id) {
    const { data: r } = await sb
      .from("staff_roles")
      .select("name, permissions")
      .eq("id", data.staff_role_id)
      .maybeSingle();
    staffRole = r?.name || undefined;
    permissions = (r?.permissions as string[] | null) || [];
  } else if (data.role === "staff") {
    permissions = [];
  }
  return {
    id: data.id,
    email: data.email || "",
    name: data.name || "",
    role: (data.role as Role) || "retailer",
    retailer_id: data.retailer_id || undefined,
    username: data.username || undefined,
    must_change_password: data.must_change_password || false,
    staff_role: staffRole,
    permissions,
    ...(data.active === false ? { disabled: true } : {}),
  } as AppUser;
}


export { isSupabaseConfigured };
