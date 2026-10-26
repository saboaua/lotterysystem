"use client";

import { useEffect, useRef } from "react";
import type { Retailer } from "@/lib/types";

declare global {
  interface Window {
    L?: typeof import("leaflet");
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<NonNullable<typeof window.L>> {
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
    map: import("leaflet").Map;
    markers: import("leaflet").LayerGroup;
    L: NonNullable<typeof window.L>;
  } | null>(null);

  const withCoords = retailers.filter((r) => r.lat != null && r.lng != null);

  useEffect(() => {
    let cancelled = false;
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

        // Fix grey tiles when container was hidden at init
        setTimeout(() => map.invalidateSize(), 80);
      })
      .catch(() => {
        /* map unavailable offline */
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    const { map, markers, L } = ctx;
    markers.clearLayers();

    const latlngs: [number, number][] = [];
    for (const r of withCoords) {
      const lat = r.lat!;
      const lng = r.lng!;
      latlngs.push([lat, lng]);
      const online = isOnline(r, offlineAfterSec);
      const selected = r.id === selectedId;
      const color = !r.active ? "#f43f5e" : online ? "#10b981" : "#94a3b8";
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
      m.on("click", () => onSelect(r.id));
      m.bindTooltip(`#${r.number} ${r.name}${online ? " · Online" : " · Offline"}`, {
        direction: "top",
        offset: [0, -28],
      });
      markers.addLayer(m);
    }

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 14);
    } else if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36], maxZoom: 14 });
    } else {
      map.setView([12.52, -70.03], 11);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }, [withCoords, selectedId, offlineAfterSec, onSelect]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
      <div className="relative h-72 w-full bg-slate-200 dark:bg-slate-800">
        <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
        {!withCoords.length && (
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
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Inactive
        </span>
        <span className="ml-auto font-semibold">
          {withCoords.length} located · {withCoords.filter((r) => isOnline(r, offlineAfterSec)).length} online
        </span>
      </div>
      <p className="border-t border-[var(--line)] px-3 py-1.5 text-[10px] text-[var(--mut)]">
        Map data © OpenStreetMap contributors · Leaflet
      </p>
    </div>
  );
}
