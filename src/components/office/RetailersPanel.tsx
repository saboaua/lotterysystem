"use client";

import { useMemo, useState } from "react";
import { MapPin, Plus, Radio } from "lucide-react";
import { useStore } from "@/lib/store";
import { OsmMap } from "./OsmMap";
import type { Retailer } from "@/lib/types";

function isOnline(r: Retailer, offlineAfterSec: number): boolean {
  if (!r.last_seen) return false;
  const age = (Date.now() - new Date(r.last_seen).getTime()) / 1000;
  return age <= offlineAfterSec;
}

function formatAgo(iso?: string): string {
  if (!iso) return "never";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return sec + "s ago";
  if (sec < 3600) return Math.floor(sec / 60) + "m ago";
  if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
  return Math.floor(sec / 86400) + "d ago";
}

export function RetailersPanel() {
  const { retailers, updateRetailer, addRetailer, toast, brand, updateBrand } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pingInterval = brand.ping_interval_sec ?? 60;
  const offlineAfter = brand.offline_after_sec ?? Math.max(120, pingInterval * 3);

  const onlineCount = useMemo(
    () => retailers.filter((r) => r.active && isOnline(r, offlineAfter)).length,
    [retailers, offlineAfter]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Retailers</h2>
          <p className="text-xs text-[var(--mut)]">
            Map · presence ping · {onlineCount} online now
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const r = addRetailer({
              number: String(retailers.length + 1).padStart(3, "0"),
              name: "New shop",
              commission_sell: 10,
              commission_redeem: 2,
              active: true,
              lat: 12.52,
              lng: -70.03,
            });
            setOpenId(r.id);
            setSelectedId(r.id);
            toast("Retailer added");
          }}
          className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--mut)]">
            <Radio size={14} className="text-emerald-500" />
            POS presence ping
          </div>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Frequency (seconds)
            <select
              className="ml-2 h-8 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
              value={pingInterval}
              onChange={(e) =>
                updateBrand({ ping_interval_sec: parseInt(e.target.value, 10) || 60 })
              }
            >
              <option value={15}>Every 15s</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
              <option value={120}>Every 2 min</option>
              <option value={300}>Every 5 min</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Offline after (seconds)
            <input
              type="number"
              min={30}
              className="ml-2 h-8 w-24 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
              value={offlineAfter}
              onChange={(e) =>
                updateBrand({ offline_after_sec: parseInt(e.target.value, 10) || 180 })
              }
            />
          </label>
        </div>
        <p className="mb-3 text-[11px] text-[var(--mut)]">
          When a seller POS is open it pings base at this interval; base acknowledges (last_ack).
          Shops with no ping within the offline window show as offline on the map.
        </p>
      </div>

      <OsmMap
        retailers={retailers}
        selectedId={selectedId || openId}
        offlineAfterSec={offlineAfter}
        onSelect={(id) => {
          setSelectedId(id);
          setOpenId(id);
        }}
      />

      <div className="space-y-2">
        {retailers.map((r) => {
          const open = openId === r.id;
          const online = isOnline(r, offlineAfter);
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm"
            >
              <button
                type="button"
                onClick={() => {
                  setOpenId(open ? null : r.id);
                  setSelectedId(r.id);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                  #{r.number}
                </span>
                <span className="min-w-0 flex-1 text-sm font-bold">{r.name}</span>
                {r.lat != null && r.lng != null && (
                  <span className="hidden items-center gap-1 text-[10px] text-[var(--mut)] sm:flex">
                    <MapPin size={10} />
                    {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    !r.active
                      ? "bg-rose-500/15 text-rose-600"
                      : online
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-slate-500/15 text-slate-600"
                  }`}
                >
                  {!r.active ? "Off" : online ? "Online" : "Offline"}
                </span>
                <span className="hidden text-[10px] text-[var(--mut)] md:inline">
                  ping {formatAgo(r.last_seen)}
                </span>
              </button>
              {open && (
                <div className="grid gap-3 border-t border-[var(--line)] bg-[var(--key)]/40 px-4 py-4 sm:grid-cols-2">
                  <Field label="Name" defaultValue={r.name} onBlur={(v) => updateRetailer(r.id, { name: v })} />
                  <Field label="Phone" defaultValue={r.phone || ""} onBlur={(v) => updateRetailer(r.id, { phone: v })} />
                  <Field
                    label="Address"
                    defaultValue={r.address || ""}
                    onBlur={(v) => updateRetailer(r.id, { address: v })}
                  />
                  <Field
                    label="Sell %"
                    defaultValue={String(r.commission_sell)}
                    onBlur={(v) => updateRetailer(r.id, { commission_sell: parseFloat(v) || 0 })}
                  />
                  <Field
                    label="Redeem %"
                    defaultValue={String(r.commission_redeem)}
                    onBlur={(v) => updateRetailer(r.id, { commission_redeem: parseFloat(v) || 0 })}
                  />
                  <Field
                    label="Latitude"
                    defaultValue={r.lat != null ? String(r.lat) : ""}
                    onBlur={(v) => updateRetailer(r.id, { lat: v ? parseFloat(v) : undefined })}
                  />
                  <Field
                    label="Longitude"
                    defaultValue={r.lng != null ? String(r.lng) : ""}
                    onBlur={(v) => updateRetailer(r.id, { lng: v ? parseFloat(v) : undefined })}
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) => updateRetailer(r.id, { active: e.target.checked })}
                    />
                    Active
                  </label>
                  <div className="text-[11px] text-[var(--mut)] sm:col-span-2">
                    Last ping: {r.last_seen ? new Date(r.last_seen).toLocaleString() : "never"}
                    {" · "}
                    Base ack: {r.last_ack ? new Date(r.last_ack).toLocaleString() : "—"}
                  </div>
                  {r.lat != null && r.lng != null && (
                    <a
                      className="text-xs font-bold text-indigo-600 sm:col-span-2"
                      href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=16/${r.lat}/${r.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View pin on OpenStreetMap →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => toast("Saved")}
                    className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white sm:col-span-2"
                  >
                    Save
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

function Field({
  label,
  defaultValue,
  onBlur,
}: {
  label: string;
  defaultValue?: string;
  onBlur?: (v: string) => void;
}) {
  return (
    <label className="text-[11px] font-semibold text-[var(--mut)]">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm text-[var(--ink)]"
        defaultValue={defaultValue}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      />
    </label>
  );
}
