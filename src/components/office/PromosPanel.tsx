"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Promotion } from "@/lib/types";

export function PromosPanel() {
  const { promotions, games, addPromotion, updatePromotion, deletePromotion, toast, currency } =
    useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Promotion>>({});

  function startAdd() {
    setForm({
      name: "",
      label: "PROMO",
      instruction: "Visit www.shocolottery.com to check",
      code_len: 6,
      min_plays: 3,
      active: false,
    });
    setEditing("__new__");
  }

  function startEdit(p: Promotion) {
    setForm({ ...p });
    setEditing(p.id);
  }

  function save() {
    if (!form.name?.trim()) return toast("Name required", true);
    if (editing === "__new__") {
      const id = `p${Date.now().toString(36)}`;
      addPromotion({
        id,
        name: form.name!,
        label: form.label || "PROMO",
        instruction: form.instruction || "",
        code_len: form.code_len || 6,
        min_plays: form.min_plays,
        min_games: form.min_games,
        min_amount: form.min_amount,
        game_ids: form.game_ids,
        prize: form.prize,
        active: !!form.active,
        start: form.start,
        end: form.end,
        url: form.url,
      });
      toast("Promotion added");
    } else if (editing) {
      updatePromotion(editing, form);
      toast("Promotion updated");
    }
    setEditing(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Promotions</h2>
          <p className="text-xs text-[var(--mut)]">
            Min plays / games / amount · unique code printed on qualifying tickets.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Add promotion
        </button>
      </div>

      {editing && (
        <div className="space-y-3 rounded-2xl border border-indigo-300 bg-[var(--card)] p-4 shadow-sm">
          <h3 className="font-bold">{editing === "__new__" ? "New promotion" : "Edit promotion"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Name
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Label on ticket
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.label || ""}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)] sm:col-span-2">
              Instruction
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.instruction || ""}
                onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Code digits
              <input
                type="number"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.code_len ?? 6}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code_len: parseInt(e.target.value, 10) || 6 }))
                }
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Min plays
              <input
                type="number"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.min_plays ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_plays: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Min distinct games
              <input
                type="number"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.min_games ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_games: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Min amount
              <input
                type="number"
                step="0.25"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.min_amount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Prize ({currency})
              <input
                type="number"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                value={form.prize ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    prize: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">
              Scope to games (empty = all)
            </div>
            <div className="flex flex-wrap gap-2">
              {games.map((g) => {
                const on = form.game_ids?.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => {
                        const ids = new Set(f.game_ids || []);
                        if (ids.has(g.id)) ids.delete(g.id);
                        else ids.add(g.id);
                        return { ...f, game_ids: [...ids] };
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      on ? "bg-indigo-600 text-white" : "bg-[var(--key)]"
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full bg-[var(--key)] px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {promotions.map((p) => (
        <div
          key={p.id}
          className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold">{p.name}</span>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  p.active
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600"
                }`}
              >
                {p.active ? "Active" : "Off"}
              </span>
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="rounded-lg bg-indigo-600/10 px-2 py-1 text-[11px] font-bold text-indigo-600"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePromotion(p.id);
                  toast("Promotion deleted");
                }}
                className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-600"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-[var(--mut)]">
            Label «{p.label}» · {p.code_len}-digit code
            {p.min_plays ? ` · min ${p.min_plays} plays` : ""}
            {p.min_games ? ` · min ${p.min_games} games` : ""}
            {p.min_amount != null ? ` · min ${currency} ${p.min_amount}` : ""}
            {p.prize != null ? ` · prize ${currency} ${p.prize}` : ""}
          </p>
          <p className="text-xs text-[var(--mut)]">{p.instruction}</p>
          {p.game_ids?.length ? (
            <p className="mt-1 text-[11px] text-[var(--mut)]">
              Games:{" "}
              {p.game_ids.map((id) => games.find((g) => g.id === id)?.name || id).join(", ")}
            </p>
          ) : null}
        </div>
      ))}
      {!promotions.length && (
        <p className="text-sm text-[var(--mut)]">No promotions yet. Add one to print codes on tickets.</p>
      )}
    </div>
  );
}
