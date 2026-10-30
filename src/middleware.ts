import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_GEO_POLICY,
  clientIpFromHeaders,
  countryFromHeaders,
  evaluateGeoAccess,
  type GeoPolicy,
} from "@/lib/geo";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

let cachedPolicy: { at: number; policy: GeoPolicy } | null = null;
const POLICY_TTL_MS = 30_000;

function isExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/security/") ||
    pathname === "/blocked" ||
    pathname.startsWith("/blocked/")
  );
}

async function loadPolicy(): Promise<GeoPolicy> {
  if (cachedPolicy && Date.now() - cachedPolicy.at < POLICY_TTL_MS) {
    return cachedPolicy.policy;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key || url.includes("placeholder")) {
    return DEFAULT_GEO_POLICY;
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/settings?key=eq.security_geo&select=value`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) return cachedPolicy?.policy || DEFAULT_GEO_POLICY;
    const rows = (await res.json()) as { value?: Partial<GeoPolicy> }[];
    const raw = rows?.[0]?.value || {};
    const policy: GeoPolicy = {
      ...DEFAULT_GEO_POLICY,
      ...raw,
      allowed_countries: Array.isArray(raw.allowed_countries)
        ? raw.allowed_countries.map((c) => String(c).toUpperCase())
        : DEFAULT_GEO_POLICY.allowed_countries,
    };
    cachedPolicy = { at: Date.now(), policy };
    return policy;
  } catch {
    return cachedPolicy?.policy || DEFAULT_GEO_POLICY;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isExemptPath(pathname)) return NextResponse.next();

  const country = countryFromHeaders(req.headers);
  const policy = await loadPolicy();
  const decision = evaluateGeoAccess(policy, country);

  if (policy.enabled && decision.reason === "monitor_pass") {
    void logEvent(req, "geo_monitor", country, pathname);
    return NextResponse.next();
  }

  if (!decision.allowed) {
    void logEvent(req, "geo_block", country, pathname);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Access from your region is not permitted.",
          code: "geo_restricted",
          country,
        },
        { status: 403 }
      );
    }
    const dest = req.nextUrl.clone();
    dest.pathname = "/blocked";
    dest.search = "";
    dest.searchParams.set("c", country || "unknown");
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

function logEvent(
  req: NextRequest,
  type: "geo_block" | "geo_monitor",
  country: string | null,
  path: string
) {
  try {
    const origin = req.nextUrl.origin;
    void fetch(`${origin}/api/security/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": clientIpFromHeaders(req.headers) || "",
        "user-agent": req.headers.get("user-agent") || "",
      },
      body: JSON.stringify({ type, country, path }),
    });
  } catch {
    /* ignore */
  }
}
