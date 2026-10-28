"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
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
                  {/* REST OF FILE FROM LOCAL - truncated in this message intentionally; use push from local via alternative */}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
