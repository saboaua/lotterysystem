"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Retailer, RetailerStatus } from "@/lib/types";

// Leaflet is loaded from CDN at runtime (no npm dependency).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletNS = any;

declare global {
  interface Window {
    L?: LeafletNS;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<LeafletNS> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    if (window.L) {
      resolve(window.L);
      return;
    }
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet failed"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet failed"));
    };
    script.onerror = () => reject(new Error("Leaflet load error"));
    document.body.appendChild(script);
  });
}

function resolveStatus(r: Retailer): RetailerStatus {
  if (r.status) return r.status;
  return r.active ? "active" : "disabled";
}

function isOnline(r: Retailer, offlineAfterSec: number): boolean {
  if (!r.last_seen) return false;
  const age = (Date.now() - new Date(r.last_seen).getTime()) / 1000;
  return age <= offlineAfterSec;
}

/** OpenStreetMap via Leaflet — real multi-pin map aligned to coordinates. */
export function OsmMap({
  retailers,
  onSelect,
  selectedId,
  offlineAfterSec = 180,
}: {
  retailers: Retailer[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  offlineAfterSec?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{
    map: LeafletNS;
    markers: LeafletNS;
    L: LeafletNS;
  } | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onSelectRef = useRef(onSelect);
  const fittedKey = useRef("");
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const withCoords = useMemo(
    () => retailers.filter((r) => r.lat != null && r.lng != null),
    [retailers]
  );

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        if (mapRef.current) return;

        const map = L.map(containerRef.current, {
          scrollWheelZoom: true,
          attributionControl: true,
        }).setView([12.52, -70.03], 11);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const markers = L.layerGroup().addTo(map);
        mapRef.current = { map, markers, L };

        // Keep tiles/pins aligned if the panel is resized or revealed after mount
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(() => map.invalidateSize());
          ro.observe(containerRef.current);
        }
        setTimeout(() => map.invalidateSize(), 80);
        // Library finished loading AFTER first render: trigger the pin effect
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      ro?.disconnect();
      if (mapRef.current) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx || !ready) return;
    const { map, markers, L } = ctx;
    markers.clearLayers();

    const latlngs: [number, number][] = [];
    for (const r of withCoords) {
      const lat = r.lat!;
      const lng = r.lng!;
      latlngs.push([lat, lng]);
      const online = isOnline(r, offlineAfterSec);
      const st = resolveStatus(r);
      const selected = r.id === selectedId;
      // active+online green, active+offline gray, suspended amber, disabled rose
      const color =
        st === "disabled"
          ? "#f43f5e"
          : st === "suspended"
            ? "#f59e0b"
            : online
              ? "#10b981"
              : "#94a3b8";
      const statusLabel =
        st === "disabled"
          ? "Disabled"
          : st === "suspended"
            ? "Suspended"
            : online
              ? "Online"
              : "Offline";
      const icon = L.divIcon({
        className: "",
        html:
          `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">` +
          `<svg width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="#0f172a" stroke-width="1">` +
          `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>` +
          `</svg>` +
          `<span style="background:#fff;color:#0f172a;font:700 9px system-ui;padding:1px 4px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.25);` +
          (selected ? "outline:2px solid #4f46e5;" : "") +
          `">#${r.number}</span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const m = L.marker([lat, lng], { icon });
      m.on("click", () => onSelectRef.current(r.id));
      m.bindTooltip(`#${r.number} ${r.name} · ${statusLabel}`, {
        direction: "top",
        offset: [0, -28],
      });
      markers.addLayer(m);
    }

    // Re-frame only when the set of located retailers changes (not on every selection)
    const key = withCoords.map((r) => `${r.id}:${r.lat},${r.lng}`).join("|");
    if (key !== fittedKey.current) {
      fittedKey.current = key;
      if (latlngs.length === 1) {
        map.setView(latlngs[0], 14);
      } else if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36], maxZoom: 14 });
      } else {
        map.setView([12.52, -70.03], 11);
      }
    }
    setTimeout(() => map.invalidateSize(), 50);
  }, [ready, withCoords, selectedId, offlineAfterSec]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
      <div className="relative h-72 w-full bg-slate-200 dark:bg-slate-800">
        <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
        {failed && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-200/90 px-4 text-center text-xs text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
            The map library could not be loaded (offline or blocked). Check the internet connection and reload.
          </div>
        )}
        {!failed && !withCoords.length && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-slate-200/80 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            No coordinates yet — set lat/lng on a retailer to pin the map.
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] px-3 py-2 text-[10px] text-[var(--mut)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> Offline
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Suspended
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Disabled
        </span>
        <span className="ml-auto font-semibold">
          {withCoords.length} located ·{" "}
          {withCoords.filter((r) => isOnline(r, offlineAfterSec) && resolveStatus(r) === "active").length} online
        </span>
      </div>
      <p className="border-t border-[var(--line)] px-3 py-1.5 text-[10px] text-[var(--mut)]">
        Map data © OpenStreetMap contributors · Leaflet · demo pins from retailer list
      </p>
    </div>
  );
}
