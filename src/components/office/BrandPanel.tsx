"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { LedScheduleMessage } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const SPEED_PRESETS = [
  { label: "Slow", value: 20 },
  { label: "Normal", value: 40 },
  { label: "Fast", value: 70 },
];

export function BrandPanel() {
  const { brand, updateBrand, toast } = useStore();
  const [manual, setManual] = useState(brand.led_message);

  const schedule = brand.led_schedule || [];
  const activeCount = schedule.filter((m) => m.enabled).length;

  const previewText = useMemo(() => {
    const parts = [manual];
    for (const m of schedule) {
      if (!m.enabled) continue;
      const today = new Date().toISOString().slice(0, 10);
      if (m.start && today < m.start) continue;
      if (m.end && today > m.end) continue;
      parts.push(m.text);
    }
    return parts.filter(Boolean).join("   ·   ") || "Ticker preview…";
  }, [manual, schedule]);

  const duration = Math.max(8, 120 / Math.max(10, brand.led_speed));

  function setSchedule(next: LedScheduleMessage[]) {
    updateBrand({ led_schedule: next });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Branding & message</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Lottery name
            <input
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              defaultValue={brand.name}
              onBlur={(e) => updateBrand({ name: e.target.value })}
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Tagline
            <input
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              defaultValue={brand.tagline}
              onBlur={(e) => updateBrand({ tagline: e.target.value })}
            />
          </label>
        </div>

        {/* Office / app logo */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--key)]/50 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
            Logo (back office & login)
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="" className="h-14 w-14 rounded-xl object-contain border border-[var(--line)] bg-white p-1" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-extrabold text-white">
                SL
              </div>
            )}
            <label className="cursor-pointer rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
              Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 400_000) return toast("Logo max 400KB", true);
                  updateBrand({ logo: await fileToDataUrl(f) });
                  toast("Logo saved");
                }}
              />
            </label>
            {brand.logo && (
              <button
                type="button"
                className="text-xs font-semibold text-rose-600"
                onClick={() => updateBrand({ logo: "" })}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <label className="text-[11px] font-semibold text-[var(--mut)] block">
          Manual ticker message (always on when LED is on)
          <input
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onBlur={() => updateBrand({ led_message: manual })}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={brand.led_on}
              onChange={(e) => updateBrand({ led_on: e.target.checked })}
            />
            LED on sell screen
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            LED color
            <input
              type="color"
              className="ml-2 h-8 w-14 rounded border border-[var(--line)]"
              value={brand.led_color}
              onChange={(e) => updateBrand({ led_color: e.target.value })}
            />
          </label>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">Ticker speed</div>
          <div className="flex flex-wrap gap-2">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => updateBrand({ led_speed: p.value })}
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                  brand.led_speed === p.value
                    ? "bg-indigo-600 text-white"
                    : "bg-[var(--key)] border border-[var(--line)]"
                }`}
              >
                {p.label}
              </button>
            ))}
            <input
              type="range"
              min={10}
              max={100}
              value={brand.led_speed}
              onChange={(e) => updateBrand({ led_speed: parseInt(e.target.value, 10) })}
              className="w-32"
            />
            <span className="text-xs text-[var(--mut)]">{brand.led_speed}</span>
          </div>
        </div>

        {/* Live ticker preview */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
            Sell-screen ticker preview
          </div>
          <div className="overflow-hidden rounded-xl border border-emerald-200 bg-slate-900 py-2.5">
            <div
              className="whitespace-nowrap text-sm font-semibold"
              style={{
                color: brand.led_color,
                animation: `led-marquee ${duration}s linear infinite`,
              }}
            >
              {previewText}&nbsp;&nbsp;&nbsp;{previewText}
            </div>
          </div>
          <style>{`
            @keyframes led-marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>

        <button
          type="button"
          onClick={() => {
            updateBrand({ led_message: manual });
            toast("Branding saved");
          }}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
        >
          Save branding
        </button>
      </div>

      {/* Scheduled messages */}
      <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">Scheduled ticker messages</h3>
            <p className="text-xs text-[var(--mut)]">{activeCount} active · appended to manual message</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSchedule([
                ...schedule,
                {
                  id: `led${Date.now().toString(36)}`,
                  label: "New message",
                  text: "Scheduled message",
                  enabled: true,
                },
              ])
            }
            className="flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus size={12} /> Add scheduled message
          </button>
        </div>
        {schedule.map((m, idx) => (
          <div key={m.id} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--key)]/40 p-3">
            <div className="flex items-center gap-2">
              <input
                className="h-9 flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm font-semibold"
                defaultValue={m.label}
                onBlur={(e) => {
                  const next = schedule.map((x, i) =>
                    i === idx ? { ...x, label: e.target.value } : x
                  );
                  setSchedule(next);
                }}
              />
              <label className="flex items-center gap-1 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={m.enabled}
                  onChange={(e) => {
                    const next = schedule.map((x, i) =>
                      i === idx ? { ...x, enabled: e.target.checked } : x
                    );
                    setSchedule(next);
                  }}
                />
                On
              </label>
              <button
                type="button"
                className="text-rose-600"
                onClick={() => setSchedule(schedule.filter((_, i) => i !== idx))}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
              defaultValue={m.text}
              placeholder="Message text"
              onBlur={(e) => {
                const next = schedule.map((x, i) =>
                  i === idx ? { ...x, text: e.target.value } : x
                );
                setSchedule(next);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                Start
                <input
                  type="date"
                  className="mt-0.5 h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                  defaultValue={m.start || ""}
                  onBlur={(e) => {
                    const next = schedule.map((x, i) =>
                      i === idx ? { ...x, start: e.target.value || undefined } : x
                    );
                    setSchedule(next);
                  }}
                />
              </label>
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                End
                <input
                  type="date"
                  className="mt-0.5 h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                  defaultValue={m.end || ""}
                  onBlur={(e) => {
                    const next = schedule.map((x, i) =>
                      i === idx ? { ...x, end: e.target.value || undefined } : x
                    );
                    setSchedule(next);
                  }}
                />
              </label>
            </div>
          </div>
        ))}
        {!schedule.length && (
          <p className="text-xs text-[var(--mut)]">No scheduled messages yet.</p>
        )}
      </div>
    </div>
  );
}
