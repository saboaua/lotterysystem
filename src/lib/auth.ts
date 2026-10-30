import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { AppUser, Role } from "./types";

export type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; error: string; code?: string };

/** Map provider errors to safe, user-facing messages (no account enumeration). */
export function friendlyAuthError(message?: string | null): string {
  const m = (message || "").toLowerCase();
  if (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("wrong password") ||
    m.includes("email not confirmed") ||
    m.includes("user not found") ||
    m.includes("invalid email or password")
  ) {
    return "Invalid email or password";
  }
  if (m.includes("email rate") || m.includes("too many") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (m.includes("not configured")) {
    return "Sign-in is not configured. Contact support.";
  }
  // Default: never echo raw provider text that might leak account state
  return "Invalid email or password";
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Sign-in is not configured. Contact support.", code: "config" };

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return {
      ok: false,
      error: friendlyAuthError(error?.message),
      code: error?.status === 400 || error?.message?.toLowerCase().includes("invalid")
        ? "invalid_credentials"
        : "auth_error",
    };
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
    return { ok: false, error: "This account has been disabled. Contact the owner.", code: "disabled" };
  }
  return { ok: true, user: profile };
}

/**
 * Change the signed-in user's own password. The current password is checked first
 * (a stolen, unlocked session cannot silently change it).
 */
export async function changePassword(
  email: string,
  current: string,
  next: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Password changes need Supabase to be configured." };
  const { error: verifyErr } = await sb.auth.signInWithPassword({ email, password: current });
  if (verifyErr) return { ok: false, error: "Current password is incorrect." };
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface ProfileDetails {
  first_name: string;
  last_name: string;
  phone: string;
  address_line: string;
  city: string;
  country: string;
  postal_code: string;
}

/** Save the signed-in user's own contact details (server function only touches these fields). */
export async function updateMyProfile(d: ProfileDetails): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const { error } = await sb.rpc("update_my_profile", {
    p_first: d.first_name,
    p_last: d.last_name,
    p_phone: d.phone,
    p_address: d.address_line,
    p_city: d.city,
    p_country: d.country,
    p_postal: d.postal_code,
  });
  if (error) {
    const missing = /update_my_profile|function/i.test(error.message);
    return { ok: false, error: missing ? "Run supabase/v3_profile_numbers.sql in Supabase first." : error.message };
  }
  return { ok: true };
}

/**
 * Change the login email. Supabase sends a confirmation link; the address only changes after it is
 * confirmed. The current password is checked first.
 */
export async function changeEmail(
  currentEmail: string,
  password: string,
  newEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Email changes need Supabase to be configured." };
  const { error: verifyErr } = await sb.auth.signInWithPassword({ email: currentEmail, password });
  if (verifyErr) return { ok: false, error: "Current password is incorrect." };
  const { error } = await sb.auth.updateUser({ email: newEmail });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

/** Optional contact fields (need supabase/v3_profile_numbers.sql). A failure here must never block sign-in. */
async function loadProfileExtras(userId: string): Promise<Partial<AppUser>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb
    .from("profiles")
    .select("first_name, last_name, phone, address_line, city, country, postal_code")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return {};
  const out: Partial<AppUser> = {};
  for (const [k, v] of Object.entries(data)) if (typeof v === "string" && v) (out as Record<string, string>)[k] = v;
  return out;
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
  const extras = await loadProfileExtras(userId);
  return {
    ...extras,
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
