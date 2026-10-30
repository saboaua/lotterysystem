"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Download, Upload, Wifi } from "lucide-react";
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
  retailer_id?: string;
};

type IspSettings = {
  provider: string;
  /** Minutes between automatic presence refresh / optional speed log reminder */
  ping_frequency_min: number;
  samples: PingSample[];
};

const DEFAULT_SETTINGS: IspSettings = {
  provider: "SETAR",
  ping_frequency_min: 5,
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

function isOnline(iso?: string, windowMin = 10) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < windowMin * 60_000;
}

export function IspPanel() {
  const { toast, retailers, pingRetailer } = useStore();
  const [provider, setProvider] = useState(DEFAULT_SETTINGS.provider);
  const [pingFrequencyMin, setPingFrequencyMin] = useState(DEFAULT_SETTINGS.ping_frequency_min);
  const [samples, setSamples] = useState<PingSample[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pingMs, setPingMs] = useState("");
  const [down, setDown] = useState("");
  const [up, setUp] = useState("");
  const [loss, setLoss] = useState("0");
  const [note, setNote] = useState("");
  const [tick, setTick] = useState(0);

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
        setPingFrequencyMin(res.data.ping_frequency_min || 5);
        setSamples(Array.isArray(res.data.samples) ? res.data.samples : []);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (next: Partial<IspSettings> & { samples?: PingSample[] }) => {
      const payload: IspSettings = {
        provider: next.provider ?? provider,
        ping_frequency_min: next.ping_frequency_min ?? pingFrequencyMin,
        samples: next.samples ?? samples,
      };
      if (!isSupabaseConfigured) {
        toast("Supabase not configured — samples kept in this session only", true);
        return;
      }
      setSaving(true);
      const res = await pushSetting("isp_network", payload);
      setSaving(false);
      if (res.ok === false) {
        toast(`Could not save to Supabase: ${res.error}`, true);
        return;
      }
      toast("ISP data saved");
    },
    [provider, pingFrequencyMin, samples, toast]
  );

  useEffect(() => {
    const mins = Math.max(1, pingFrequencyMin || 5);
    const id = window.setInterval(() => {
      setTick((x) => x + 1);
      try {
        pingRetailer?.();
      } catch {
        /* optional */
      }
    }, mins * 60_000);
    const tickId = window.setInterval(() => setTick((x) => x + 1), 30_000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(tickId);
    };
  }, [pingFrequencyMin, pingRetailer]);

  const latest = samples[samples.length - 1];
  const avgPing = samples.reduce((s, x) => s + x.pingMs, 0) / (samples.length || 1);
  const avgDown = samples.reduce((s, x) => s + x.downloadMbps, 0) / (samples.length || 1);
  const avgUp = samples.reduce((s, x) => s + x.uploadMbps, 0) / (samples.length || 1);

  const presence = useMemo(() => {
    void tick;
    const list = retailers || [];
    const online = list.filter((r) => isOnline(r.last_seen, Math.max(pingFrequencyMin * 2, 10)));
    return {
      total: list.length,
      online: online.length,
      offline: list.length - online.length,
      rows: list
        .slice()
        .sort((a, b) => {
          const ta = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const tb = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          return tb - ta;
        }),
    };
  }, [retailers, pingFrequencyMin, tick]);

  const chart = useMemo(() => {
    if (!samples.length) return { maxPing: 1, maxBw: 1 };
    const maxPing = Math.max(...samples.map((s) => s.pingMs), 1);
    const maxBw = Math.max(...samples.map((s) => Math.max(s.downloadMbps, s.uploadMbps)), 1);
    return { maxPing, maxBw };
  }, [samples]);

  function addSample() {
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
    };
    const next = [...samples, sample].slice(-200);
    setSamples(next);
    setPingMs("");
    setDown("");
    setUp("");
    setNote("");
    void persist({ samples: next });
  }

  function saveFrequency() {
    const n = Math.max(1, Math.min(120, Math.round(pingFrequencyMin) || 5));
    setPingFrequencyMin(n);
    void persist({ ping_frequency_min: n, provider });
  }

  function importCsv(text: string) {
    const lines = text.trim().split(/\r?\n/).slice(1);
    const next: PingSample[] = [];
    for (const line of lines) {
      const [at, prov, ping, dl, ul, lossPct, n] = line.split(",").map((x) => x.trim());
      if (!at || !ping) continue;
      next.push({
        id: String(Date.now() + next.length),
        at,
        provider: prov || provider,
        pingMs: parseFloat(ping) || 0,
        downloadMbps: parseFloat(dl) || 0,
        uploadMbps: parseFloat(ul) || 0,
        lossPct: parseFloat(lossPct) || 0,
        note: n,
      });
    }
    if (!next.length) {
      toast("No rows found in CSV", true);
      return;
    }
    const merged = [...samples, ...next].slice(-200);
    setSamples(merged);
    void persist({ samples: merged });
  }

  function exportCsv() {
    const header = "at,provider,ping_ms,download_mbps,upload_mbps,loss_pct,note";
    const rows = samples.map(
      (s) =>
        `${s.at},${s.provider},${s.pingMs},${s.downloadMbps},${s.uploadMbps},${s.lossPct},${s.note || ""}`
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
            Retailer presence from live last_seen · speed samples saved to Supabase
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-500">
            Provider
            <input
              className="ml-1 h-9 w-28 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              onBlur={() => void persist({ provider })}
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">
            Ping every (min)
            <input
              type="number"
              min={1}
              max={120}
              className="ml-1 h-9 w-16 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
              value={pingFrequencyMin}
              onChange={(e) => setPingFrequencyMin(parseInt(e.target.value, 10) || 5)}
            />
          </label>
          <button
            type="button"
            onClick={saveFrequency}
            disabled={saving}
            className="h-9 rounded-full bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            Save settings
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                pingRetailer?.();
                setTick((x) => x + 1);
                toast("Presence refresh requested");
              } catch {
                toast("Ping not available", true);
              }
            }}
            className="h-9 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold"
          >
            <Wifi size={14} /> Ping now
          </button>
        </div>
      </div>

      {!loaded && (
        <p className="text-sm text-slate-500">Loading network settings…</p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Retailers online" value={`${presence.online} / ${presence.total}`} />
        <Kpi label="Offline" value={String(presence.offline)} />
        <Kpi label="Avg ping" value={samples.length ? `${avgPing.toFixed(0)} ms` : "—"} />
        <Kpi
          label="Avg down / up"
          value={
            samples.length
              ? `${avgDown.toFixed(1)} / ${avgUp.toFixed(1)} Mbps`
              : "—"
          }
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-bold">Retailer presence (last_seen)</h3>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-2 py-1.5">Shop</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {presence.rows.map((r) => {
                const on = isOnline(r.last_seen, Math.max(pingFrequencyMin * 2, 10));
                return (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5 font-semibold">{r.name || r.id}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                          (on
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500")
                        }
                      >
                        <span
                          className={
                            "h-1.5 w-1.5 rounded-full " + (on ? "bg-emerald-500" : "bg-slate-400")
                          }
                        />
                        {on ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{ageLabel(r.last_seen)}</td>
                  </tr>
                );
              })}
              {!presence.rows.length && (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-center text-slate-400">
                    No retailers yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Speed samples</h3>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold">
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
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold disabled:opacity-40"
            >
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-5">
          <input
            className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
            placeholder="Ping ms"
            value={pingMs}
            onChange={(e) => setPingMs(e.target.value)}
          />
          <input
            className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
            placeholder="Down Mbps"
            value={down}
            onChange={(e) => setDown(e.target.value)}
          />
          <input
            className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
            placeholder="Up Mbps"
            value={up}
            onChange={(e) => setUp(e.target.value)}
          />
          <input
            className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 text-sm"
            placeholder="Loss %"
            value={loss}
            onChange={(e) => setLoss(e.target.value)}
          />
          <button
            type="button"
            onClick={addSample}
            className="h-9 rounded-full bg-violet-600 text-xs font-bold text-white"
          >
            Add sample
          </button>
        </div>
        <input
          className="mb-4 h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm"
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {samples.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-400">Ping (ms)</div>
            <div className="flex h-24 items-end gap-0.5">
              {samples.slice(-40).map((s) => (
                <div
                  key={s.id + "-p"}
                  title={`${s.pingMs} ms @ ${s.at}`}
                  className="flex-1 rounded-t bg-violet-500/80"
                  style={{ height: `${Math.max(4, (s.pingMs / chart.maxPing) * 100)}%` }}
                />
              ))}
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Download / Upload</div>
            <div className="flex h-24 items-end gap-0.5">
              {samples.slice(-40).map((s) => (
                <div key={s.id + "-b"} className="flex flex-1 flex-col justify-end gap-0.5">
                  <div
                    title={`↓ ${s.downloadMbps} Mbps`}
                    className="rounded-t bg-emerald-500/80"
                    style={{
                      height: `${Math.max(2, (s.downloadMbps / chart.maxBw) * 50)}%`,
                    }}
                  />
                  <div
                    title={`↑ ${s.uploadMbps} Mbps`}
                    className="rounded-t bg-sky-500/80"
                    style={{ height: `${Math.max(2, (s.uploadMbps / chart.maxBw) * 50)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-48 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-2 py-1">When</th>
                <th className="px-2 py-1">Ping</th>
                <th className="px-2 py-1">Down</th>
                <th className="px-2 py-1">Up</th>
                <th className="px-2 py-1">Loss</th>
                <th className="px-2 py-1">Note</th>
              </tr>
            </thead>
            <tbody>
              {[...samples].reverse().slice(0, 50).map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1 font-mono text-[10px]">
                    {new Date(s.at).toLocaleString()}
                  </td>
                  <td className="px-2 py-1">{s.pingMs} ms</td>
                  <td className="px-2 py-1">{s.downloadMbps}</td>
                  <td className="px-2 py-1">{s.uploadMbps}</td>
                  <td className="px-2 py-1">{s.lossPct}%</td>
                  <td className="px-2 py-1 text-slate-500">{s.note || "—"}</td>
                </tr>
              ))}
              {!samples.length && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-slate-400">
                    No samples yet — add one or import CSV
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {latest && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <Activity size={12} /> Latest: {latest.pingMs} ms · ↓{latest.downloadMbps} / ↑
            {latest.uploadMbps} Mbps · {ageLabel(latest.at)}
          </p>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
