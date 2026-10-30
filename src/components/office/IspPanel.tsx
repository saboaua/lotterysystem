"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Download, Globe, Upload, Wifi } from "lucide-react";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { pullSetting, pushSetting } from "@/lib/cloud";

type PingSample = {
  id: string;
  at: string;
  provider: string;
  pingMs: number;
  downloadMbps: number;
  uploadMbps: number;
  lossPct: number;
  note?: string;
  /** Public IP observed when sample was logged */
  publicIp?: string;
};

type IspSettings = {
  provider: string;
  samples: PingSample[];
  /** Last known public IP from a connectivity check */
  last_public_ip?: string;
  last_check_at?: string;
  last_latency_ms?: number;
};

const DEFAULT_SETTINGS: IspSettings = {
  provider: "SETAR",
  samples: [],
};

function ageLabel(iso?: string) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

/** Lightweight latency probe (HTTP RTT to a public endpoint). */
async function measureLatencyMs(rounds = 3): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < rounds; i++) {
    const t0 = performance.now();
    try {
      await fetch(`https://www.cloudflare.com/cdn-cgi/trace?_=${Date.now()}-${i}`, {
        cache: "no-store",
        mode: "cors",
      });
      times.push(performance.now() - t0);
    } catch {
      times.push(9999);
    }
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(times.length / 2)] || 0);
}

async function fetchPublicIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { ip?: string };
    return j.ip || null;
  } catch {
    try {
      const r2 = await fetch("https://icanhazip.com", { cache: "no-store" });
      if (!r2.ok) return null;
      return (await r2.text()).trim() || null;
    } catch {
      return null;
    }
  }
}

