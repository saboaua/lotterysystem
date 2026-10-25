"use client";

import { useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, GameSession, TicketScheduleMessage } from "@/lib/types";
import { PromosPanel } from "./office/PromosPanel";
import { ResultsPanel } from "./office/ResultsPanel";
import { OsmMap } from "./office/OsmMap";

type Sub =
  | "games"
  | "brand"
  | "ticket"
  | "promos"
  | "results"
  | "reports"
  | "retailers";

const TABS: { id: Sub; label: string }[] = [
  { id: "games", label: "Games & schedule" },
  { id: "brand", label: "Branding & message" },
  { id: "ticket", label: "Ticket design" },
  { id: "promos", label: "Promotions" },
  { id: "results", label: "Results & holidays" },
  { id: "reports", label: "Reports" },
  { id: "retailers", label: "Retailers" },
];

const WEEKDAYS = [
  { d: 0, label: "Sun" },
  { d: 1, label: "Mon" },
  { d: 2, label: "Tue" },
  { d: 3, label: "Wed" },
  { d: 4, label: "Thu" },
  { d: 5, label: "Fri" },
  { d: 6, label: "Sat" },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function OfficeScreen() {
  const [sub, setSub] = useState<Sub>("games");
  const { brand } = useStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-2">
        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo} alt="Logo" className="h-9 w-9 rounded-lg object-contain" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-extrabold text-white">
            SL
          </div>
        )}
        <div>
          <div className="text-sm font-extrabold">{brand.name}</div>
          <div className="text-[11px] text-[var(--mut)]">Owner back office</div>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm ${
              sub === t.id ? "bg-indigo-600 text-white" : "bg-[var(--card)] text-[var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {sub === "games" && <GamesPanel />}
        {sub === "brand" && <BrandPanel />}
        {sub === "ticket" && <TicketDesignPanel />}
        {sub === "promos" && <PromosPanel />}
        {sub === "results" && <ResultsPanel />}
        {sub === "reports" && <ReportsPanel />}
        {sub === "retailers" && <RetailersPanel />}
      </div>
    </div>
  );
}

