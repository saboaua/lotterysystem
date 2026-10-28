"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, GameSession } from "@/lib/types";
import { PrizeTiersEditor } from "./PrizeTiersEditor";
import { ProgressiveJackpotEditor } from "./ProgressiveJackpotEditor";
import { defaultPrizeTiersForFormat } from "@/lib/prize-tiers";
import { removeLogo, uploadLogo } from "@/lib/storage";

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
  const { games, betTypes, updateGame, updateBetType, addGame, deleteGame, toast, currency } =
    useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Games & schedule</h2>
          <p className="text-xs text-[var(--mut)]">
            Logo · draws · min/max · weekdays · prize tiers · drag to reorder on sell
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
        {sorted.map((g) => {
          const open = openId === g.id;
          const isDragging = dragId === g.id;
          const isOver = overId === g.id && dragId !== g.id;
          const uploading = uploadingId === g.id;
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
                        {g.format === "zodiac" ? "Zodiac: number length + signs" : "Digit length"}
                      </div>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Digits (number pad)
                        <select
                          className="mt-1 h-10 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-bold"
                          value={g.digits || 4}
                          onChange={(e) => updateGame(g.id, { digits: parseInt(e.target.value, 10) })}
                        >
                          {[2, 3, 4].map((d) => (
                            <option key={d} value={d}>
                              {d}-digit
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  <PrizeTiersEditor game={g} />

                  {g.format === "jackpot" && <ProgressiveJackpotEditor game={g} />}

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
                          className="h-14 w-14 rounded-xl border border-[var(--line)] object-cover"
                        />
                      ) : (
                        <div
                          className="grid h-14 w-14 place-items-center rounded-xl text-xs font-bold text-white"
                          style={{ background: g.color }}
                        >
                          No logo
                        </div>
                      )}
                      <label
                        className={`cursor-pointer rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white ${
                          uploading ? "opacity-60 pointer-events-none" : ""
                        }`}
                      >
                        {uploading ? "Uploading…" : "Upload logo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            void onLogoUpload(g, f);
                          }}
                        />
                      </label>
                      {g.logo && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600"
                          onClick={() => void onLogoRemove(g)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Days available (empty = every day)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((w) => {
                        const days = g.draw_days;
                        const on = !days || days.length === 0 || days.includes(w.d);
                        return (
                          <button
                            key={w.d}
                            type="button"
                            onClick={() => {
                              const current =
                                days && days.length ? [...days] : [0, 1, 2, 3, 4, 5, 6];
                              const next = current.includes(w.d)
                                ? current.filter((x) => x !== w.d)
                                : [...current, w.d].sort();
                              updateGame(g.id, {
                                draw_days: next.length === 7 ? undefined : next,
                              });
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                              on
                                ? "bg-indigo-600 text-white"
                                : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(g.format === "digit" || g.format === "zodiac" || g.format === "whe") && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Min stake ({currency})
                        <input
                          type="number"
                          step="0.25"
                          className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                          defaultValue={g.min_stake ?? 0.5}
                          onBlur={(e) =>
                            updateGame(g.id, { min_stake: parseFloat(e.target.value) || 0.5 })
                          }
                        />
                      </label>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Max stake ({currency})
                        <input
                          type="number"
                          step="0.25"
                          className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                          defaultValue={g.max_stake ?? 100}
                          onBlur={(e) =>
                            updateGame(g.id, { max_stake: parseFloat(e.target.value) || 100 })
                          }
                        />
                      </label>
                    </div>
                  )}

                  {g.format === "jackpot" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Main balls count / max
                        <span className="mt-1 flex gap-2">
                          <input
                            type="number"
                            className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                            defaultValue={g.main_count ?? 5}
                            onBlur={(e) =>
                              updateGame(g.id, { main_count: parseInt(e.target.value, 10) || 5 })
                            }
                          />
                          <input
                            type="number"
                            className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                            defaultValue={g.main_max ?? 30}
                            onBlur={(e) =>
                              updateGame(g.id, { main_max: parseInt(e.target.value, 10) || 30 })
                            }
                          />
                        </span>
                      </label>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Mega count / max
                        <span className="mt-1 flex gap-2">
                          <input
                            type="number"
                            className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                            defaultValue={g.mega_count ?? 1}
                            onBlur={(e) =>
                              updateGame(g.id, { mega_count: parseInt(e.target.value, 10) || 1 })
                            }
                          />
                          <input
                            type="number"
                            className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                            defaultValue={g.mega_max ?? 10}
                            onBlur={(e) =>
                              updateGame(g.id, { mega_max: parseInt(e.target.value, 10) || 10 })
                            }
                          />
                        </span>
                      </label>
                    </div>
                  )}

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Sessions (optional multi-draw)
                    </div>
                    {(g.sessions || []).map((s, si) => (
                      <div key={s.id} className="mb-2 flex flex-wrap gap-2">
                        <input
                          className="h-9 flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                          defaultValue={s.label}
                          placeholder="Label"
                          onBlur={(e) => {
                            const sessions = [...(g.sessions || [])];
                            sessions[si] = { ...sessions[si], label: e.target.value };
                            updateGame(g.id, { sessions });
                          }}
                        />
                        <input
                          className="h-9 w-24 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                          defaultValue={s.draw_time}
                          placeholder="Draw"
                          onBlur={(e) => {
                            const sessions = [...(g.sessions || [])];
                            sessions[si] = { ...sessions[si], draw_time: e.target.value };
                            updateGame(g.id, { sessions });
                          }}
                        />
                        <input
                          className="h-9 w-24 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                          defaultValue={s.cutoff}
                          placeholder="Cutoff"
                          onBlur={(e) => {
                            const sessions = [...(g.sessions || [])];
                            sessions[si] = { ...sessions[si], cutoff: e.target.value };
                            updateGame(g.id, { sessions });
                          }}
                        />
                        <button
                          type="button"
                          className="text-rose-600"
                          onClick={() => {
                            const sessions = (g.sessions || []).filter((_, i) => i !== si);
                            updateGame(g.id, { sessions });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-600"
                      onClick={() => {
                        const sessions: GameSession[] = [
                          ...(g.sessions || []),
                          {
                            id: `s${Date.now()}`,
                            label: "Session",
                            draw_time: g.draw_time,
                            cutoff: g.cutoff,
                          },
                        ];
                        updateGame(g.id, { sessions });
                      }}
                    >
                      + Add session
                    </button>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Bet types enabled for this game
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {betTypes.map((bt) => {
                        const on = (g.bet_types || []).includes(bt.key);
                        return (
                          <button
                            key={bt.key}
                            type="button"
                            onClick={() => {
                              const cur = g.bet_types || [];
                              const next = on
                                ? cur.filter((k) => k !== bt.key)
                                : [...cur, bt.key];
                              updateGame(g.id, { bet_types: next });
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              on
                                ? "bg-indigo-600 text-white"
                                : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"
                            }`}
                          >
                            {bt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Delete ${g.name}?`)) return;
                      void removeLogo(g.logo);
                      deleteGame(g.id);
                      setOpenId(null);
                      toast("Deleted");
                    }}
                    className="flex items-center gap-1 text-sm font-semibold text-rose-600"
                  >
                    <Trash2 size={14} /> Delete game
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h3 className="mb-3 font-bold">Global bet types</h3>
        <div className="space-y-2">
          {betTypes.map((bt) => (
            <div
              key={bt.key}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--key)]/40 p-2"
            >
              <span className="min-w-[100px] text-sm font-semibold">{bt.label}</span>
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                Multiplier
                <input
                  type="number"
                  className="ml-1 h-8 w-20 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                  defaultValue={bt.multiplier}
                  onBlur={(e) =>
                    updateBetType(bt.key, { multiplier: parseFloat(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={bt.enabled}
                  onChange={(e) => updateBetType(bt.key, { enabled: e.target.checked })}
                />
                On
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
