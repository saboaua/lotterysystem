"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { FastPlayGame, FastPlayPrice } from "@/lib/types";

const ALL_PRICES: FastPlayPrice[] = [2, 3, 5, 7];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function FastPlayPanel() {
  const {
    fastPlayGames,
    updateFastPlayGame,
    addFastPlayGame,
    deleteFastPlayGame,
    toast,
    currency,
  } = useStore();
  const [openId, setOpenId] = useState<string | null>(fastPlayGames[0]?.id ?? null);

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
      sort_order: sorted.length + 1,
    };
    addFastPlayGame(g);
    setOpenId(id);
    toast("Fast Play game added");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Fast Play games</h2>
          <p className="text-xs text-[var(--mut)]">
            Instant / scratch-style titles · fixed prices {currency} 2 · 3 · 5 · 7 · active & show on
            sell
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
                {g.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.logo} alt="" className="h-10 w-10 rounded-xl object-cover" />
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
                    <label className="text-[11px] font-semibold text-[var(--mut)]">
                      Sort order
                      <input
                        type="number"
                        className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                        defaultValue={g.sort_order ?? 0}
                        onBlur={(e) =>
                          updateFastPlayGame(g.id, {
                            sort_order: parseInt(e.target.value, 10) || 0,
                          })
                        }
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
                      <label className="cursor-pointer rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white">
                        Upload logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > 400_000) return toast("Logo max 400KB", true);
                            const url = await fileToDataUrl(f);
                            updateFastPlayGame(g.id, { logo: url });
                            toast("Logo saved");
                          }}
                        />
                      </label>
                      {g.logo && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600"
                          onClick={() => updateFastPlayGame(g.id, { logo: "" })}
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
