"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { defaultGameToken, resolveGameTokens } from "@/lib/game-tokens";
import type { Game } from "@/lib/types";
import { PrizeTiersEditor } from "./PrizeTiersEditor";
import { ProgressiveJackpotEditor } from "./ProgressiveJackpotEditor";
import { defaultPrizeTiersForFormat } from "@/lib/prize-tiers";
import { removeLogo, uploadLogo } from "@/lib/storage";
import {
  DIGIT_PARAM_PRESETS,
  GAME_TEMPLATES,
  betTypesForDigits,
  findDigitPreset,
  gameFromTemplate,
} from "@/lib/game-presets";

const WEEKDAYS = [
  { d: 0, label: "Sun" },
  { d: 1, label: "Mon" },
  { d: 2, label: "Tue" },
  { d: 3, label: "Wed" },
  { d: 4, label: "Thu" },
  { d: 5, label: "Fri" },
  { d: 6, label: "Sat" },
];

export function GamesPanel() {
  const { games, updateGame, addGame, deleteGame, toast, currency } =
    useStore();
  const gameTokens = resolveGameTokens(games);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [addTemplateId, setAddTemplateId] = useState("tpl_pick3");

  const sorted = [...games].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  );

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = sorted.map((g) => g.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    ids.forEach((id, index) => {
      const current = games.find((g) => g.id === id);
      if (current && (current.sort_order ?? 0) !== index) {
        updateGame(id, { sort_order: index });
      }
    });
    toast("Order updated");
  }

  function onAddGame() {
    const fromTpl = gameFromTemplate(addTemplateId, { sort_order: sorted.length });
    if (fromTpl) {
      addGame(fromTpl);
      setOpenId(fromTpl.id);
      toast(`${fromTpl.name} added from template`);
      return;
    }
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
      draw_days: [0, 1, 2, 3, 4, 5, 6],
      min_stake: 0.5,
      max_stake: 100,
      bet_types: ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"],
      sessions: [{ id: "midday", label: "Midday", draw_time: "13:00", cutoff: "12:45" }],
      prize_tiers: defaultPrizeTiersForFormat("digit", 4),
      sort_order: sorted.length,
    };
    addGame(g);
    setOpenId(id);
    toast("Game added");
  }

  async function onLogoUpload(game: Game, file: File | undefined) {
    if (!file) return;
    setUploadingId(game.id);
    try {
      const result = await uploadLogo(file, "games", game.id);
      if (!result.ok) {
        toast(result.error, true);
        return;
      }
      void removeLogo(game.logo);
      updateGame(game.id, { logo: result.url });
      toast("Logo saved");
    } finally {
      setUploadingId(null);
    }
  }

  async function onLogoRemove(game: Game) {
    void removeLogo(game.logo);
    updateGame(game.id, { logo: "" });
    toast("Logo removed");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Games & schedule</h2>
          <p className="text-xs text-[var(--mut)]">
            Templates · logo · draws · digit presets · prize tiers · drag to reorder
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
            value={addTemplateId}
            onChange={(e) => setAddTemplateId(e.target.value)}
          >
            <optgroup label="Digit games">
              {GAME_TEMPLATES.filter((t) => t.group === "digit").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Jackpot">
              {GAME_TEMPLATES.filter((t) => t.group === "jackpot").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Special">
              {GAME_TEMPLATES.filter((t) => t.group === "special").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            onClick={onAddGame}
            className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Add game
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((g) => {
          const open = openId === g.id;
          const isDragging = dragId === g.id;
          const isOver = overId === g.id && dragId !== g.id;
          const uploading = uploadingId === g.id;
          const digitPresetId = findDigitPreset(g.digits || 4, g.bet_types);
          return (
            <div
              key={g.id}
              draggable
              onDragStart={(e) => {
                setDragId(g.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", g.id);
                if ((e.target as HTMLElement).closest("input,select,button,textarea,label")) {
                  e.preventDefault();
                  setDragId(null);
                }
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overId !== g.id) setOverId(g.id);
              }}
              onDragLeave={() => {
                if (overId === g.id) setOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/plain") || dragId;
                if (fromId) reorder(fromId, g.id);
                setDragId(null);
                setOverId(null);
              }}
              className={
                "overflow-hidden rounded-2xl border bg-[var(--card)] shadow-sm transition " +
                (isDragging
                  ? "border-indigo-400 opacity-50"
                  : isOver
                    ? "border-indigo-500 ring-2 ring-indigo-500/30"
                    : "border-[var(--line)]")
              }
            >
              <div className="flex w-full items-center gap-2 px-2 py-3 text-left sm:px-3">
                <button
                  type="button"
                  className="cursor-grab touch-none rounded-lg p-1.5 text-[var(--mut)] hover:bg-[var(--key)] active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : g.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                      {g.format === "digit"
                        ? `${g.digits}-digit`
                        : g.format === "zodiac"
                          ? `${g.digits || 4}-digit + zodiac sign`
                          : g.format === "jackpot"
                            ? `JP ${g.main_count || 5}/${g.main_max || 30}${
                                g.jackpot_current != null
                                  ? ` · pool ${currency} ${Number(g.jackpot_current).toLocaleString()}`
                                  : ""
                              }`
                            : g.format}
                      {" · "}draw {g.draw_time}
                      {g.sessions?.length ? ` · ${g.sessions.length} session(s)` : ""}
                      {g.min_stake != null ? ` · min ${currency} ${g.min_stake}` : ""}
                      {g.prize_tiers?.length ? ` · ${g.prize_tiers.length} prize tier(s)` : ""}
                      {` · #${(g.sort_order ?? 0) + 1}`}
                    </span>
                  </span>
                  <span className="text-[var(--mut)]">{open ? "▲" : "▼"}</span>
                </button>
              </div>

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
                      Ticket token
                      <input
                        key={`${g.id}-${g.token || ""}`}
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-mono text-sm"
                        defaultValue={g.token || ""}
                        placeholder={gameTokens.get(g.id) || defaultGameToken(g)}
                        maxLength={12}
                        onBlur={(e) => {
                          const raw = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
                          updateGame(g.id, { token: raw || undefined });
                        }}
                      />
                      <span className="mt-0.5 block text-[10px] font-normal">
                        Use {`{${gameTokens.get(g.id) || defaultGameToken(g)}}`} in ticket text → {g.name}
                        {" · "}
                        {`{${gameTokens.get(g.id) || defaultGameToken(g)}_time}`} → draw time
                      </span>
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Format
                      <select
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        value={g.format}
                        onChange={(e) => {
                          const format = e.target.value as Game["format"];
                          const patch: Partial<Game> = { format };
                          if (format === "zodiac") {
                            patch.digits = g.digits && g.digits >= 2 ? g.digits : 4;
                            patch.bet_types = ["zodiac"];
                            if (!g.prize_tiers?.length)
                              patch.prize_tiers = defaultPrizeTiersForFormat("zodiac", patch.digits);
                          } else if (format === "whe") {
                            patch.digits = 2;
                            patch.bet_types = ["play_whe"];
                            if (!g.prize_tiers?.length)
                              patch.prize_tiers = defaultPrizeTiersForFormat("whe");
                          } else if (format === "digit") {
                            patch.digits = g.digits || 4;
                            patch.bet_types = betTypesForDigits(patch.digits as 2 | 3 | 4 | 5 | 6);
                            if (!g.prize_tiers?.length)
                              patch.prize_tiers = defaultPrizeTiersForFormat("digit", patch.digits);
                          } else if (format === "jackpot") {
                            patch.bet_types = ["jackpot"];
                            if (!g.prize_tiers?.length)
                              patch.prize_tiers = defaultPrizeTiersForFormat("jackpot");
                            if (g.jackpot_base == null) patch.jackpot_base = 50000;
                            if (g.jackpot_current == null) patch.jackpot_current = 50000;
                            if (g.jackpot_increment == null) patch.jackpot_increment = 5000;
                            if (g.jackpot_sales_pct == null) patch.jackpot_sales_pct = 30;
                            if (g.main_count == null) patch.main_count = 5;
                            if (g.main_max == null) patch.main_max = 30;
                            if (g.mega_count == null) patch.mega_count = 1;
                            if (g.mega_max == null) patch.mega_max = 10;
                          }
                          updateGame(g.id, patch);
                        }}
                      >
                        <option value="digit">Digit number</option>
                        <option value="zodiac">Zodiac (number + sign)</option>
                        <option value="whe">Play Whe</option>
                        <option value="jackpot">Jackpot (progressive)</option>
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
                      Default draw time
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.draw_time}
                        onBlur={(e) => updateGame(g.id, { draw_time: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Default cut-off
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

                  {(g.format === "digit" || g.format === "zodiac") && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
                      <div className="mb-2 text-[11px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                        {g.format === "zodiac"
                          ? "Zodiac: number length + signs"
                          : "Digit parameters (Pick 2–6)"}
                      </div>
                      {g.format === "digit" && (
                        <label className="mb-2 block text-[11px] font-semibold text-[var(--mut)]">
                          Quick preset
                          <select
                            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                            value={digitPresetId || ""}
                            onChange={(e) => {
                              const p = DIGIT_PARAM_PRESETS.find((x) => x.id === e.target.value);
                              if (!p) return;
                              updateGame(g.id, {
                                digits: p.params.digits,
                                bet_types: p.params.bet_types,
                                min_stake: p.params.min_stake,
                                max_stake: p.params.max_stake,
                                prize_tiers: defaultPrizeTiersForFormat("digit", p.params.digits),
                              });
                            }}
                          >
                            <option value="">Custom…</option>
                            {DIGIT_PARAM_PRESETS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Digits (number pad)
                        <select
                          className="mt-1 h-10 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-bold"
                          value={g.digits || 4}
                          onChange={(e) => {
                            const digits = parseInt(e.target.value, 10) as 2 | 3 | 4 | 5 | 6;
                            const patch: Partial<Game> = { digits };
                            if (g.format === "digit") {
                              patch.bet_types = betTypesForDigits(digits);
                              patch.prize_tiers = defaultPrizeTiersForFormat("digit", digits);
                            }
                            updateGame(g.id, patch);
                          }}
                        >
                          {[2, 3, 4, 5, 6].map((d) => (
                            <option key={d} value={d}>
                              {d}-digit
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {g.format === "jackpot" && (
                    <ProgressiveJackpotEditor game={g} currency={currency} updateGame={updateGame} />
                  )}

                  <PrizeTiersEditor game={g} />

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Game logo (sell screen)
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {g.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.logo}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--key)] text-xs text-[var(--mut)]"
                        >
                          No logo
                        </span>
                      )}
                      <label className="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs font-semibold">
                        {uploading ? "Uploading…" : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!!uploadingId}
                          onChange={(e) => onLogoUpload(g, e.target.files?.[0])}
                        />
                      </label>
                      {g.logo && (
                        <button
                          type="button"
                          onClick={() => onLogoRemove(g)}
                          className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Draw days
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(({ d, label }) => {
                        const on = (g.draw_days ?? []).includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              const cur = new Set(g.draw_days ?? []);
                              if (on) cur.delete(d);
                              else cur.add(d);
                              updateGame(g.id, { draw_days: [...cur].sort() });
                            }}
                            className={
                              "rounded-full px-3 py-1 text-xs font-semibold " +
                              (on
                                ? "bg-indigo-600 text-white"
                                : "border border-[var(--line)] bg-[var(--key)] text-[var(--mut)]")
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase text-[var(--mut)]">Sessions</div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-indigo-600"
                        onClick={() => {
                          const sessions = [
                            ...(g.sessions || []),
                            {
                              id: `s_${Date.now().toString(36)}`,
                              label: "New session",
                              draw_time: g.draw_time || "13:00",
                              cutoff: g.cutoff || "12:45",
                            },
                          ];
                          updateGame(g.id, { sessions });
                        }}
                      >
                        + Add session
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(g.sessions || []).map((s, idx) => (
                        <div key={s.id} className="grid gap-2 sm:grid-cols-4">
                          <input
                            className="h-9 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
                            defaultValue={s.label}
                            placeholder="Label"
                            onBlur={(e) => {
                              const sessions = [...(g.sessions || [])];
                              sessions[idx] = { ...sessions[idx], label: e.target.value };
                              updateGame(g.id, { sessions });
                            }}
                          />
                          <input
                            className="h-9 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
                            defaultValue={s.draw_time}
                            placeholder="Draw"
                            onBlur={(e) => {
                              const sessions = [...(g.sessions || [])];
                              sessions[idx] = { ...sessions[idx], draw_time: e.target.value };
                              updateGame(g.id, { sessions });
                            }}
                          />
                          <input
                            className="h-9 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-sm"
                            defaultValue={s.cutoff}
                            placeholder="Cutoff"
                            onBlur={(e) => {
                              const sessions = [...(g.sessions || [])];
                              sessions[idx] = { ...sessions[idx], cutoff: e.target.value };
                              updateGame(g.id, { sessions });
                            }}
                          />
                          <button
                            type="button"
                            className="flex items-center justify-center gap-1 rounded-lg border border-red-200 text-xs text-red-600"
                            onClick={() => {
                              const sessions = (g.sessions || []).filter((_, i) => i !== idx);
                              updateGame(g.id, { sessions });
                            }}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      ))}
                      {!(g.sessions || []).length && (
                        <p className="text-xs text-[var(--mut)]">No sessions — uses default draw/cutoff.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Min stake
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.min_stake ?? ""}
                        onBlur={(e) =>
                          updateGame(g.id, {
                            min_stake: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Max stake
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.max_stake ?? ""}
                        onBlur={(e) =>
                          updateGame(g.id, {
                            max_stake: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete game "${g.name}"?`)) {
                          deleteGame(g.id);
                          setOpenId(null);
                          toast("Game deleted");
                        }
                      }}
                      className="flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600"
                    >
                      <Trash2 size={14} /> Delete game
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
