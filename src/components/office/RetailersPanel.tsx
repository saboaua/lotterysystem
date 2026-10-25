"use client";

import { useMemo, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Retailer } from "@/lib/types";

/** Aruba approx bounds for OSM embed */
const ARUBA = { south: 12.41, west: -70.07, north: 12.63, east: -69.86 };

export function RetailersPanel() {
  const { retailers, updateRetailer, addRetailer, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false);

  const active = retailers.filter((r) => r.active && r.lat != null && r.lng != null);

  const bbox = useMemo(() => {
    if (!active.length) {
      return `${ARUBA.west},${ARUBA.south},${ARUBA.east},${ARUBA.north}`;
    }
    const lats = active.map((r) => r.lat!);
    const lngs = active.map((r) => r.lng!);
    const pad = 0.02;
    return `${Math.min(...lngs) - pad},${Math.min(...lats) - pad},${Math.max(...lngs) + pad},${Math.max(...lats) + pad}`;
  }, [active]);

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Retailers</h2>
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
            toast("Retailer added");
          }}
          className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* OpenStreetMap embed */}
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--mut)]">
            <MapPin size={14} className="text-emerald-500" />
            OpenStreetMap · Aruba
          </div>
          <a
            href={`https://www.openstreetmap.org/#map=12/12.52/-70.0`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-indigo-600"
          >
            Open full map
          </a>
        </div>
        <div className="relative aspect-[16/9] w-full bg-slate-200 dark:bg-slate-800">
          <iframe
            title="OpenStreetMap retailers"
            className="absolute inset-0 h-full w-full border-0"
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] p-3">
          {active.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenId(r.id)}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--key)] px-2.5 py-1 text-[11px] font-semibold hover:border-indigo-400"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              #{r.number} {r.name}
            </button>
          ))}
          {!active.length && (
            <span className="text-xs text-[var(--mut)]">Set lat/lng on a retailer to show on map.</span>
          )}
        </div>
        <p className="px-3 pb-3 text-[10px] text-[var(--mut)]">
          Map data © OpenStreetMap contributors. Edit lat/lng below or paste coordinates from{" "}
          <a className="text-indigo-600 underline" href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">
            openstreetmap.org
          </a>
          .
        </p>
      </div>

      <div className="space-y-2">
        {retailers.map((r) => {
          const open = openId === r.id;
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                  #{r.number}
                </span>
                <span className="min-w-0 flex-1 text-sm font-bold">{r.name}</span>
                {r.lat != null && r.lng != null && (
                  <span className="hidden text-[10px] text-[var(--mut)] sm:inline">
                    {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.active
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-rose-500/15 text-rose-600"
                  }`}
                >
                  {r.active ? "Active" : "Off"}
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
                    onBlur={(v) =>
                      updateRetailer(r.id, { lat: v ? parseFloat(v) : undefined })
                    }
                  />
                  <Field
                    label="Longitude"
                    defaultValue={r.lng != null ? String(r.lng) : ""}
                    onBlur={(v) =>
                      updateRetailer(r.id, { lng: v ? parseFloat(v) : undefined })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) => updateRetailer(r.id, { active: e.target.checked })}
                    />
                    Active
                  </label>
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