export function IspPanel() {
  const { toast } = useStore();
  const [provider, setProvider] = useState(DEFAULT_SETTINGS.provider);
  const [samples, setSamples] = useState<PingSample[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [lastCheckAt, setLastCheckAt] = useState<string | undefined>();
  const [lastLatencyMs, setLastLatencyMs] = useState<number | undefined>();
  const [pingMs, setPingMs] = useState("");
  const [down, setDown] = useState("");
  const [up, setUp] = useState("");
  const [loss, setLoss] = useState("0");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured) {
        setLoaded(true);
        return;
      }
      const res = await pullSetting<IspSettings>("isp_network");
      if (cancelled) return;
      if (res.ok && res.data) {
        setProvider(res.data.provider || "SETAR");
        setSamples(Array.isArray(res.data.samples) ? res.data.samples : []);
        if (res.data.last_public_ip) setPublicIp(res.data.last_public_ip);
        if (res.data.last_check_at) setLastCheckAt(res.data.last_check_at);
        if (res.data.last_latency_ms != null) setLastLatencyMs(res.data.last_latency_ms);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (next: Partial<IspSettings>) => {
      const payload: IspSettings = {
        provider: next.provider ?? provider,
        samples: next.samples ?? samples,
        last_public_ip: next.last_public_ip ?? publicIp ?? undefined,
        last_check_at: next.last_check_at ?? lastCheckAt,
        last_latency_ms: next.last_latency_ms ?? lastLatencyMs,
      };
      if (!isSupabaseConfigured) {
        toast("Supabase not configured — data kept in this session only", true);
        return false;
      }
      setSaving(true);
      const res = await pushSetting("isp_network", payload);
      setSaving(false);
      if (res.ok === false) {
        toast(`Could not save to Supabase: ${res.error}`, true);
        return false;
      }
      return true;
    },
    [provider, samples, publicIp, lastCheckAt, lastLatencyMs, toast]
  );

  const runConnectivityCheck = useCallback(async () => {
    setChecking(true);
    try {
      const [ip, latency] = await Promise.all([fetchPublicIp(), measureLatencyMs(3)]);
      const at = new Date().toISOString();
      setPublicIp(ip);
      setLastLatencyMs(latency);
      setLastCheckAt(at);
      const ok = await persist({
        last_public_ip: ip || undefined,
        last_check_at: at,
        last_latency_ms: latency,
      });
      if (ok) {
        toast(
          ip
            ? `Connected · IP ${ip} · latency ~${latency} ms`
            : `Latency ~${latency} ms (IP lookup failed)`
        );
      }
      if (latency && latency < 5000) setPingMs(String(latency));
    } catch {
      toast("Connectivity check failed", true);
    } finally {
      setChecking(false);
    }
  }, [persist, toast]);

  useEffect(() => {
    if (!loaded) return;
    void runConnectivityCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const latest = samples[samples.length - 1];
  const avgPing = samples.reduce((s, x) => s + x.pingMs, 0) / (samples.length || 1);
  const avgDown = samples.reduce((s, x) => s + x.downloadMbps, 0) / (samples.length || 1);
  const avgUp = samples.reduce((s, x) => s + x.uploadMbps, 0) / (samples.length || 1);

  const chart = useMemo(() => {
    if (!samples.length) return { maxPing: 1, maxBw: 1 };
    const maxPing = Math.max(...samples.map((s) => s.pingMs), 1);
    const maxBw = Math.max(...samples.map((s) => Math.max(s.downloadMbps, s.uploadMbps)), 1);
    return { maxPing, maxBw };
  }, [samples]);

  async function addSample() {
    const p = parseFloat(pingMs);
    const d = parseFloat(down);
    const u = parseFloat(up);
    if (!p || !d || !u) {
      toast("Enter ping, download and upload", true);
      return;
    }
    const sample: PingSample = {
      id: String(Date.now()),
      at: new Date().toISOString(),
      provider,
      pingMs: p,
      downloadMbps: d,
      uploadMbps: u,
      lossPct: parseFloat(loss) || 0,
      note: note || undefined,
      publicIp: publicIp || undefined,
    };
    const next = [...samples, sample].slice(-200);
    setSamples(next);
    setPingMs("");
    setDown("");
    setUp("");
    setNote("");
    const ok = await persist({ samples: next, provider });
    if (ok) toast("Speed sample saved to Supabase");
  }

  async function saveProvider() {
    const ok = await persist({ provider });
    if (ok) toast("Provider saved");
  }

  function importCsv(text: string) {
    const lines = text.trim().split(/\r?\n/).slice(1);
    const next: PingSample[] = [];
    for (const line of lines) {
      const [at, prov, ping, dl, ul, lossPct, n, ip] = line.split(",").map((x) => x.trim());
      if (!at || !ping) continue;
      next.push({
        id: String(Date.now() + next.length),
        at,
        provider: prov || provider,
        pingMs: parseFloat(ping) || 0,
        downloadMbps: parseFloat(dl) || 0,
        uploadMbps: parseFloat(ul) || 0,
        lossPct: parseFloat(lossPct) || 0,
        note: n || undefined,
        publicIp: ip || undefined,
      });
    }
    if (!next.length) {
      toast("No rows found in CSV", true);
      return;
    }
    const merged = [...samples, ...next].slice(-200);
    setSamples(merged);
    void persist({ samples: merged }).then((ok) => {
      if (ok) toast(`Imported ${next.length} sample(s)`);
    });
  }

  function exportCsv() {
    const header = "at,provider,ping_ms,download_mbps,upload_mbps,loss_pct,note,public_ip";
    const rows = samples.map(
      (s) =>
        `${s.at},${s.provider},${s.pingMs},${s.downloadMbps},${s.uploadMbps},${s.lossPct},${s.note || ""},${s.publicIp || ""}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isp-ping-${provider.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">ISP / network</h2>
          <p className="text-xs text-slate-500">
            Monitor internet quality for your ISP (ping, download, upload). Samples and IP checks
            are saved to Supabase.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-500">
            Provider
            <input
              className="ml-1 h-9 w-28 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              onBlur={() => void saveProvider()}
            />
          </label>
          <button
            type="button"
            onClick={() => void runConnectivityCheck()}
            disabled={checking}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
          >
            <Globe size={14} />
            {checking ? "Checking…" : "Check connection"}
          </button>
          <button
            type="button"
            onClick={() => void persist({ provider, samples })}
            disabled={saving}
            className="h-9 rounded-full bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save to cloud"}
          </button>
        </div>
      </div>

      {!loaded && <p className="text-sm text-slate-500">Loading ISP settings…</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Live connection</h3>
          <span className="text-[11px] text-slate-500">
            Last check: {ageLabel(lastCheckAt)}
            {isSupabaseConfigured ? " · synced" : " · local only"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">Public IP</div>
            <div className="font-mono text-sm font-bold">{publicIp || "—"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">Latency (probe)</div>
            <div className="text-sm font-extrabold">
              {lastLatencyMs != null ? `${lastLatencyMs} ms` : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">ISP</div>
            <div className="text-sm font-extrabold">{provider}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={Wifi} label="Provider" value={provider} />
        <Stat icon={Activity} label="Avg ping" value={samples.length ? `${avgPing.toFixed(0)} ms` : "—"} />
        <Stat icon={Download} label="Avg download" value={samples.length ? `${avgDown.toFixed(1)} Mbps` : "—"} />
        <Stat icon={Upload} label="Avg upload" value={samples.length ? `${avgUp.toFixed(1)} Mbps` : "—"} />
      </div>

      {latest && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          Latest sample: <b>{new Date(latest.at).toLocaleString()}</b> · ping {latest.pingMs} ms · ↓{" "}
          {latest.downloadMbps} Mbps · ↑ {latest.uploadMbps} Mbps · loss {latest.lossPct}%
          {latest.publicIp ? ` · IP ${latest.publicIp}` : ""}
        </div>
      )}

      {samples.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 text-xs font-bold uppercase text-slate-500">Ping (ms)</div>
            <div className="flex h-40 items-end gap-1">
              {samples.slice(-40).map((s) => (
                <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-violet-500/80"
                    style={{ height: `${Math.max(4, (s.pingMs / chart.maxPing) * 100)}%` }}
                    title={`${s.pingMs} ms @ ${s.at}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Bandwidth (Mbps)</span>
              <span className="font-normal normal-case">
                <span className="text-sky-600">↓ down</span> ·{" "}
                <span className="text-amber-600">↑ up</span>
              </span>
            </div>
            <div className="flex h-40 items-end gap-1">
              {samples.slice(-40).map((s) => (
                <div key={s.id} className="flex flex-1 items-end gap-0.5">
                  <div
                    className="flex-1 rounded-t bg-sky-500/80"
                    style={{
                      height: `${Math.max(4, (s.downloadMbps / chart.maxBw) * 100)}%`,
                    }}
                    title={`↓ ${s.downloadMbps}`}
                  />
                  <div
                    className="flex-1 rounded-t bg-amber-500/80"
                    style={{
                      height: `${Math.max(4, (s.uploadMbps / chart.maxBw) * 100)}%`,
                    }}
                    title={`↑ ${s.uploadMbps}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Log speed test</h3>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold dark:border-slate-600">
              <Upload size={12} /> Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  importCsv(await f.text());
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!samples.length}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold disabled:opacity-40 dark:border-slate-600"
            >
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-5">
          <label className="text-[11px] font-semibold text-slate-500">
            Ping (ms)
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={pingMs}
              onChange={(e) => setPingMs(e.target.value)}
              placeholder="e.g. 22"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Download Mbps
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={down}
              onChange={(e) => setDown(e.target.value)}
              placeholder="e.g. 94"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Upload Mbps
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={up}
              onChange={(e) => setUp(e.target.value)}
              placeholder="e.g. 22"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Loss %
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={loss}
              onChange={(e) => setLoss(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void addSample()}
              className="h-10 w-full rounded-full bg-violet-600 text-xs font-bold text-white"
            >
              Save sample
            </button>
          </div>
        </div>
        <input
          className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="Optional note (e.g. evening peak, outage)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="mt-2 text-[10px] text-slate-500">
          Run a speed test (e.g. speedtest.net or your ISP tool), enter the numbers, and save. Public
          IP from the live check is attached to each sample. CSV: at, provider, ping_ms,
          download_mbps, upload_mbps, loss_pct, note, public_ip
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Ping</th>
              <th className="px-3 py-2">↓ Mbps</th>
              <th className="px-3 py-2">↑ Mbps</th>
              <th className="px-3 py-2">Loss</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {[...samples]
              .reverse()
              .slice(0, 50)
              .map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-3 py-2 font-mono">{new Date(s.at).toLocaleString()}</td>
                  <td className="px-3 py-2">{s.provider}</td>
                  <td className="px-3 py-2">{s.pingMs} ms</td>
                  <td className="px-3 py-2">{s.downloadMbps}</td>
                  <td className="px-3 py-2">{s.uploadMbps}</td>
                  <td className="px-3 py-2">{s.lossPct}%</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{s.publicIp || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{s.note || "—"}</td>
                </tr>
              ))}
            {!samples.length && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  No samples yet — check connection, then log a speed test
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wifi;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
        <Icon size={12} /> {label}
      </div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
