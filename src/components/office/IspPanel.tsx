"use client";

import { useMemo, useState } from "react";
import { Activity, Download, Upload, Wifi } from "lucide-react";
import { useStore } from "@/lib/store";

type PingSample = {
  id: string;
  at: string;
  provider: string;
  pingMs: number;
  downloadMbps: number;
  uploadMbps: number;
  lossPct: number;
  note?: string;
};

const DEMO: PingSample[] = [
  {
    id: "1",
    at: "2026-10-25T08:00:00",
    provider: "SETAR",
    pingMs: 18,
    downloadMbps: 94.2,
    uploadMbps: 22.1,
    lossPct: 0,
  },
  {
    id: "2",
    at: "2026-10-25T10:00:00",
    provider: "SETAR",
    pingMs: 24,
    downloadMbps: 88.5,
    uploadMbps: 19.4,
    lossPct: 0.2,
  },
  {
    id: "3",
    at: "2026-10-25T12:00:00",
    provider: "SETAR",
    pingMs: 31,
    downloadMbps: 76.0,
    uploadMbps: 17.8,
    lossPct: 0.5,
  },
  {
    id: "4",
    at: "2026-10-25T14:00:00",
    provider: "SETAR",
    pingMs: 22,
    downloadMbps: 91.3,
    uploadMbps: 21.0,
    lossPct: 0,
  },
  {
    id: "5",
    at: "2026-10-25T16:00:00",
    provider: "SETAR",
    pingMs: 45,
    downloadMbps: 52.4,
    uploadMbps: 12.2,
    lossPct: 1.2,
  },
  {
    id: "6",
    at: "2026-10-25T18:00:00",
    provider: "SETAR",
    pingMs: 28,
    downloadMbps: 85.1,
    uploadMbps: 20.5,
    lossPct: 0.1,
  },
];

export function IspPanel() {
  const { toast } = useStore();
  const [provider, setProvider] = useState("SETAR");
  const [samples, setSamples] = useState<PingSample[]>(DEMO);
  const [pingMs, setPingMs] = useState("");
  const [down, setDown] = useState("");
  const [up, setUp] = useState("");
  const [loss, setLoss] = useState("0");
  const [note, setNote] = useState("");

  const latest = samples[samples.length - 1];
  const avgPing = samples.reduce((s, x) => s + x.pingMs, 0) / (samples.length || 1);
  const avgDown = samples.reduce((s, x) => s + x.downloadMbps, 0) / (samples.length || 1);
  const avgUp = samples.reduce((s, x) => s + x.uploadMbps, 0) / (samples.length || 1);

  const chart = useMemo(() => {
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
    setSamples((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        at: new Date().toISOString(),
        provider,
        pingMs: p,
        downloadMbps: d,
        uploadMbps: u,
        lossPct: parseFloat(loss) || 0,
        note: note || undefined,
      },
    ]);
    setPingMs("");
    setDown("");
    setUp("");
    setNote("");
    toast("Ping sample saved");
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
    setSamples((prev) => [...prev, ...next]);
    toast(`Imported ${next.length} sample(s)`);
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
            Upload &amp; download speed summary, ping tests, and simple graphs for shop connectivity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-800">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                importCsv(await f.text());
              }}
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={Wifi} label="Provider" value={provider} />
        <Stat icon={Activity} label="Avg ping" value={`${avgPing.toFixed(0)} ms`} />
        <Stat icon={Download} label="Avg download" value={`${avgDown.toFixed(1)} Mbps`} />
        <Stat icon={Upload} label="Avg upload" value={`${avgUp.toFixed(1)} Mbps`} />
      </div>

      {latest && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          Latest: <b>{new Date(latest.at).toLocaleString()}</b> · ping {latest.pingMs} ms · ↓{" "}
          {latest.downloadMbps} Mbps · ↑ {latest.uploadMbps} Mbps · loss {latest.lossPct}%
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 text-xs font-bold uppercase text-slate-500">Ping (ms)</div>
          <div className="flex h-40 items-end gap-1.5">
            {samples.map((s) => (
              <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-violet-500/80"
                  style={{ height: `${(s.pingMs / chart.maxPing) * 100}%`, minHeight: 4 }}
                  title={`${s.pingMs} ms`}
                />
                <span className="text-[9px] text-slate-400">
                  {new Date(s.at).getHours()}:00
                </span>
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
          <div className="flex h-40 items-end gap-1.5">
            {samples.map((s) => (
              <div key={s.id} className="flex flex-1 items-end gap-0.5">
                <div
                  className="flex-1 rounded-t bg-sky-500/80"
                  style={{
                    height: `${(s.downloadMbps / chart.maxBw) * 100}%`,
                    minHeight: 4,
                  }}
                  title={`↓ ${s.downloadMbps}`}
                />
                <div
                  className="flex-1 rounded-t bg-amber-500/80"
                  style={{
                    height: `${(s.uploadMbps / chart.maxBw) * 100}%`,
                    minHeight: 4,
                  }}
                  title={`↑ ${s.uploadMbps}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 text-sm font-bold">Log ping / speed test</div>
        <div className="grid gap-2 sm:grid-cols-5">
          <label className="text-[11px] font-semibold text-slate-500">
            Provider
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </label>
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
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="h-10 min-w-[200px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            onClick={addSample}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white"
          >
            Save sample
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          CSV columns: at, provider, ping_ms, download_mbps, upload_mbps, loss_pct, note
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
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {[...samples].reverse().map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-2 font-mono">{new Date(s.at).toLocaleString()}</td>
                <td className="px-3 py-2">{s.provider}</td>
                <td className="px-3 py-2">{s.pingMs} ms</td>
                <td className="px-3 py-2">{s.downloadMbps}</td>
                <td className="px-3 py-2">{s.uploadMbps}</td>
                <td className="px-3 py-2">{s.lossPct}%</td>
                <td className="px-3 py-2 text-slate-500">{s.note || "-"}</td>
              </tr>
            ))}
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