function GamesPanel() {
  const { games, betTypes, updateGame, updateBetType, addGame, deleteGame, toast, currency } =
    useStore();
  const [openId, setOpenId] = useState<string | null>(games[0]?.id ?? null);

  function onAddGame() {
    const id = `game_${Date.now().toString(36)}`;
    const g: Game = {
      id,
      name: "New game",
      color: "#6366f1",
      format: "digit",
      digits: 4,
      draw_time: "13:00",
      cutoff: "12:45",
      enabled: true,
      draw_days: [1, 2, 3, 4, 5, 6],
      min_stake: 0.5,
      max_stake: 100,
      bet_types: ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"],
    };
    addGame(g);
    setOpenId(id);
    toast("Game added");
  }

  function addSession(g: Game) {
    const sessions = [...(g.sessions || [])];
    const n = sessions.length + 1;
    sessions.push({
      id: `s${Date.now().toString(36)}`,
      label: `Draw ${n}`,
      draw_time: "19:00",
      cutoff: "18:45",
    });
    updateGame(g.id, { sessions });
  }

  function updateSession(g: Game, sid: string, patch: Partial<GameSession>) {
    updateGame(g.id, {
      sessions: (g.sessions || []).map((s) => (s.id === sid ? { ...s, ...patch } : s)),
    });
  }

  function removeSession(g: Game, sid: string) {
    updateGame(g.id, { sessions: (g.sessions || []).filter((s) => s.id !== sid) });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Games & schedule</h2>
          <p className="text-xs text-[var(--mut)]">
            Logo on sell tiles · weekday schedule · multi-draw times · min/max stake (digit games)
          </p>
        </div>
        <button
          type="button"
          onClick={onAddGame}
          className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add game
        </button>
      </div>
      <div className="space-y-2">
        {games.map((g) => {
          const open = openId === g.id;
          return (
            <div key={g.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : g.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {g.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{g.name}</span>
                  <span className="text-[11px] text-[var(--mut)]">
                    {g.format} · {g.draw_time}
                    {g.sessions?.length ? ` · ${g.sessions.length} draws/day` : ""}
                    {g.min_stake != null ? ` · min ${currency} ${g.min_stake}` : ""}
                  </span>
                </span>
                <span className="text-[var(--mut)]">{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div className="space-y-4 border-t border-[var(--line)] bg-[var(--key)]/40 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Name" defaultValue={g.name} onBlur={(v) => updateGame(g.id, { name: v })} />
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Format
                      <select
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        value={g.format}
                        onChange={(e) => updateGame(g.id, { format: e.target.value as Game["format"] })}
                      >
                        <option value="digit">Digit number</option>
                        <option value="zodiac">Zodiac</option>
                        <option value="whe">Play Whe</option>
                        <option value="jackpot">Jackpot</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={(e) => updateGame(g.id, { enabled: e.target.checked })}
                      />{" "}
                      Show on sell
                    </label>
                    <Field label="Primary draw time" defaultValue={g.draw_time} onBlur={(v) => updateGame(g.id, { draw_time: v })} />
                    <Field label="Cut-off" defaultValue={g.cutoff} onBlur={(v) => updateGame(g.id, { cutoff: v })} />
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Color
                      <input
                        type="color"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)]"
                        value={g.color}
                        onChange={(e) => updateGame(g.id, { color: e.target.value })}
                      />
                    </label>
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">Sell-screen logo</div>
                    <div className="flex flex-wrap items-center gap-3">
                      {g.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.logo} alt="" className="h-12 w-12 rounded-xl border object-cover" />
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
                        <Upload size={14} /> Upload logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const url = await readFileAsDataUrl(f);
                            updateGame(g.id, { logo: url });
                            toast("Logo set");
                          }}
                        />
                      </label>
                      {g.logo && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600"
                          onClick={() => updateGame(g.id, { logo: "" })}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">
                      Days of week available
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((w) => {
                        const days = g.draw_days ?? [0, 1, 2, 3, 4, 5, 6];
                        const on = days.includes(w.d);
                        return (
                          <button
                            key={w.d}
                            type="button"
                            onClick={() => {
                              const set = new Set(days);
                              if (set.has(w.d)) set.delete(w.d);
                              else set.add(w.d);
                              updateGame(g.id, { draw_days: [...set].sort() });
                            }}
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              on ? "bg-indigo-600 text-white" : "bg-[var(--card)]"
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-[var(--mut)]">
                        Draws per day (extra sessions)
                      </div>
                      <button
                        type="button"
                        onClick={() => addSession(g)}
                        className="rounded-full bg-indigo-600/15 px-3 py-1 text-[11px] font-bold text-indigo-700"
                      >
                        + Add draw
                      </button>
                    </div>
                    {(g.sessions || []).length === 0 && (
                      <p className="text-xs text-[var(--mut)]">
                        Using primary draw time only. Add sessions for AM/PM or multiple daily draws.
                      </p>
                    )}
                    <div className="space-y-2">
                      {(g.sessions || []).map((s) => (
                        <div key={s.id} className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] p-2 sm:grid-cols-4">
                          <Field label="Label" defaultValue={s.label} onBlur={(v) => updateSession(g, s.id, { label: v })} />
                          <Field label="Draw" defaultValue={s.draw_time} onBlur={(v) => updateSession(g, s.id, { draw_time: v })} />
                          <Field label="Cutoff" defaultValue={s.cutoff} onBlur={(v) => updateSession(g, s.id, { cutoff: v })} />
                          <button
                            type="button"
                            className="self-end rounded-lg bg-rose-500/10 py-2 text-xs font-bold text-rose-600"
                            onClick={() => removeSession(g, s.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {g.format === "digit" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label={`Min stake (${currency})`}
                        defaultValue={String(g.min_stake ?? 0.5)}
                        onBlur={(v) => updateGame(g.id, { min_stake: parseFloat(v) || 0.5 })}
                      />
                      <Field
                        label={`Max stake (${currency})`}
                        defaultValue={String(g.max_stake ?? 100)}
                        onBlur={(v) => updateGame(g.id, { max_stake: parseFloat(v) || 100 })}
                      />
                      <p className="text-[11px] text-[var(--mut)] sm:col-span-2">
                        Jackpot games keep a fixed ticket price; min/max apply to digit number games only.
                      </p>
                    </div>
                  )}

                  {g.format === "digit" && (
                    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--card)]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--line)] text-[var(--mut)]">
                            <th className="px-3 py-2">Bet</th>
                            <th className="px-3 py-2">×</th>
                            <th className="px-3 py-2">On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {betTypes
                            .filter((b) =>
                              ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"].includes(
                                b.key
                              )
                            )
                            .map((b) => (
                              <tr key={b.key} className="border-b border-[var(--line)] last:border-0">
                                <td className="px-3 py-2 font-semibold">{b.label}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    className="h-8 w-20 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2"
                                    defaultValue={b.multiplier}
                                    onBlur={(e) =>
                                      updateBetType(b.key, { multiplier: parseFloat(e.target.value) || 1 })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={b.enabled}
                                    onChange={(e) => updateBetType(b.key, { enabled: e.target.checked })}
                                  />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toast("Game saved")}
                      className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteGame(g.id);
                        setOpenId(null);
                        toast("Game deleted");
                      }}
                      className="rounded-full bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandPanel() {
  const { brand, updateBrand, toast } = useStore();
  const speedLabel =
    brand.led_speed <= 30 ? "Slow" : brand.led_speed <= 50 ? "Normal" : "Fast";
  const schedule = brand.led_schedule || [];

  function setSchedule(next: typeof schedule) {
    updateBrand({ led_schedule: next });
  }

  const previewText =
    [brand.led_message, ...schedule.filter((s) => s.enabled).map((s) => s.text)]
      .filter(Boolean)
      .join("   ·   ") || "No message";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Branding & message</h2>

        <div>
          <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">System logo (back office + sell)</div>
          <div className="flex flex-wrap items-center gap-3">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="Logo" className="h-14 w-14 rounded-xl border object-contain" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">
                SL
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
              <Upload size={14} /> Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  updateBrand({ logo: await readFileAsDataUrl(f) });
                  toast("Logo uploaded");
                }}
              />
            </label>
            {brand.logo && (
              <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => updateBrand({ logo: "" })}>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lottery name" defaultValue={brand.name} onBlur={(v) => updateBrand({ name: v })} />
          <Field label="Tagline" defaultValue={brand.tagline} onBlur={(v) => updateBrand({ tagline: v })} />
        </div>

        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Main LED / ticker message
          <textarea
            className="mt-1 h-20 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm"
            defaultValue={brand.led_message}
            onBlur={(e) => updateBrand({ led_message: e.target.value })}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={brand.led_on} onChange={(e) => updateBrand({ led_on: e.target.checked })} />
            LED on
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            LED color
            <input
              type="color"
              className="ml-2 h-8 w-14 rounded border"
              value={brand.led_color}
              onChange={(e) => updateBrand({ led_color: e.target.value })}
            />
          </label>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[var(--mut)]">
            <span>Ticker speed · {speedLabel}</span>
            <span>{brand.led_speed}</span>
          </div>
          <input
            type="range"
            min={15}
            max={90}
            value={brand.led_speed}
            onChange={(e) => updateBrand({ led_speed: parseInt(e.target.value, 10) })}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[var(--mut)]">
            <button type="button" onClick={() => updateBrand({ led_speed: 25 })} className="font-bold">
              Slow
            </button>
            <button type="button" onClick={() => updateBrand({ led_speed: 40 })} className="font-bold">
              Normal
            </button>
            <button type="button" onClick={() => updateBrand({ led_speed: 70 })} className="font-bold">
              Fast
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-[var(--mut)]">
              Scheduled ticker messages ({schedule.filter((s) => s.enabled).length} active)
            </div>
            <button
              type="button"
              className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white"
              onClick={() =>
                setSchedule([
                  ...schedule,
                  {
                    id: `led${Date.now().toString(36)}`,
                    label: "New message",
                    text: "",
                    enabled: true,
                  },
                ])
              }
            >
              + Add scheduled message
            </button>
          </div>
          <div className="space-y-2">
            {schedule.map((s, idx) => (
              <div key={s.id} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--key)]/50 p-3">
                <div className="flex gap-2">
                  <input
                    className="h-9 flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                    value={s.label}
                    onChange={(e) => {
                      const next = [...schedule];
                      next[idx] = { ...s, label: e.target.value };
                      setSchedule(next);
                    }}
                    placeholder="Label"
                  />
                  <label className="flex items-center gap-1 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => {
                        const next = [...schedule];
                        next[idx] = { ...s, enabled: e.target.checked };
                        setSchedule(next);
                      }}
                    />
                    On
                  </label>
                  <button
                    type="button"
                    className="text-xs font-bold text-rose-600"
                    onClick={() => setSchedule(schedule.filter((x) => x.id !== s.id))}
                  >
                    Del
                  </button>
                </div>
                <textarea
                  className="h-16 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-sm"
                  value={s.text}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[idx] = { ...s, text: e.target.value };
                    setSchedule(next);
                  }}
                  placeholder="Message text"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">Live ticker preview</div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-black py-2">
            <div
              className="whitespace-nowrap font-mono text-sm font-bold"
              style={{
                color: brand.led_color,
                animation: brand.led_on ? `marquee ${Math.max(4, 120 / brand.led_speed)}s linear infinite` : "none",
              }}
            >
              {previewText}&nbsp;&nbsp;&nbsp;{previewText}
            </div>
          </div>
          <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
        </div>

        <button type="button" onClick={() => toast("Branding saved")} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">
          Save
        </button>
      </div>
    </div>
  );
}

function TicketDesignPanel() {
  const { ticketDesign: d, updateTicketDesign, toast, brand, games, promotions, currency, retailers, selectedRetailerId } =
    useStore();
  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const previewGame = games.find((g) => g.id === d.preview_game_id) || games[0];
  const activePromo = promotions.find((p) => p.active);
  const schedule = d.schedule_messages || [];

  function setSchedule(next: TicketScheduleMessage[]) {
    updateTicketDesign({ schedule_messages: next });
  }

  function applyTokens(tpl: string) {
    const jackpot = previewGame?.jackpot_current != null ? String(previewGame.jackpot_current) : "—";
    return tpl
      .replace(/\{game1\}|\{game\}/gi, previewGame?.name || "Game")
      .replace(/\{amount1\}|\{jackpot\}|\{amount\}/gi, jackpot)
      .replace(/\{date\}/gi, new Date().toLocaleDateString())
      .replace(/\{draw_time\}/gi, previewGame?.draw_time || "")
      .replace(/\{retailer\}/gi, shop?.name || "Shop")
      .replace(/\{ticket_id\}/gi, "T00001234")
      .replace(/\{currency\}/gi, currency)
      .replace(/\{promo\}/gi, activePromo?.label || "PROMO");
  }

  const retailerBlock = applyTokens(
    d.retailer_template ||
      "#{number} {retailer}\n{address}\nTel {phone}"
        .replace("{number}", shop?.number || "001")
        .replace("{address}", shop?.address || "")
        .replace("{phone}", shop?.phone || "")
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Ticket design</h2>

        <div>
          <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">Ticket logo</div>
          <div className="flex flex-wrap items-center gap-3">
            {(d.logo || brand.logo) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.logo || brand.logo} alt="" className="h-12 object-contain" style={{ maxHeight: d.logo_height }} />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
              <Upload size={14} /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  updateTicketDesign({ logo: await readFileAsDataUrl(f), show_logo: true });
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Font
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.font}
              onChange={(e) => updateTicketDesign({ font: e.target.value })}
            >
              <option value="mono">Monospace</option>
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Logo height (px)
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.logo_height}
              onChange={(e) => updateTicketDesign({ logo_height: parseInt(e.target.value, 10) || 40 })}
            />
          </label>
          <Field label="Header" defaultValue={d.header} onBlur={(v) => updateTicketDesign({ header: v })} />
          <Field label="Footer" defaultValue={d.footer} onBlur={(v) => updateTicketDesign({ footer: v })} />
        </div>

        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Retailer info template (under logo)
          <textarea
            className="mt-1 h-20 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 font-mono text-xs"
            defaultValue={
              d.retailer_template ||
              "#{number} {retailer}\n{address}\nTel {phone}"
            }
            onBlur={(e) => updateTicketDesign({ retailer_template: e.target.value })}
            placeholder="Use {retailer} {date} {game1} {amount1} {currency}"
          />
        </label>

        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Manual message / message of the day
          <textarea
            className="mt-1 h-16 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm"
            defaultValue={d.manual_text || ""}
            onBlur={(e) => updateTicketDesign({ manual_text: e.target.value })}
            placeholder="Shown below purchase lines"
          />
        </label>

        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          {(
            [
              ["show_logo", "Logo"],
              ["show_name", "Name"],
              ["show_retailer", "Retailer"],
              ["show_barcode", "Barcode"],
              ["show_qr", "QR"],
              ["bold_total", "Bold total"],
              ["show_jackpot", "Jackpot line"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!d[key]}
                onChange={(e) => updateTicketDesign({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--mut)]">Scheduled ticket messages</span>
            <button
              type="button"
              className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white"
              onClick={() =>
                setSchedule([
                  ...schedule,
                  {
                    id: `sm${Date.now().toString(36)}`,
                    label: "Message",
                    text: "{game1} jackpot {currency} {amount1} · {date}",
                    game_ids: [],
                    enabled: true,
                    placement: "after_lines",
                  },
                ])
              }
            >
              + Add
            </button>
          </div>
          <p className="mb-2 text-[10px] text-[var(--mut)]">
            Tokens: {"{game1}"} {"{amount1}"} {"{date}"} {"{currency}"} {"{retailer}"} {"{draw_time}"} {"{promo}"}
          </p>
          {schedule.map((s, idx) => (
            <div key={s.id} className="mb-2 space-y-2 rounded-xl border border-[var(--line)] p-2">
              <div className="flex gap-2">
                <input
                  className="h-8 flex-1 rounded-lg border px-2 text-xs"
                  value={s.label}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[idx] = { ...s, label: e.target.value };
                    setSchedule(next);
                  }}
                />
                <label className="flex items-center gap-1 text-[10px] font-bold">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => {
                      const next = [...schedule];
                      next[idx] = { ...s, enabled: e.target.checked };
                      setSchedule(next);
                    }}
                  />
                  On
                </label>
                <button type="button" className="text-[10px] font-bold text-rose-600" onClick={() => setSchedule(schedule.filter((x) => x.id !== s.id))}>
                  Del
                </button>
              </div>
              <textarea
                className="h-14 w-full rounded-lg border px-2 py-1 font-mono text-xs"
                value={s.text}
                onChange={(e) => {
                  const next = [...schedule];
                  next[idx] = { ...s, text: e.target.value };
                  setSchedule(next);
                }}
              />
              <div className="flex flex-wrap gap-1">
                {games.map((g) => {
                  const on = s.game_ids.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        const ids = new Set(s.game_ids);
                        if (ids.has(g.id)) ids.delete(g.id);
                        else ids.add(g.id);
                        const next = [...schedule];
                        next[idx] = { ...s, game_ids: [...ids] };
                        setSchedule(next);
                      }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${on ? "bg-indigo-600 text-white" : "bg-[var(--key)]"}`}
                    >
                      {g.name}
                    </button>
                  );
                })}
                <span className="text-[10px] text-[var(--mut)]">(none = all games)</span>
              </div>
            </div>
          ))}
        </div>

        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Preview game
          <select
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            value={d.preview_game_id || games[0]?.id || ""}
            onChange={(e) => updateTicketDesign({ preview_game_id: e.target.value })}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => toast("Design saved")} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">
          Save
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-slate-100 p-4 dark:bg-slate-900">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--mut)]">Live ticket preview</div>
        <div
          className="mx-auto max-w-[280px] rounded-lg border border-dashed border-slate-400 bg-white p-4 text-slate-900 shadow-inner"
          style={{
            fontFamily: d.font === "mono" ? "ui-monospace, monospace" : d.font === "serif" ? "Georgia, serif" : "system-ui, sans-serif",
            fontSize: Math.max(10, Math.min(16, d.size || 12)),
            textAlign: d.align || "center",
          }}
        >
          {d.show_logo && (d.logo || brand.logo) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.logo || brand.logo}
              alt=""
              className="mx-auto mb-2 object-contain"
              style={{ height: d.logo_height || 40 }}
            />
          )}
          {d.show_name && <div className="font-bold">{d.header || brand.name}</div>}
          {d.show_retailer && (
            <div className="mt-1 whitespace-pre-line text-[10px] opacity-80">{retailerBlock}</div>
          )}
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div className="text-left text-[11px]">
            <div className="font-bold">{previewGame?.name || "Game"} · 4 Cifra</div>
            <div className="font-mono">1234 · {currency} 2.00</div>
          </div>
          {d.manual_text && (
            <div className="mt-2 text-[10px] italic opacity-80">{applyTokens(d.manual_text)}</div>
          )}
          {schedule
            .filter((s) => s.enabled && (!s.game_ids.length || s.game_ids.includes(previewGame?.id || "")))
            .map((s) => (
              <div key={s.id} className="mt-1 text-[10px]">
                {applyTokens(s.text)}
              </div>
            ))}
          {activePromo && (
            <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-1.5 text-[10px]">
              <div className="font-bold">{activePromo.label}</div>
              <div className="font-mono">CODE 482910</div>
              <div>{activePromo.instruction}</div>
            </div>
          )}
          <div className={`mt-2 ${d.bold_total ? "font-extrabold" : "font-semibold"}`}>
            TOTAL {currency} 2.00
          </div>
          {d.show_barcode && <div className="mt-2 font-mono text-[8px] tracking-widest">||||| |||| |||||</div>}
          <div className="mt-2 text-[10px] opacity-70">{d.footer}</div>
        </div>
      </div>
    </div>
  );
}

function ReportsPanel() {
  const { soldTickets, retailers, currency, user, selectedRetailerId, salesToday, ticketsToday, unpaidPrizes } =
    useStore();
  const isOwner = user?.role === "owner";
  const list = isOwner ? soldTickets : soldTickets.filter((t) => t.retailer_id === selectedRetailerId);
  const sold = list.filter((t) => t.status !== "cancelled");
  const sales = sold.reduce((s, t) => s + t.total, 0);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-lg font-bold">Reports</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Tickets" value={String(sold.length)} />
        <Kpi label={`Sales (${currency})`} value={sales.toFixed(2)} />
        <Kpi label="Today" value={`${ticketsToday} / ${salesToday.toFixed(2)}`} />
        <Kpi label="Unpaid prizes" value={unpaidPrizes.toFixed(2)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--mut)]">
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Shop</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Promo</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 50).map((t) => (
              <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-3 py-2 font-mono font-semibold">{t.id}</td>
                <td className="px-3 py-2">{retailers.find((r) => r.id === t.retailer_id)?.name || t.retailer_id}</td>
                <td className="px-3 py-2">
                  {currency} {t.total.toFixed(2)}
                </td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2 font-mono">{t.promo_code || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RetailersPanel() {
  const { retailers, updateRetailer, addRetailer, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
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

      <OsmMap retailers={retailers} onSelect={setOpenId} selectedId={openId} />

      <div className="space-y-2">
        {retailers.map((r) => {
          const open = openId === r.id;
          return (
            <div key={r.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                  #{r.number}
                </span>
                <span className="min-w-0 flex-1 text-sm font-bold">{r.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.active ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-600"
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
                    />{" "}
                    Active
                  </label>
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
  value,
  onChange,
  onBlur,
}: {
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  onBlur?: (v: string) => void;
}) {
  return (
    <label className="text-[11px] font-semibold text-[var(--mut)]">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm text-[var(--ink)]"
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      />
    </label>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
      <div className="text-[10px] uppercase text-[var(--mut)]">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
