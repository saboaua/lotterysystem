"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  publicIp?: string;
  auto?: boolean;
};

type IspSettings = {
  provider: string;
  samples: PingSample[];
  last_public_ip?: string;
  last_check_at?: string;
  last_latency_ms?: number;
  last_download_mbps?: number;
  last_upload_mbps?: number;
  auto_interval_min: number;
  auto_enabled: boolean;
};

const DEFAULT_SETTINGS: IspSettings = {
  provider: "SETAR",
  samples: [],
  auto_interval_min: 15,
  auto_enabled: true,
};

const MAX_SAMPLES = 200;
const CHART_H = 160; // px bar area

function ageLabel(iso?: string) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function measureLatencyMs(rounds = 4): Promise<{ median: number; lossPct: number }> {
  const times: number[] = [];
  let fails = 0;
  for (let i = 0; i < rounds; i++) {
    const t0 = performance.now();
    try {
      await fetch(`https://www.cloudflare.com/cdn-cgi/trace?_=${Date.now()}-${i}`, {
        cache: "no-store",
        mode: "cors",
      });
      times.push(performance.now() - t0);
    } catch {
      fails += 1;
      times.push(9999);
    }
  }
  const ok = times.filter((t) => t < 9000).sort((a, b) => a - b);
  const median = ok.length ? Math.round(ok[Math.floor(ok.length / 2)]) : 9999;
  const lossPct = Math.round((fails / rounds) * 1000) / 10;
  return { median, lossPct };
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

function toMbps(bytes: number, ms: number): number {
  if (ms <= 0) return 0;
  return Math.round(((bytes * 8) / (ms / 1000) / 1_000_000) * 10) / 10;
}

/** Download probe — try Cloudflare, then a public test file. */
async function measureDownloadMbps(): Promise<number | null> {
  const attempts: { url: string; bytes: number }[] = [
    { url: `https://speed.cloudflare.com/__down?bytes=1000000&_=${Date.now()}`, bytes: 1_000_000 },
    {
      url: `https://proof.ovh.net/files/1Mb.dat?_=${Date.now()}`,
      bytes: 1_048_576,
    },
  ];
  for (const a of attempts) {
    const t0 = performance.now();
    try {
      const r = await fetch(a.url, { cache: "no-store", mode: "cors" });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      const ms = performance.now() - t0;
      const n = toMbps(buf.byteLength || a.bytes, ms);
      if (n > 0) return n;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Upload probe — POST payload to Cloudflare speed up, fallback httpbin. */
async function measureUploadMbps(): Promise<number | null> {
  const bytes = 512_000;
  const body = new Blob([new Uint8Array(bytes)]);
  const targets = [
    `https://speed.cloudflare.com/__up?_=${Date.now()}`,
    "https://httpbin.org/post",
  ];
  for (const url of targets) {
    const t0 = performance.now();
    try {
      const r = await fetch(url, {
        method: "POST",
        body,
        mode: "cors",
        cache: "no-store",
      });
      await r.arrayBuffer().catch(() => undefined);
      const ms = performance.now() - t0;
      const n = toMbps(bytes, ms);
      if (n > 0) return n;
    } catch {
      /* try next */
    }
  }
  return null;
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
  const [lastDown, setLastDown] = useState<number | undefined>();
  const [lastUp, setLastUp] = useState<number | undefined>();
  const [autoEnabled, setAutoEnabled] = useState(DEFAULT_SETTINGS.auto_enabled);
  const [autoIntervalMin, setAutoIntervalMin] = useState(DEFAULT_SETTINGS.auto_interval_min);
  const [pingMs, setPingMs] = useState("");
  const [down, setDown] = useState("");
  const [up, setUp] = useState("");
  const [loss, setLoss] = useState("0");
  const [note, setNote] = useState("");

  const stateRef = useRef({
    provider,
    samples,
    publicIp,
    lastCheckAt,
    lastLatencyMs,
    lastDown,
    lastUp,
    autoEnabled,
    autoIntervalMin,
  });
  stateRef.current = {
    provider,
    samples,
    publicIp,
    lastCheckAt,
    lastLatencyMs,
    lastDown,
    lastUp,
    autoEnabled,
    autoIntervalMin,
  };

  const persistFull = useCallback(
    async (payload: IspSettings) => {
      if (!isSupabaseConfigured) return false;
      setSaving(true);
      const res = await pushSetting("isp_network", payload);
      setSaving(false);
      if (res.ok === false) {
        toast(`Could not save to Supabase: ${res.error}`, true);
        return false;
      }
      return true;
    },
    [toast]
  );

  const buildPayload = useCallback((overrides: Partial<IspSettings> = {}): IspSettings => {
    const s = stateRef.current;
    return {
      provider: overrides.provider ?? s.provider,
      samples: overrides.samples ?? s.samples,
      last_public_ip: overrides.last_public_ip ?? s.publicIp ?? undefined,
      last_check_at: overrides.last_check_at ?? s.lastCheckAt,
      last_latency_ms: overrides.last_latency_ms ?? s.lastLatencyMs,
      last_download_mbps: overrides.last_download_mbps ?? s.lastDown,
      last_upload_mbps: overrides.last_upload_mbps ?? s.lastUp,
      auto_interval_min: overrides.auto_interval_min ?? s.autoIntervalMin,
      auto_enabled: overrides.auto_enabled ?? s.autoEnabled,
    };
  }, []);

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
        const loadedSamples = Array.isArray(res.data.samples) ? res.data.samples : [];
        setSamples(loadedSamples);
        if (res.data.last_public_ip) setPublicIp(res.data.last_public_ip);
        if (res.data.last_check_at) setLastCheckAt(res.data.last_check_at);
        if (res.data.last_latency_ms != null) setLastLatencyMs(res.data.last_latency_ms);
        if (res.data.last_download_mbps != null) setLastDown(res.data.last_download_mbps);
        if (res.data.last_upload_mbps != null) setLastUp(res.data.last_upload_mbps);
        if (typeof res.data.auto_interval_min === "number") {
          setAutoIntervalMin(Math.max(0, Math.min(120, res.data.auto_interval_min)));
        }
        if (typeof res.data.auto_enabled === "boolean") setAutoEnabled(res.data.auto_enabled);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCheck = useCallback(
    async (opts?: { silent?: boolean; measureBw?: boolean }) => {
      setChecking(true);
      try {
        const measureBw = opts?.measureBw !== false;
        const [ip, lat] = await Promise.all([fetchPublicIp(), measureLatencyMs(4)]);
        let downMbps: number | null = null;
        let upMbps: number | null = null;
        if (measureBw) {
          downMbps = await measureDownloadMbps();
          upMbps = await measureUploadMbps();
        }
        const at = new Date().toISOString();
        const sample: PingSample = {
          id: `${Date.now()}`,
          at,
          provider: stateRef.current.provider,
          pingMs: lat.median,
          downloadMbps: downMbps ?? 0,
          uploadMbps: upMbps ?? 0,
          lossPct: lat.lossPct,
          note: opts?.silent ? "auto" : "manual check",
          publicIp: ip || undefined,
          auto: !!opts?.silent,
        };
        const nextSamples = [...stateRef.current.samples, sample].slice(-MAX_SAMPLES);
        setPublicIp(ip);
        setLastLatencyMs(lat.median);
        setLastCheckAt(at);
        setSamples(nextSamples);
        if (downMbps != null) setLastDown(downMbps);
        if (upMbps != null) setLastUp(upMbps);
        if (lat.median < 5000) setPingMs(String(lat.median));
        if (downMbps != null && downMbps > 0) setDown(String(downMbps));
        if (upMbps != null && upMbps > 0) setUp(String(upMbps));

        const payload = buildPayload({
          samples: nextSamples,
          last_public_ip: ip || undefined,
          last_check_at: at,
          last_latency_ms: lat.median,
          last_download_mbps: downMbps ?? stateRef.current.lastDown,
          last_upload_mbps: upMbps ?? stateRef.current.lastUp,
        });
        const ok = await persistFull(payload);
        if (!opts?.silent) {
          const parts = [`${lat.median} ms`];
          if (downMbps != null) parts.push(`↓ ${downMbps} Mbps`);
          if (upMbps != null) parts.push(`↑ ${upMbps} Mbps`);
          if (ip) parts.push(ip);
          if (ok) toast(`Logged · ${parts.join(" · ")}`);
          else if (!isSupabaseConfigured) toast("Sample kept in session (Supabase not configured)", true);
          else toast(`Logged locally · ${parts.join(" · ")} (cloud save failed)`, true);
        }
      } catch {
        if (!opts?.silent) toast("Connectivity check failed", true);
      } finally {
        setChecking(false);
      }
    },
    [buildPayload, persistFull, toast]
  );

  useEffect(() => {
    if (!loaded) return;
    void runCheck({ silent: false, measureBw: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !autoEnabled || autoIntervalMin < 1) return;
    const ms = Math.max(1, autoIntervalMin) * 60_000;
    const id = window.setInterval(() => {
      void runCheck({ silent: true, measureBw: true });
    }, ms);
    return () => window.clearInterval(id);
  }, [loaded, autoEnabled, autoIntervalMin, runCheck]);

  const latest = samples[samples.length - 1];
  const history = samples.slice(-40);

  const avgPing = samples.length
    ? samples.reduce((s, x) => s + x.pingMs, 0) / samples.length
    : 0;
  const downSamples = samples.filter((x) => x.downloadMbps > 0);
  const upSamples = samples.filter((x) => x.uploadMbps > 0);
  const avgDown = downSamples.length
    ? downSamples.reduce((s, x) => s + x.downloadMbps, 0) / downSamples.length
    : 0;
  const avgUp = upSamples.length
    ? upSamples.reduce((s, x) => s + x.uploadMbps, 0) / upSamples.length
    : 0;

  const chart = useMemo(() => {
    if (!history.length) return { maxPing: 1, maxBw: 1 };
    const pings = history.map((s) => (s.pingMs < 9000 ? s.pingMs : 0));
    const maxPing = Math.max(...pings, 1);
    const maxBw = Math.max(
      ...history.map((s) => Math.max(s.downloadMbps || 0, s.uploadMbps || 0)),
      1
    );
    return { maxPing, maxBw };
  }, [history]);

  async function addManualSample() {
    const p = parseFloat(pingMs);
    const d = parseFloat(down);
    const u = parseFloat(up);
    if (!p || Number.isNaN(p)) {
      toast("Enter at least ping (ms)", true);
      return;
    }
    const sample: PingSample = {
      id: String(Date.now()),
      at: new Date().toISOString(),
      provider,
      pingMs: p,
      downloadMbps: Number.isFinite(d) ? d : 0,
      uploadMbps: Number.isFinite(u) ? u : 0,
      lossPct: parseFloat(loss) || 0,
      note: note || "manual",
      publicIp: publicIp || undefined,
      auto: false,
    };
    const next = [...samples, sample].slice(-MAX_SAMPLES);
    setSamples(next);
    if (sample.downloadMbps > 0) setLastDown(sample.downloadMbps);
    if (sample.uploadMbps > 0) setLastUp(sample.uploadMbps);
    setLastLatencyMs(sample.pingMs);
    setLastCheckAt(sample.at);
    setNote("");
    const payload = buildPayload({
      samples: next,
      provider,
      last_latency_ms: sample.pingMs,
      last_check_at: sample.at,
      last_download_mbps: sample.downloadMbps || stateRef.current.lastDown,
      last_upload_mbps: sample.uploadMbps || stateRef.current.lastUp,
    });
    const ok = await persistFull(payload);
    if (ok) toast("Sample saved to history");
    else if (!isSupabaseConfigured) toast("Sample kept in session only", true);
  }

  async function saveSchedule() {
    const n = Math.max(0, Math.min(120, Math.round(autoIntervalMin) || 0));
    setAutoIntervalMin(n);
    const ok = await persistFull(
      buildPayload({ auto_interval_min: n, auto_enabled: autoEnabled, provider })
    );
    if (ok) {
      toast(
        autoEnabled && n > 0 ? `Auto-check every ${n} min — saved` : "Auto-check off — saved"
      );
    }
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
    const merged = [...samples, ...next].slice(-MAX_SAMPLES);
    setSamples(merged);
    void persistFull(buildPayload({ samples: merged })).then((ok) => {
      if (ok) toast(`Imported ${next.length} into history`);
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
    a.download = `isp-history-${provider.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearHistory() {
    if (!window.confirm("Clear all ISP history samples?")) return;
    setSamples([]);
    await persistFull(buildPayload({ samples: [] }));
    toast("History cleared");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">ISP / network</h2>
          <p className="text-xs text-slate-500">
            Ping, download & upload history for your ISP. Auto-checks run on a schedule and save to
            Supabase.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-500">
            Provider
            <input
              className="ml-1 h-9 w-28 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              onBlur={() => void persistFull(buildPayload({ provider }))}
            />
          </label>
          <button
            type="button"
            onClick={() => void runCheck({ silent: false, measureBw: true })}
            disabled={checking}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
          >
            <Globe size={14} />
            {checking ? "Testing…" : "Run test now"}
          </button>
        </div>
      </div>

      {!loaded && <p className="text-sm text-slate-500">Loading ISP history…</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-2 text-sm font-bold">Automatic check schedule</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={autoEnabled}
              onChange={(e) => setAutoEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Enabled
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Every (minutes)
            <input
              type="number"
              min={1}
              max={120}
              className="ml-1 h-9 w-20 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={autoIntervalMin || ""}
              onChange={(e) => setAutoIntervalMin(parseInt(e.target.value, 10) || 0)}
              disabled={!autoEnabled}
            />
          </label>
          <button
            type="button"
            onClick={() => void saveSchedule()}
            disabled={saving}
            className="h-9 rounded-full bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            Save schedule
          </button>
          <span className="text-[11px] text-slate-500">
            {autoEnabled && autoIntervalMin > 0
              ? `Auto every ${autoIntervalMin} min while this page is open`
              : "Auto-check is off"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Live connection</h3>
          <span className="text-[11px] text-slate-500">
            Last check: {ageLabel(lastCheckAt)}
            {isSupabaseConfigured ? " · cloud" : " · local"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">Public IP</div>
            <div className="font-mono text-sm font-bold">{publicIp || "—"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">Latency</div>
            <div className="text-sm font-extrabold">
              {lastLatencyMs != null ? `${lastLatencyMs} ms` : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">Last ↓ / ↑</div>
            <div className="text-sm font-extrabold">
              {lastDown != null || lastUp != null
                ? `${lastDown != null ? lastDown : "—"} / ${lastUp != null ? lastUp : "—"} Mbps`
                : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">History</div>
            <div className="text-sm font-extrabold">{samples.length} samples</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={Wifi} label="Provider" value={provider} />
        <Stat icon={Activity} label="Avg ping" value={samples.length ? `${avgPing.toFixed(0)} ms` : "—"} />
        <Stat
          icon={Download}
          label="Avg download"
          value={downSamples.length ? `${avgDown.toFixed(1)} Mbps` : "—"}
        />
        <Stat
          icon={Upload}
          label="Avg upload"
          value={upSamples.length ? `${avgUp.toFixed(1)} Mbps` : "—"}
        />
      </div>

      {latest && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          Latest: <b>{new Date(latest.at).toLocaleString()}</b> · {latest.pingMs} ms
          {` · ↓ ${latest.downloadMbps} Mbps`}
          {` · ↑ ${latest.uploadMbps} Mbps`}
          {latest.publicIp ? ` · ${latest.publicIp}` : ""}
          {latest.auto ? " · auto" : " · manual"}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-bold uppercase text-slate-500">Ping history (ms)</div>
            <span className="text-[10px] text-slate-400">{history.length} points</span>
          </div>
          {history.length ? (
            <div className="flex items-end gap-1" style={{ height: CHART_H }}>
              {history.map((s) => {
                const val = s.pingMs >= 9000 ? chart.maxPing : s.pingMs;
                const px = Math.max(4, Math.round((val / chart.maxPing) * CHART_H));
                return (
                  <div key={s.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                    <div
                      className={
                        "w-full max-w-[28px] rounded-t " +
                        (s.pingMs >= 9000 ? "bg-rose-500" : "bg-violet-500")
                      }
                      style={{ height: px }}
                      title={`${s.pingMs} ms · ${new Date(s.at).toLocaleString()}`}
                    />
                    <span className="mt-1 max-w-full truncate text-[8px] leading-none text-slate-400">
                      {formatClock(s.at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center justify-center text-sm text-slate-400"
              style={{ height: CHART_H }}
            >
              No history yet — run a test
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Bandwidth history</span>
            <span className="font-normal normal-case">
              <span className="text-sky-600">↓ down</span> ·{" "}
              <span className="text-amber-600">↑ up</span>
            </span>
          </div>
          {history.length ? (
            <div className="flex items-end gap-1" style={{ height: CHART_H }}>
              {history.map((s) => {
                const dPx = Math.max(
                  s.downloadMbps > 0 ? 6 : 2,
                  Math.round((s.downloadMbps / chart.maxBw) * CHART_H)
                );
                const uPx = Math.max(
                  s.uploadMbps > 0 ? 6 : 2,
                  Math.round((s.uploadMbps / chart.maxBw) * CHART_H)
                );
                return (
                  <div
                    key={s.id}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <div className="flex w-full max-w-[28px] items-end gap-0.5">
                      <div
                        className="flex-1 rounded-t bg-sky-500"
                        style={{ height: dPx }}
                        title={`↓ ${s.downloadMbps} Mbps · ${new Date(s.at).toLocaleString()}`}
                      />
                      <div
                        className="flex-1 rounded-t bg-amber-500"
                        style={{ height: uPx }}
                        title={`↑ ${s.uploadMbps} Mbps · ${new Date(s.at).toLocaleString()}`}
                      />
                    </div>
                    <span className="mt-1 max-w-full truncate text-[8px] leading-none text-slate-400">
                      {formatClock(s.at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center justify-center text-sm text-slate-400"
              style={{ height: CHART_H }}
            >
              No history yet — run a test
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Manual speed test entry</h3>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold dark:border-slate-600">
              Import CSV
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
              className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold disabled:opacity-40 dark:border-slate-600"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => void clearHistory()}
              disabled={!samples.length}
              className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-700 disabled:opacity-40"
            >
              Clear history
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
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Download Mbps
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={down}
              onChange={(e) => setDown(e.target.value)}
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Upload Mbps
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={up}
              onChange={(e) => setUp(e.target.value)}
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
              onClick={() => void addManualSample()}
              className="h-10 w-full rounded-full bg-violet-600 text-xs font-bold text-white"
            >
              Add to history
            </button>
          </div>
        </div>
        <input
          className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="mt-2 text-[10px] text-slate-500">
          Tip: enter real speedtest numbers for accurate ↑ upload history. Auto tests estimate both
          directions when the browser allows it.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Source</th>
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
              .slice(0, 80)
              .map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-3 py-2 font-mono">{new Date(s.at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {s.auto ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        auto
                      </span>
                    ) : (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        manual
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{s.pingMs} ms</td>
                  <td className="px-3 py-2 font-semibold">{s.downloadMbps}</td>
                  <td className="px-3 py-2 font-semibold">{s.uploadMbps}</td>
                  <td className="px-3 py-2">{s.lossPct}%</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{s.publicIp || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{s.note || "—"}</td>
                </tr>
              ))}
            {!samples.length && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  No history yet
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
