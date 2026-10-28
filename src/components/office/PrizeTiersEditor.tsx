"use client";

import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, PrizeMatchRule, PrizeTier } from "@/lib/types";
import { defaultPrizeTiersForFormat } from "@/lib/prize-tiers";

const RULES: { value: PrizeMatchRule; label: string }[] = [
  { value: "exact_and_sign", label: "Exact number + Zodiac sign" },
  { value: "exact", label: "Exact number only" },
  { value: "last_n_and_sign", label: "Last N digits + Zodiac sign" },
  { value: "last_n", label: "Last N digits only" },
  { value: "first_n", label: "First N digits only" },
  { value: "whe_mark", label: "Play Whe mark" },
  { value: "jackpot_main_mega", label: "Jackpot main + mega" },
  { value: "jackpot_main", label: "Jackpot main only" },
  { value: "fixed", label: "Fixed / custom" },
];

export function PrizeTiersEditor({ game }: { game: Game }) {
  const { updateGame, toast, currency, betTypes } = useStore();
  const tiers = game.prize_tiers || [];

  function setTiers(next: PrizeTier[]) {
    updateGame(game.id, { prize_tiers: next });
  }

  function addTier() {
    const rank = tiers.length + 1;
    setTiers([
      ...tiers,
      {
        id: `pt_${Date.now().toString(36)}`,
        rank,
        label: `${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}`,
        description: "New prize tier",
        amount: 0,
        rule:
          game.format === "zodiac"
            ? "exact_and_sign"
            : game.format === "whe"
              ? "whe_mark"
              : game.format === "jackpot"
                ? "jackpot_main"
                : "exact",
        digits: game.format === "zodiac" || game.format === "digit" ? 3 : undefined,
        enabled: true,
      },
    ]);
  }

  function loadDefaults() {
    setTiers(defaultPrizeTiersForFormat(game.format, game.digits));
    toast("Default prize structure loaded");
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase text-[var(--mut)]">
            Prize payout structure
          </div>
          <p className="text-[10px] text-[var(--mut)]">
            Used when draw calculation runs for this game. Highest matching rank wins per line.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadDefaults}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-bold"
          >
            Load defaults
          </button>
          <button
            type="button"
            onClick={addTier}
            className="flex items-center gap-1 rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-bold text-indigo-600"
          >
            <Plus size={12} /> Add tier
          </button>
        </div>
      </div>

      {!tiers.length && (
        <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
          No prize tiers — load defaults or add tiers so draw calculation can settle winners.
        </p>
      )}

      <div className="space-y-2">
        {tiers
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((t, idx) => (
            <div
              key={t.id}
              className="grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--key)]/40 p-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
            >
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                Rank
                <input
                  type="number"
                  className="mt-0.5 h-9 w-16 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm font-bold"
                  value={t.rank}
                  onChange={(e) => {
                    const next = tiers.map((x) =>
                      x.id === t.id ? { ...x, rank: parseInt(e.target.value, 10) || 1 } : x
                    );
                    setTiers(next);
                  }}
                />
              </label>
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                Label / description
                <input
                  className="mt-0.5 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                  value={t.label}
                  onChange={(e) => {
                    const next = tiers.map((x) =>
                      x.id === t.id ? { ...x, label: e.target.value } : x
                    );
                    setTiers(next);
                  }}
                  placeholder="1st"
                />
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                  value={t.description}
                  onChange={(e) => {
                    const next = tiers.map((x) =>
                      x.id === t.id ? { ...x, description: e.target.value } : x
                    );
                    setTiers(next);
                  }}
                  placeholder="match 4 numbers & Zodiac Sign"
                />
              </label>
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                Rule
                <select
                  className="mt-0.5 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                  value={t.rule}
                  onChange={(e) => {
                    const next = tiers.map((x) =>
                      x.id === t.id ? { ...x, rule: e.target.value as PrizeMatchRule } : x
                    );
                    setTiers(next);
                  }}
                >
                  {RULES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {(t.rule === "last_n" || t.rule === "last_n_and_sign" || t.rule === "first_n") && (
                  <input
                    type="number"
                    min={1}
                    max={6}
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                    value={t.digits ?? 3}
                    onChange={(e) => {
                      const next = tiers.map((x) =>
                        x.id === t.id
                          ? { ...x, digits: parseInt(e.target.value, 10) || 3 }
                          : x
                      );
                      setTiers(next);
                    }}
                    placeholder="N digits"
                  />
                )}
                {game.format === "digit" && (
                  <>
                    <select
                      className="mt-1 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                      value={t.position ?? 1}
                      title="Which drawn number this tier is matched against"
                      onChange={(e) => {
                        const position = parseInt(e.target.value, 10) as 1 | 2 | 3;
                        setTiers(tiers.map((x) => (x.id === t.id ? { ...x, position } : x)));
                      }}
                    >
                      <option value={1}>vs 1st prize number</option>
                      <option value={2}>vs 2nd prize number</option>
                      <option value={3}>vs 3rd prize number</option>
                    </select>
                    <select
                      className="mt-1 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-xs"
                      value={t.bet_type ?? ""}
                      title="Play type this prize applies to (paid per 1.00 wagered)"
                      onChange={(e) => {
                        const bet_type = e.target.value || undefined;
                        setTiers(tiers.map((x) => (x.id === t.id ? { ...x, bet_type } : x)));
                      }}
                    >
                      <option value="">Any play type</option>
                      {betTypes
                        .filter((b) => b.mode !== "jackpot" && b.mode !== "fast_play")
                        .map((b) => (
                          <option key={b.key} value={b.key}>
                            {b.label}
                          </option>
                        ))}
                    </select>
                  </>
                )}
              </label>
              <label className="text-[10px] font-semibold text-[var(--mut)]">
                Prize ({currency})
                <input
                  type="number"
                  step="0.01"
                  className="mt-0.5 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm font-bold"
                  value={t.amount}
                  onChange={(e) => {
                    const next = tiers.map((x) =>
                      x.id === t.id
                        ? { ...x, amount: parseFloat(e.target.value) || 0 }
                        : x
                    );
                    setTiers(next);
                  }}
                />
                <label className="mt-1 flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={t.enabled}
                    onChange={(e) => {
                      const next = tiers.map((x) =>
                        x.id === t.id ? { ...x, enabled: e.target.checked } : x
                      );
                      setTiers(next);
                    }}
                  />
                  Enabled
                </label>
              </label>
              <button
                type="button"
                className="self-start text-rose-600"
                title="Remove tier"
                onClick={() => setTiers(tiers.filter((x) => x.id !== t.id))}
              >
                <Trash2 size={14} />
              </button>
              {idx === 0 && game.format === "zodiac" && (
                <p className="sm:col-span-5 text-[10px] text-[var(--mut)]">
                  Example: 1st match 4 numbers &amp; sign {currency} 25.000 · 2nd match 4 numbers{" "}
                  {currency} 2.500 · 3rd last 3 + sign {currency} 500 · 4th last 3 {currency} 50
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
