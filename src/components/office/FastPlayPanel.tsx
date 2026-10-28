"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { FastPlayGame, FastPlayPrice } from "@/lib/types";
import { removeLogo, uploadLogo } from "@/lib/storage";

const ALL_PRICES: FastPlayPrice[] = [2, 3, 5, 7];

export function FastPlayPanel() {
  const {
    fastPlayGames,
    updateFastPlayGame,
    addFastPlayGame,
    deleteFastPlayGame,
    toast,
    currency,
  } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const sorted = [...fastPlayGames].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  );

  function onAdd() {
    const id = "fp_" + Date.now().toString(36);
    const g: FastPlayGame = {
      id,
      name: "New Fast Play",
      color: "#e11d48",
      prices: [2, 3, 5, 7],
      default_price: 2,
      active: true,
      show_on_sell: true,
      sort_order: sorted.length,
    };
    addFastPlayGame(g);
    setOpenId(id);
    toast("Fast Play game added");
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = sorted.map((g) => g.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    ids.forEach((id, index) => {
      const current = fastPlayGames.find((g) => g.id === id);
      if (current && (current.sort_order ?? 0) !== index) {
        updateFastPlayGame(id, { sort_order: index });
      }
    });
    toast("Order updated");
  }

  async function onLogoUpload(game: FastPlayGame, file: File | undefined) {
    if (!file) return;
    setUploadingId(game.id);
    try {
      const result = await uploadLogo(file, "fastplay", game.id);
      if (!result.ok) {
        toast(result.error, true);
        return;
      }
      void removeLogo(game.logo);
      updateFastPlayGame(game.id, { logo: result.url });
      toast("Logo saved");
    } finally {
      setUploadingId(null);
    }
  }

  async function onLogoRemove(game: FastPlayGame) {
    void removeLogo(game.logo);
    updateFastPlayGame(game.id, { logo: "" });
    toast("Logo removed");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Fast Play games</h2>
          <p className="text-xs text-[var(--mut)]">
            Instant / scratch-style titles · fixed prices {currency} 2 · 3 · 5 · 7 · drag to reorder
            display on sell screen
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add Fast Play
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
                  ? "border-rose-400 opacity-50"
                  : isOver
                    ? "border-rose-500 ring-2 ring-rose-500/30"
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
                    <img
                      src={g.logo}
                      alt=""
                      className="h-10 w-10 rounded-xl object-contain bg-white/10"
                    />
                  ) : (
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl text-xs font-black text-white"
                      style={{ background: g.color }}
                    >
                      FP
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{g.name}</span>
                    <span className="text-[11px] text-[var(--mut)]">
                      {g.prices.map((p) => currency + " " + p).join(" · ")}
                      {g.active ? "" : " · inactive"}
                      {g.show_on_sell ? " · on sell" : " · hidden on sell"}
                      {g.top_prize != null
                        ? ` · top ${currency} ${Number(g.top_prize).toLocaleString()}`
                        : ""}
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
                        onBlur={(e) => updateFastPlayGame(g.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Color
                      <input
                        type="color"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)]"
                        value={g.color}
                        onChange={(e) => updateFastPlayGame(g.id, { color: e.target.value })}
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={g.active}
                        onChange={(e) => updateFastPlayGame(g.id, { active: e.target.checked })}
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={g.show_on_sell}
                        onChange={(e) =>
                          updateFastPlayGame(g.id, { show_on_sell: e.target.checked })
                        }
                      />
                      Show on sell screen
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Top prize ({currency})
                      <input
                        type="number"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.top_prize ?? ""}
                        placeholder="Optional"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          updateFastPlayGame(g.id, {
                            top_prize: v ? parseFloat(v) : undefined,
                          });
                        }}
                      />
                    </label>
                  </div>

                  <label className="block text-[11px] font-semibold text-[var(--mut)]">
                    Description
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                      defaultValue={g.description || ""}
                      onBlur={(e) => updateFastPlayGame(g.id, { description: e.target.value })}
                    />
                  </label>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Price points ({currency})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PRICES.map((p) => {
                        const on = g.prices.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              let prices = on
                                ? g.prices.filter((x) => x !== p)
                                : [...g.prices, p].sort((a, b) => a - b);
                              if (!prices.length) prices = [2];
                              const default_price = prices.includes(g.default_price)
                                ? g.default_price
                                : prices[0];
                              updateFastPlayGame(g.id, { prices, default_price });
                            }}
                            className={`rounded-full px-4 py-2 text-sm font-bold ${
                              on
                                ? "bg-rose-600 text-white"
                                : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"
                            }`}
                          >
                            {currency} {p}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-3 block text-[11px] font-semibold text-[var(--mut)]">
                      Default price (tap tile)
                      <select
                        className="mt-1 h-10 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-bold"
                        value={g.default_price}
                        onChange={(e) =>
                          updateFastPlayGame(g.id, {
                            default_price: Number(e.target.value) as FastPlayPrice,
                          })
                        }
                      >
                        {g.prices.map((p) => (
                          <option key={p} value={p}>
                            {currency} {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                      Game logo (sell tile)
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {g.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.logo}
                          alt=""
                          className="h-14 w-14 rounded-xl border border-[var(--line)] object-contain bg-white/10"
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
                        className={`cursor-pointer rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white ${
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

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm("Delete " + g.name + "?")) return;
                      void removeLogo(g.logo);
                      deleteFastPlayGame(g.id);
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
    </div>
  );
}
