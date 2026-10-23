"use client";

import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Retailer } from "@/lib/types";

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
  { id: "results", label: "Results & winners" },
  { id: "reports", label: "Reports" },
  { id: "retailers", label: "Retailers" },
];

export function OfficeScreen() {
  const [sub, setSub] = useState<Sub>("games");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm ${
              sub === t.id
                ? "bg-indigo-600 text-white"
                : "bg-[var(--card)] text-[var(--ink)]"
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
  const { games, betTypes, updateGame, updateBetType, toast, currency } = useStore();
  const [openId, setOpenId] = useState<string | null>(games[0]?.id ?? null);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Games & schedule</h2>
          <p className="text-xs text-[var(--mut)]">
            Games stay collapsed. Tap a row to expand. Format controls digits, zodiac, Play Whe, or
            jackpot rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("Add game — wire to Supabase")}
          className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
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
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: g.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{g.name}</span>
                  <span className="text-[11px] text-[var(--mut)]">
                    {g.format === "digit"
                      ? `${g.digits}-digit`
                      : g.format === "jackpot"
                        ? `JP ${g.main_count}/${g.main_max}`
                        : g.format}{" "}
                    · draw {g.draw_time} · cut {g.cutoff}
                    {g.jackpot_current != null
                      ? ` · pool ${currency} ${g.jackpot_current.toLocaleString()}`
                      : ""}
                    {g.sessions?.length
                      ? ` · ${g.sessions.map((s) => s.label).join("/")}`
                      : ""}
                  </span>
                </span>
                <span className="text-[var(--mut)]">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <div className="space-y-4 border-t border-[var(--line)] bg-[var(--key)]/40 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Name
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.name}
                        onBlur={(e) => updateGame(g.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Format
                      <select
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        value={g.format}
                        onChange={(e) =>
                          updateGame(g.id, {
                            format: e.target.value as typeof g.format,
                          })
                        }
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
                      />
                      Show on sell
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Draw time
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.draw_time}
                        onBlur={(e) => updateGame(g.id, { draw_time: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Cut-off
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.cutoff}
                        onBlur={(e) => updateGame(g.id, { cutoff: e.target.value })}
                      />
                    </label>
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

                  {g.format === "digit" && (
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase text-[var(--mut)]">
                        Prize structure (payout × at stake 1)
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--card)]">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--line)] text-[var(--mut)]">
                              <th className="px-3 py-2">Bet type</th>
                              <th className="px-3 py-2">Mode</th>
                              <th className="px-3 py-2">Payout ×</th>
                              <th className="px-3 py-2">@ 1</th>
                              <th className="px-3 py-2">@ 0.50</th>
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
                                  <td className="px-3 py-2 text-[var(--mut)]">
                                    {b.digits}d · {b.mode}
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      className="h-8 w-20 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2"
                                      defaultValue={b.multiplier}
                                      onBlur={(e) =>
                                        updateBetType(b.key, {
                                          multiplier: parseFloat(e.target.value) || 1,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    {currency} {b.multiplier}
                                  </td>
                                  <td className="px-3 py-2">
                                    {currency} {(b.multiplier * 0.5).toFixed(0)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={b.enabled}
                                      onChange={(e) =>
                                        updateBetType(b.key, { enabled: e.target.checked })
                                      }
                                    />
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {g.sessions && g.sessions.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-bold uppercase text-[var(--mut)]">
                        Sessions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {g.sessions.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full bg-[var(--card)] px-3 py-1 text-xs font-semibold shadow-sm"
                          >
                            {s.label} · draw {s.draw_time} · cut {s.cutoff}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toast("Game saved (demo)")}
                      className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
                    >
                      Save game
                    </button>
                    <button
                      type="button"
                      onClick={() => toast("Delete not wired in demo", true)}
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

      {/* Global bet types table */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
        <h3 className="mb-1 font-bold">Bet types — payout & stake limits</h3>
        <p className="mb-3 text-xs text-[var(--mut)]">
          Digit bet types only appear on the sell screen for digit games. Zodiac / Jackpot / Play Whe
          apply when that format is selected.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--mut)]">
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Label</th>
                <th className="py-2 pr-2">Payout ×</th>
                <th className="py-2 pr-2">Min bet</th>
                <th className="py-2 pr-2">Max bet</th>
                <th className="py-2 pr-2">On</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {betTypes.map((b) => (
                <tr key={b.key} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2 pr-2 text-[var(--mut)]">
                    {b.digits}d · {b.mode}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="h-8 w-28 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2"
                      defaultValue={b.label}
                      onBlur={(e) => updateBetType(b.key, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      className="h-8 w-20 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2"
                      defaultValue={b.multiplier}
                      onBlur={(e) =>
                        updateBetType(b.key, { multiplier: parseFloat(e.target.value) || 1 })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      step="0.25"
                      className="h-8 w-16 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2"
                      defaultValue={b.min_stake ?? 0.5}
                      onBlur={(e) =>
                        updateBetType(b.key, { min_stake: parseFloat(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      className="h-8 w-16 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2"
                      defaultValue={b.max_stake ?? 100}
                      onBlur={(e) =>
                        updateBetType(b.key, { max_stake: parseFloat(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={b.enabled}
                      onChange={(e) => updateBetType(b.key, { enabled: e.target.checked })}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => toast("Saved")}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  const { brand, updateBrand, toast } = useStore();
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-lg font-bold">Branding & message</h2>
      <p className="text-xs text-[var(--mut)]">Owner-only — LED ticker and ticket header.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Lottery name"
          defaultValue={brand.name}
          onBlur={(v) => updateBrand({ name: v })}
        />
        <Field
          label="Tagline"
          defaultValue={brand.tagline}
          onBlur={(v) => updateBrand({ tagline: v })}
        />
        <label className="text-[11px] font-semibold text-[var(--mut)] sm:col-span-2">
          LED scrolling message
          <input
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            defaultValue={brand.led_message}
            onBlur={(e) => updateBrand({ led_message: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={brand.led_on}
            onChange={(e) => updateBrand({ led_on: e.target.checked })}
          />
          LED on
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          LED color
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-xl"
            value={brand.led_color}
            onChange={(e) => updateBrand({ led_color: e.target.value })}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => toast("Branding saved (demo)")}
        className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
      >
        Save branding
      </button>
    </div>
  );
}

function TicketDesignPanel() {
  const { ticketDesign, updateTicketDesign, brand, toast, currency } = useStore();
  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Ticket layout</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Font
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
              value={ticketDesign.font}
              onChange={(e) => updateTicketDesign({ font: e.target.value })}
            >
              <option value="mono">Mono</option>
              <option value="sans">Sans-serif</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Size
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
              value={ticketDesign.size}
              onChange={(e) => updateTicketDesign({ size: +e.target.value })}
            />
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Paper
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
              value={ticketDesign.width}
              onChange={(e) => updateTicketDesign({ width: +e.target.value })}
            >
              {[48, 58, 72, 80].map((w) => (
                <option key={w} value={w}>
                  {w} mm
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--mut)]">
            Align
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
              value={ticketDesign.align}
              onChange={(e) =>
                updateTicketDesign({ align: e.target.value as "left" | "center" | "right" })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ["show_logo", "Logo on top"],
              ["show_name", "Lottery name"],
              ["show_retailer", "Retailer name"],
              ["show_barcode", "Barcode"],
              ["show_qr", "QR code"],
              ["bold_total", "Bold total"],
            ] as const
          ).map(([k, lab]) => (
            <label key={k} className="flex items-center gap-1.5 font-semibold">
              <input
                type="checkbox"
                checked={!!ticketDesign[k]}
                onChange={(e) => updateTicketDesign({ [k]: e.target.checked })}
              />
              {lab}
            </label>
          ))}
        </div>
        <Field
          label="Header"
          defaultValue={ticketDesign.header}
          onBlur={(v) => updateTicketDesign({ header: v })}
        />
        <Field
          label="Footer"
          defaultValue={ticketDesign.footer}
          onBlur={(v) => updateTicketDesign({ footer: v })}
        />
        <div className="rounded-xl border border-dashed border-[var(--line)] p-3 text-xs text-[var(--mut)]">
          <b className="text-[var(--ink)]">Message of the day</b> — standard / dynamic / scheduled
          blocks from HACS are modeled here. Wire full message editor to Supabase next.
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toast("Ticket layout saved (demo)")}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
          >
            Save ticket layout
          </button>
          <button
            type="button"
            onClick={() => toast("Print test ticket (demo)")}
            className="rounded-full bg-[var(--key)] px-4 py-2 text-sm font-semibold"
          >
            Print test ticket
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h3 className="mb-3 font-bold">Preview</h3>
        <div
          className="mx-auto rounded-lg border border-dashed border-slate-300 bg-white p-4 font-mono text-[11px] text-slate-900 shadow-inner"
          style={{
            width: Math.min(ticketDesign.width * 2.2, 280),
            textAlign: ticketDesign.align,
          }}
        >
          {ticketDesign.show_logo && (
            <div className="mb-1 text-center text-xs font-black tracking-tight">LOTTERY 1·2·3</div>
          )}
          {ticketDesign.show_name && (
            <div className="text-center text-sm font-bold">{brand.name}</div>
          )}
          <div className="text-center text-[10px]">TICKET</div>
          {ticketDesign.show_retailer && (
            <div className="mt-1 text-[10px]">Main Shop · 2026-10-23 18:02</div>
          )}
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div>Diario 10-23 · 1234 · 4 Cifra · 1.00</div>
          <div className="my-1 border border-dashed border-slate-400 p-1 text-center text-[10px]">
            QUALIFIED FOR PROMOTION
            <div className="text-base font-black tracking-widest">703692</div>
          </div>
          <div className={`mt-2 ${ticketDesign.bold_total ? "font-black" : "font-bold"}`}>
            TOTAL {currency} 1.00
          </div>
          {ticketDesign.show_barcode && (
            <div className="mt-2 flex justify-center gap-px">
              {Array.from({ length: 40 }, (_, i) => (
                <span
                  key={i}
                  className="inline-block bg-black"
                  style={{ width: i % 3 === 0 ? 2 : 1, height: 28 }}
                />
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px]">{ticketDesign.footer || "Good luck!"}</div>
        </div>
      </div>
    </div>
  );
}

function PromosPanel() {
  const { promotions, toast } = useStore();
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Promotions</h2>
          <p className="text-xs text-[var(--mut)]">
            Min plays / games / amount · unique code on qualifying tickets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("Add promotion (demo)")}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Add promotion
        </button>
      </div>
      {promotions.map((p) => (
        <div
          key={p.id}
          className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold">{p.name}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                p.active
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-600"
              }`}
            >
              {p.active ? "Active" : "Off"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--mut)]">
            Label «{p.label}» · {p.code_len}-digit code
            {p.min_plays ? ` · min ${p.min_plays} plays` : ""}
            {p.min_games ? ` · min ${p.min_games} games` : ""}
            {p.prize != null ? ` · prize AWG ${p.prize}` : ""}
          </p>
          <p className="text-xs text-[var(--mut)]">{p.instruction}</p>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel() {
  const { games, toast, currency } = useStore();
  const [gameId, setGameId] = useState(games[0]?.id || "");
  const [d, setD] = useState(() => new Date().toISOString().slice(0, 10));
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-lg font-bold">Results & winners</h2>
      <p className="text-xs text-[var(--mut)]">
        Enter 1st / 2nd / 3rd — tickets settle automatically (wire to store next).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Game
          <select
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">
          Draw date
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            value={d}
            onChange={(e) => setD(e.target.value)}
          />
        </label>
        <Field label="1st prize" value={first} onChange={setFirst} />
        <Field label="2nd prize" value={second} onChange={setSecond} />
        <Field label="3rd prize" value={third} onChange={setThird} />
      </div>
      <button
        type="button"
        onClick={() => toast(`Results saved for ${gameId} ${d} (demo)`)}
        className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
      >
        Save results & settle
      </button>
      <div className="rounded-xl bg-[var(--key)] p-3 text-sm text-[var(--mut)]">
        Winning tickets, Pay button, unpaid liability — same as HACS Results tab once Supabase is
        connected. Currency {currency}.
      </div>
    </div>
  );
}

function ReportsPanel() {
  const {
    soldTickets,
    retailers,
    games,
    currency,
    user,
    selectedRetailerId,
  } = useStore();
  const isOwner = user?.role === "owner";
  const list = isOwner
    ? soldTickets
    : soldTickets.filter((t) => t.retailer_id === selectedRetailerId);
  const sold = list.filter((t) => t.status !== "cancelled");
  const sales = sold.reduce((s, t) => s + t.total, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-lg font-bold">Reports</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Tickets sold" value={String(sold.length)} />
        <Kpi
          label="Cancelled"
          value={String(list.filter((t) => t.status === "cancelled").length)}
        />
        <Kpi
          label="Plays"
          value={String(sold.reduce((s, t) => s + t.lines.length, 0))}
        />
        <Kpi label="Sales" value={`${currency} ${sales.toFixed(2)}`} />
      </div>
      {isOwner && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
          <h3 className="mb-2 font-bold">By retailer</h3>
          {retailers.slice(0, 8).map((r) => {
            const ts = sold.filter((t) => t.retailer_id === r.id);
            const sum = ts.reduce((s, t) => s + t.total, 0);
            return (
              <div
                key={r.id}
                className="flex justify-between border-b border-[var(--line)] py-2 text-sm last:border-0"
              >
                <span>
                  #{r.number} {r.name}
                </span>
                <span>
                  {ts.length} tk · {currency} {sum.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <h3 className="mb-2 font-bold">By game</h3>
        {games.map((g) => {
          let plays = 0;
          let sum = 0;
          for (const t of sold)
            for (const l of t.lines)
              if (l.game === g.id) {
                plays++;
                sum += l.amount;
              }
          if (!plays) return null;
          return (
            <div
              key={g.id}
              className="flex items-center justify-between border-b border-[var(--line)] py-2 text-sm last:border-0"
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                {g.name}
              </span>
              <span>
                {plays} plays · {currency} {sum.toFixed(2)}
              </span>
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
          <h2 className="text-lg font-bold">Retailers</h2>
          <p className="text-xs text-[var(--mut)]">20 Aruba locations · map + commission.</p>
        </div>
        <button
          type="button"
          onClick={() => toast("Add retailer (demo)")}
          className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
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
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                  #{r.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{r.name}</span>
                  <span className="text-[11px] text-[var(--mut)]">
                    {person ? `${person} · ` : ""}
                    {r.phone || ""} · Sell {r.commission_sell}% · Redeem {r.commission_redeem}%
                  </span>
                </span>
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
                  <Field
                    label="Shop name"
                    defaultValue={r.name}
                    onBlur={(v) => updateRetailer(r.id, { name: v })}
                  />
                  <Field
                    label="Phone"
                    defaultValue={r.phone || ""}
                    onBlur={(v) => updateRetailer(r.id, { phone: v })}
                  />
                  <Field
                    label="Address"
                    defaultValue={r.address || ""}
                    onBlur={(v) => updateRetailer(r.id, { address: v })}
                  />
                  <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) => updateRetailer(r.id, { active: e.target.checked })}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => toast("Retailer saved (demo)")}
                    className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white sm:col-span-2"
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

function Field({
  label,
  defaultValue,
  value,
  onBlur,
  onChange,
}: {
  label: string;
  defaultValue?: string;
  value?: string;
  onBlur?: (v: string) => void;
  onChange?: (v: string) => void;
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

function ArubaMap({
  retailers,
  onSelect,
}: {
  retailers: Retailer[];
  onSelect: (id: string) => void;
}) {
  const nOn = retailers.filter((r) => r.active).length;
  const nOff = retailers.length - nOn;
  // rough lat/lng → SVG for Aruba bbox
  const toXY = (lat?: number, lng?: number) => {
    if (lat == null || lng == null) return { x: 150, y: 100 };
    const x = ((lng + 70.1) / 0.25) * 280 + 40;
    const y = ((12.62 - lat) / 0.22) * 180 + 20;
    return { x, y };
  };
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
      <svg viewBox="0 0 360 220" className="h-auto w-full">
        <rect width="360" height="220" rx="12" fill="var(--key)" />
        <text x="180" y="24" textAnchor="middle" fontSize="12" fill="var(--mut)">
          Aruba retailers
        </text>
        {retailers.map((r) => {
          const { x, y } = toXY(r.lat, r.lng);
          return (
            <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
              <circle
                cx={x}
                cy={y}
                r={7}
                fill={r.active ? "#22c55e" : "#f43f5e"}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <title>
                #{r.number} {r.name}
              </title>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-[var(--mut)]">
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-emerald-500" /> Active ({nOn})
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-rose-500" /> Disabled ({nOff})
        </span>
        <span>Total {retailers.length}</span>
      </div>
    </div>
  );
}
