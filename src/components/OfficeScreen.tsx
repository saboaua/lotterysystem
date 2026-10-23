"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Retailer } from "@/lib/types";

type Sub = "games" | "retailers" | "reports";

export function OfficeScreen() {
  const [sub, setSub] = useState<Sub>("games");
  const tabs: { id: Sub; label: string }[] = [
    { id: "games", label: "Games & schedule" },
    { id: "retailers", label: "Retailers" },
    { id: "reports", label: "Reports" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm ${
              sub === t.id
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                : "bg-[var(--card)] text-[var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {sub === "games" && <GamesPanel />}
        {sub === "retailers" && <RetailersPanel />}
        {sub === "reports" && <ReportsPanel />}
      </div>
    </div>
  );
}

function GamesPanel() {
  const { games, updateGame, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Games & schedule</h2>
          <p className="text-sm text-[var(--mut)]">
            Tap a row to expand. Readable list — not purple blocks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("Add game (wire to Supabase)")}
          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add game
        </button>
      </div>
      <div className="space-y-2">
        {games.map((g) => {
          const open = openId === g.id;
          return (
            <div
              key={g.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : g.id)}
                className="flex w-full items-center gap-3 bg-[var(--card)] px-4 py-3.5 text-left text-[var(--ink)]"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full shadow"
                  style={{ background: g.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{g.name}</span>
                  <span className="text-xs text-[var(--mut)]">
                    {g.format === "digit" ? `${g.digits}-digit` : g.format} · draw {g.draw_time} ·
                    cut {g.cutoff}
                    {g.jackpot_current != null
                      ? ` · pool AWG ${g.jackpot_current.toLocaleString()}`
                      : ""}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    g.enabled
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current" />
                  {g.enabled ? "Active" : "Disabled"}
                </span>
              </button>
              {open && (
                <div className="space-y-3 border-t border-[var(--line)] bg-[var(--key)]/50 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[var(--mut)]">
                      Name
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm text-[var(--ink)]"
                        defaultValue={g.name}
                        onBlur={(e) => updateGame(g.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--mut)]">
                      Color
                      <input
                        type="color"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)]"
                        defaultValue={g.color}
                        onChange={(e) => updateGame(g.id, { color: e.target.value })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--mut)]">
                      Draw time
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.draw_time}
                        onBlur={(e) => updateGame(g.id, { draw_time: e.target.value })}
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-[var(--ink)]">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={(e) => updateGame(g.id, { enabled: e.target.checked })}
                      />
                      Show on sell screen
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast("Game saved (demo)")}
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Save game
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RetailersPanel() {
  const { retailers, updateRetailer, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Retailers</h2>
          <p className="text-sm text-[var(--mut)]">
            Green = Active, Red = Disabled. Map shows Aruba distribution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("Add retailer (wire to Supabase)")}
          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add retailer
        </button>
      </div>

      <ArubaMap retailers={retailers} onSelect={setOpenId} />

      <div className="space-y-2">
        {retailers.map((r) => {
          const open = openId === r.id;
          const person = [r.first_name, r.last_name].filter(Boolean).join(" ");
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full items-center gap-3 bg-[var(--card)] px-4 py-3.5 text-left text-[var(--ink)]"
              >
                <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  #{r.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{r.name}</span>
                  <span className="block text-xs text-[var(--mut)]">
                    {person ? `${person} · ` : ""}
                    {r.phone ? `${r.phone} · ` : ""}
                    Sell {r.commission_sell}% · Redeem {r.commission_redeem}%
                  </span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    r.active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {r.active ? "Active" : "Disabled"}
                </span>
              </button>
              {open && (
                <div className="space-y-3 border-t border-[var(--line)] bg-[var(--key)]/50 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[var(--mut)]">
                      Shop name
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={r.name}
                        onBlur={(e) => updateRetailer(r.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--mut)]">
                      Phone
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={r.phone || ""}
                        onBlur={(e) => updateRetailer(r.id, { phone: e.target.value })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--mut)]">
                      Sell commission %
                      <input
                        type="number"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={r.commission_sell}
                        onBlur={(e) =>
                          updateRetailer(r.id, { commission_sell: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={r.active}
                        onChange={(e) => updateRetailer(r.id, { active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                  <label className="block text-xs font-semibold text-[var(--mut)]">
                    Address
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                      defaultValue={r.address || ""}
                      onBlur={(e) => updateRetailer(r.id, { address: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => toast("Retailer saved (demo)")}
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Save retailer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArubaMap({
  retailers,
  onSelect,
}: {
  retailers: Retailer[];
  onSelect: (id: string) => void;
}) {
  const latMin = 12.4,
    latMax = 12.62,
    lngMin = -70.07,
    lngMax = -69.86;
  const W = 420,
    H = 280,
    pad = 18;
  const proj = (lat: number, lng: number) => {
    const x = pad + ((lng - lngMin) / (lngMax - lngMin)) * (W - 2 * pad);
    const y = pad + ((latMax - lat) / (latMax - latMin)) * (H - 2 * pad);
    return [x, y] as const;
  };
  const outline =
    "M 80,40 L 120,28 L 180,22 L 240,30 L 300,55 L 340,95 L 360,140 L 355,180 L 330,220 L 280,250 L 220,255 L 160,245 L 110,220 L 75,180 L 60,130 L 55,90 Z";
  const nOn = retailers.filter((r) => r.active).length;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--key)] p-3">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <MapPin size={16} className="text-indigo-500" /> Aruba retailer map
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[340px]" role="img">
        <rect width={W} height={H} fill="#0ea5e910" rx="12" />
        <path d={outline} fill="#6366f122" stroke="#6366f1" strokeWidth="2" />
        <text x="90" y="120" fontSize="11" fill="currentColor" opacity="0.5">
          Oranjestad
        </text>
        <text x="300" y="200" fontSize="11" fill="currentColor" opacity="0.5">
          San Nicolas
        </text>
        <text x="200" y="50" fontSize="11" fill="currentColor" opacity="0.5">
          Noord / Palm Beach
        </text>
        {retailers
          .filter((r) => r.lat != null && r.lng != null)
          .map((r) => {
            const [x, y] = proj(r.lat!, r.lng!);
            return (
              <g
                key={r.id}
                className="cursor-pointer"
                onClick={() => onSelect(r.id)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={7}
                  fill={r.active ? "#10b981" : "#f43f5e"}
                  stroke="#fff"
                  strokeWidth={1.5}
                >
                  <title>
                    #{r.number} {r.name}
                    {"\n"}
                    {r.address}
                  </title>
                </circle>
              </g>
            );
          })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--mut)]">
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Active ({nOn})
        </span>
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
          Disabled ({retailers.length - nOn})
        </span>
        <span>Total {retailers.length}</span>
      </div>
    </div>
  );
}

function ReportsPanel() {
  const { currency } = useStore();
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="text-xl font-bold">Reports</h2>
      <p className="mt-1 text-sm text-[var(--mut)]">
        Demo KPIs — connect Supabase tickets table for live data.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Tickets today", "0"],
          ["Sales", `${currency} 0.00`],
          ["Commission", `${currency} 0.00`],
          ["Net", `${currency} 0.00`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[var(--key)] p-3">
            <div className="text-[10px] uppercase text-[var(--mut)]">{k}</div>
            <div className="text-lg font-bold">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
