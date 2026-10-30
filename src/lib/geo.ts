/** ISO 3166-1 alpha-2 country codes used for geo fencing. */

export type GeoPolicy = {
  /** When false, all countries are allowed (events can still be logged in monitor mode). */
  enabled: boolean;
  /**
   * block = refuse access outside allowlist
   * monitor = allow everyone but log out-of-region hits
   */
  mode: "block" | "monitor";
  /** Allowed ISO country codes (uppercase), e.g. ["AW","CW","BQ"] */
  allowed_countries: string[];
  /** If the edge cannot determine country, allow when true (safer for break-glass). */
  allow_unknown: boolean;
  /** Optional owner note shown on blocked page */
  block_message?: string;
  updated_at?: string;
};

export type SecurityEvent = {
  id: string;
  at: string;
  type: "geo_block" | "geo_monitor" | "login_denied_geo";
  ip?: string;
  country?: string | null;
  path?: string;
  user_agent?: string;
  email?: string;
  note?: string;
};

export const DEFAULT_GEO_POLICY: GeoPolicy = {
  enabled: false,
  mode: "block",
  allowed_countries: ["AW", "CW", "BQ", "SX", "TC"],
  allow_unknown: true,
  block_message: "This system is only available in authorised regions.",
};

/** Caribbean / nearby territories commonly needed for Dutch Caribbean lottery ops. */
export const GEO_COUNTRY_CATALOG: { code: string; name: string; region: string }[] = [
  { code: "AW", name: "Aruba", region: "Dutch Caribbean" },
  { code: "CW", name: "Curaçao", region: "Dutch Caribbean" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba", region: "Dutch Caribbean" },
  { code: "SX", name: "Sint Maarten", region: "Dutch Caribbean" },
  { code: "TC", name: "Turks and Caicos Islands", region: "Caribbean" },
  { code: "JM", name: "Jamaica", region: "Caribbean" },
  { code: "TT", name: "Trinidad and Tobago", region: "Caribbean" },
  { code: "BB", name: "Barbados", region: "Caribbean" },
  { code: "BS", name: "Bahamas", region: "Caribbean" },
  { code: "DO", name: "Dominican Republic", region: "Caribbean" },
  { code: "HT", name: "Haiti", region: "Caribbean" },
  { code: "CU", name: "Cuba", region: "Caribbean" },
  { code: "PR", name: "Puerto Rico", region: "Caribbean" },
  { code: "VI", name: "U.S. Virgin Islands", region: "Caribbean" },
  { code: "VG", name: "British Virgin Islands", region: "Caribbean" },
  { code: "KY", name: "Cayman Islands", region: "Caribbean" },
  { code: "GP", name: "Guadeloupe", region: "Caribbean" },
  { code: "MQ", name: "Martinique", region: "Caribbean" },
  { code: "LC", name: "Saint Lucia", region: "Caribbean" },
  { code: "GD", name: "Grenada", region: "Caribbean" },
  { code: "AG", name: "Antigua and Barbuda", region: "Caribbean" },
  { code: "KN", name: "Saint Kitts and Nevis", region: "Caribbean" },
  { code: "VC", name: "Saint Vincent and the Grenadines", region: "Caribbean" },
  { code: "DM", name: "Dominica", region: "Caribbean" },
  { code: "SR", name: "Suriname", region: "South America / Caribbean" },
  { code: "GY", name: "Guyana", region: "South America / Caribbean" },
  { code: "NL", name: "Netherlands", region: "Europe (HQ / ops)" },
  { code: "US", name: "United States", region: "Optional" },
  { code: "CA", name: "Canada", region: "Optional" },
];

export const CARIBBEAN_PRESET = GEO_COUNTRY_CATALOG.filter((c) =>
  ["AW", "CW", "BQ", "SX", "TC", "JM", "TT", "BB", "BS", "DO", "PR", "VI", "VG", "KY", "GP", "MQ", "LC", "GD", "AG", "KN", "VC", "DM", "HT", "CU"].includes(
    c.code
  )
).map((c) => c.code);

export const DUTCH_CARIBBEAN_PRESET = ["AW", "CW", "BQ", "SX"];

export function normalizeCountry(code?: string | null): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c === "XX" || c === "T1" || c === "UNKNOWN") return null;
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

/** Extract client country from CDN / proxy headers (Vercel, Cloudflare, etc.). */
export function countryFromHeaders(h: Headers | { get(name: string): string | null }): string | null {
  const raw =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    h.get("x-appengine-country") ||
    null;
  return normalizeCountry(raw);
}

export function clientIpFromHeaders(h: Headers | { get(name: string): string | null }): string | undefined {
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || undefined;
}

/**
 * Decide whether a request is allowed under the policy.
 * Returns allowed=true when geo is disabled or country is on the list.
 */
export function evaluateGeoAccess(
  policy: GeoPolicy,
  country: string | null
): { allowed: boolean; reason: string } {
  if (!policy.enabled) return { allowed: true, reason: "geo_disabled" };
  if (!country) {
    return policy.allow_unknown
      ? { allowed: true, reason: "unknown_allowed" }
      : { allowed: false, reason: "unknown_blocked" };
  }
  const allow = new Set((policy.allowed_countries || []).map((c) => c.toUpperCase()));
  if (allow.has(country)) return { allowed: true, reason: "country_allowed" };
  if (policy.mode === "monitor") return { allowed: true, reason: "monitor_pass" };
  return { allowed: false, reason: "country_blocked" };
}

export function countryLabel(code: string): string {
  return GEO_COUNTRY_CATALOG.find((c) => c.code === code)?.name || code;
}
