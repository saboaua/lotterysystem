"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe2, Shield, ShieldAlert, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase";
import { pullSetting, pushSetting } from "@/lib/cloud";
import { StaffPanel } from "./StaffPanel";
import {
  CARIBBEAN_PRESET,
  DEFAULT_GEO_POLICY,
  DUTCH_CARIBBEAN_PRESET,
  GEO_COUNTRY_CATALOG,
  countryLabel,
  type GeoPolicy,
  type SecurityEvent,
} from "@/lib/geo";

type SecTab = "staff" | "geo" | "events";

const card =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900";

export function SecurityPanel() {
  const { user, toast } = useStore();
  const [tab, setTab] = useState<SecTab>("staff");
  const [policy, setPolicy] = useState<GeoPolicy>(DEFAULT_GEO_POLICY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadPolicy = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    const res = await pullSetting<GeoPolicy>("security_geo");
    if (res.ok && res.data) {
      setPolicy({
        ...DEFAULT_GEO_POLICY,
        ...res.data,
        allowed_countries: Array.isArray(res.data.allowed_countries)
          ? res.data.allowed_countries.map((c) => String(c).toUpperCase())
          : DEFAULT_GEO_POLICY.allowed_countries,
      });
    }
    setLoaded(true);
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const sb = getSupabase();
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch("/api/security/event", { headers });
      const j = (await res.json()) as { ok?: boolean; items?: SecurityEvent[]; error?: string };
      if (j.ok && Array.isArray(j.items)) setEvents(j.items);
      else if (j.error) toast(j.error, true);
    } catch {
      toast("Could not load security events", true);
    } finally {
      setEventsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  useEffect(() => {
    if (tab === "events") void loadEvents();
  }, [tab, loadEvents]);

  if (user?.role !== "owner") {
    return (
      <div className={card + " text-sm text-slate-500"}>
        Only the owner can manage security settings.
      </div>
    );
  }

  async function savePolicy(next: GeoPolicy) {
    setSaving(true);
    const payload: GeoPolicy = {
      ...next,
      allowed_countries: [...new Set(next.allowed_countries.map((c) => c.toUpperCase()))],
      updated_at: new Date().toISOString(),
    };
    const res = await pushSetting("security_geo", payload);
    setSaving(false);
    if (res.ok === false) {
      toast(`Could not save geo policy: ${res.error}`, true);
      return;
    }
    setPolicy(payload);
    toast(
      payload.enabled
        ? `Geo fence ${payload.mode === "block" ? "ON (blocking)" : "ON (monitor only)"} · ${payload.allowed_countries.length} countries`
        : "Geo fence disabled — all regions allowed"
    );
  }

  function toggleCountry(code: string) {
    setPolicy((p) => {
      const has = p.allowed_countries.includes(code);
      return {
        ...p,
        allowed_countries: has
          ? p.allowed_countries.filter((c) => c !== code)
          : [...p.allowed_countries, code],
      };
    });
  }

  const tabs: { id: SecTab; label: string; icon: typeof Shield }[] = [
    { id: "staff", label: "Staff & roles", icon: Users },
    { id: "geo", label: "Geo fence", icon: Globe2 },
    { id: "events", label: "Security events", icon: ShieldAlert },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Security & access</h2>
        <p className="text-xs text-slate-500">
          Staff accounts, region restrictions, and intrusion / blocked-access attempts.
        </p>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold " +
                (tab === t.id
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300")
              }
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "staff" && <StaffPanel />}

      {tab === "geo" && (
        <div className="space-y-4">
          {!loaded && <p className="text-sm text-slate-500">Loading geo policy…</p>}
          {!isSupabaseConfigured && (
            <p className={card + " text-sm text-amber-700"}>
              Supabase is not connected — geo settings will not persist. Connect Supabase for production
              enforcement.
            </p>
          )}

          <div className={card + " space-y-4"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">Region restriction (geo fence)</h3>
                <p className="mt-1 text-xs text-slate-500">
                  When enabled, the edge middleware checks the visitor country (Vercel / Cloudflare IP
                  country header) and blocks or monitors access outside the allowlist. Attempts are
                  logged under Security events.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={policy.enabled}
                  onChange={(e) => setPolicy((p) => ({ ...p, enabled: e.target.checked }))}
                />
                Enabled
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-slate-500">
                Mode
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={policy.mode}
                  onChange={(e) =>
                    setPolicy((p) => ({ ...p, mode: e.target.value as GeoPolicy["mode"] }))
                  }
                  disabled={!policy.enabled}
                >
                  <option value="block">Block — refuse access outside allowlist</option>
                  <option value="monitor">Monitor — allow all, log out-of-region hits</option>
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={policy.allow_unknown}
                  onChange={(e) => setPolicy((p) => ({ ...p, allow_unknown: e.target.checked }))}
                  disabled={!policy.enabled}
                />
                Allow when country cannot be detected
              </label>
            </div>

            <label className="block text-[11px] font-semibold text-slate-500">
              Message on blocked page
              <input
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={policy.block_message || ""}
                onChange={(e) => setPolicy((p) => ({ ...p, block_message: e.target.value }))}
                placeholder="This system is only available in authorised regions."
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold dark:border-slate-600"
                onClick={() =>
                  setPolicy((p) => ({ ...p, allowed_countries: [...DUTCH_CARIBBEAN_PRESET] }))
                }
              >
                Preset: Dutch Caribbean
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold dark:border-slate-600"
                onClick={() =>
                  setPolicy((p) => ({ ...p, allowed_countries: [...CARIBBEAN_PRESET] }))
                }
              >
                Preset: Wider Caribbean
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold dark:border-slate-600"
                onClick={() => setPolicy((p) => ({ ...p, allowed_countries: [] }))}
              >
                Clear list
              </button>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-bold uppercase text-slate-400">
                Allowed countries ({policy.allowed_countries.length})
              </div>
              <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                {GEO_COUNTRY_CATALOG.map((c) => {
                  const on = policy.allowed_countries.includes(c.code);
                  return (
                    <label
                      key={c.code}
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs " +
                        (on
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                          : "border-slate-200 dark:border-slate-700")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleCountry(c.code)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="truncate text-slate-600 dark:text-slate-300">{c.name}</span>
                      <span className="ml-auto hidden text-[10px] text-slate-400 sm:inline">
                        {c.region}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving || !isSupabaseConfigured}
                onClick={() => void savePolicy(policy)}
                className="rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save geo policy"}
              </button>
              <span className="text-[11px] text-slate-500">
                Enforcement runs in Next.js middleware using CDN country headers. Changes apply within
                ~30s.
              </span>
            </div>
          </div>

          <div className={card + " space-y-1 text-xs text-slate-500"}>
            <p className="font-semibold text-slate-700 dark:text-slate-200">Best-practice notes</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Server-side middleware is the real control — client checks alone are easy to bypass.</li>
              <li>
                IP country is approximate (VPN / mobile roaming can look "foreign"). Prefer monitor mode
                first.
              </li>
              <li>
                Keep <code className="font-mono">allow unknown</code> on until you confirm headers work on
                Vercel.
              </li>
              <li>
                Blocked attempts are stored under settings key{" "}
                <code className="font-mono">security_events</code> and mirrored to audit when the service
                role key is set.
              </li>
            </ul>
          </div>
        </div>
      )}

      {tab === "events" && (
        <div className={card + " space-y-3"}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Security events</h3>
              <p className="text-xs text-slate-500">
                Blocked or monitored access attempts from outside the allowlist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold dark:border-slate-600"
            >
              Refresh
            </button>
          </div>
          {eventsLoading && <p className="text-sm text-slate-500">Loading…</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Country</th>
                  <th className="px-2 py-2">IP</th>
                  <th className="px-2 py-2">Path</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2 font-mono">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                          (e.type === "geo_block"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-800")
                        }
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-semibold">
                      {e.country ? `${countryLabel(e.country)} (${e.country})` : "—"}
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px]">{e.ip || "—"}</td>
                    <td className="px-2 py-2 font-mono text-[10px]">{e.path || "—"}</td>
                  </tr>
                ))}
                {!events.length && !eventsLoading && (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                      No security events yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityPanel;
