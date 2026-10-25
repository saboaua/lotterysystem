"use client";

import { useMemo } from "react";
import type { Retailer } from "@/lib/types";

/** Free OpenStreetMap embed + marker list (no API key). */
export function OsmMap({
  retailers,
  onSelect,
  selectedId,
}: {
  retailers: Retailer[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
}) {
  const withCoords = retailers.filter((r) => r.lat != null && r.lng != null);
  const focus = withCoords.find((r) => r.id === selectedId) || withCoords[0];

  const bbox = useMemo(() => {
    // Aruba approx bounds
    const pad = 0.08;
    const lat = focus?.lat ?? 12.52;
    const lng = focus?.lng ?? -70.03;
    return `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;
  }, [focus?.lat, focus?.lng]);

  const marker = focus ? `${focus.lat}%2C${focus.lng}` : "12.52%2C-70.03";
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${marker}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
      <div className="relative h-64 w-full bg-slate-200 dark:bg-slate-800">
        <iframe
          title="Retailer map — OpenStreetMap"
          className="h-full w-full border-0"
          src={embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="max-h-40 space-y-1 overflow-auto border-t border-[var(--line)] p-2">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-[var(--mut)]">
          OpenStreetMap · {withCoords.length} located shops
        </p>
        {withCoords.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${
              selectedId === r.id ? "bg-indigo-600 text-white" : "hover:bg-[var(--key)]"
            }`}
          >
            <span className="font-semibold">
              #{r.number} {r.name}
            </span>
            <span className="font-mono opacity-70">
              {r.lat?.toFixed(3)}, {r.lng?.toFixed(3)}
            </span>
          </button>
        ))}
        {!withCoords.length && (
          <p className="px-2 py-2 text-xs text-[var(--mut)]">
            No coordinates yet — set lat/lng on a retailer to pin the map.
          </p>
        )}
      </div>
      <p className="border-t border-[var(--line)] px-3 py-1.5 text-[10px] text-[var(--mut)]">
        Map data © OpenStreetMap contributors · free tiles
      </p>
    </div>
  );
}
