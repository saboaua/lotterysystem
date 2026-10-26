"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, GameSession } from "@/lib/types";
import { PrizeTiersEditor } from "./PrizeTiersEditor";
import { defaultPrizeTiersForFormat } from "@/lib/prize-tiers";

const WEEKDAYS = [
  { d: 0, label: "Sun" },
  { d: 1, label: "Mon" },
  { d: 2, label: "Tue" },
  { d: 3, label: "Wed" },
  { d: 4, label: "Thu" },
  { d: 5, label: "Fri" },
  { d: 6, label: "Sat" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function GamesPanel() {
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
      draw_days: [0, 1, 2, 3, 4, 5, 6],
      min_stake: 0.5,
      max_stake: 100,
      bet_types: ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"],
      sessions: [{ id: "midday", label: "Midday", draw_time: "13:00", cutoff: "12:45" }],
      prize_tiers: defaultPrizeTiersForFormat("digit", 4),
    };
    addGame(g);
    setOpenId(id);
    toast("Game added");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Games & schedule</h2>
          <p className="text-xs text-[var(--mut)]">
            Logo · draws · min/max · weekdays · prize tiers · Zodiac + Play Whe
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
                          ? `JP ${g.main_count}/${g.main_max}`
                          : g.format}
                    {" · "}draw {g.draw_time}
                    {g.sessions?.length ? ` · ${g.sessions.length} session(s)` : ""}
                    {g.min_stake != null ? ` · min ${currency} ${g.min_stake}` : ""}
                    {g.prize_tiers?.length ? ` · ${g.prize_tiers.length} prize tier(s)` : ""}
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
                          }
                          updateGame(g.id, patch);
                        }}
                      >
                        <option value="digit">Digit number</option>
                        <option value="zodiac">Zodiac (number + sign)</option>
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
                            const url = await fileToDataUrl(f);
                            updateGame(g.id, { logo: url });
                            toast("Logo saved");
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
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
                      <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
                        Fixed ticket price (jackpot)
                      </div>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Price ({currency})
                        <input
                          type="number"
                          step="0.25"
                          className="mt-1 h-10 w-full max-w-xs rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                          defaultValue={g.min_stake ?? 1}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value) || 1;
                            updateGame(g.id, { min_stake: v, max_stake: v });
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <SessionsEditor game={g} />

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
                              [
                                "4_cifra",
                                "3_cifra",
                                "2_cifra_3ch",
                                "4_skina",
                                "3_skina",
                                "2_cifra_bf",
                                "2_cifra_b",
                              ].includes(b.key)
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
                                      updateBetType(b.key, {
                                        multiplier: parseFloat(e.target.value) || 1,
                                      })
                                    }
                                  />
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

function SessionsEditor({ game }: { game: Game }) {
  const { updateGame, toast } = useStore();
  const sessions = game.sessions || [];

  function setSessions(next: GameSession[]) {
    updateGame(game.id, { sessions: next });
  }

  function addSession() {
    const n = sessions.length + 1;
    setSessions([
      ...sessions,
      {
        id: `s${Date.now().toString(36)}`,
        label: `Draw ${n}`,
        draw_time: game.draw_time || "13:00",
        cutoff: game.cutoff || "12:45",
      },
    ]);
    toast("Draw session added");
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase text-[var(--mut)]">
          Draws for the day (sessions)
        </div>
        <button
          type="button"
          onClick={addSession}
          className="flex items-center gap-1 rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-bold text-indigo-600"
        >
          <Plus size={12} /> Add draw
        </button>
      </div>
      {sessions.length === 0 && (
        <p className="mb-2 text-xs text-[var(--mut)]">No sessions — uses default draw/cut-off.</p>
      )}
      <div className="space-y-2">
        {sessions.map((s, idx) => (
          <div
            key={s.id}
            className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-lg border border-[var(--line)] bg-[var(--key)]/40 p-2"
          >
            <label className="text-[10px] font-semibold text-[var(--mut)]">
              Label
              <input
                className="mt-0.5 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={s.label}
                onBlur={(e) => {
                  const next = sessions.map((x, i) =>
                    i === idx ? { ...x, label: e.target.value } : x
                  );
                  setSessions(next);
                }}
              />
            </label>
            <label className="text-[10px] font-semibold text-[var(--mut)]">
              Draw
              <input
                className="mt-0.5 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={s.draw_time}
                onBlur={(e) => {
                  const next = sessions.map((x, i) =>
                    i === idx ? { ...x, draw_time: e.target.value } : x
                  );
                  setSessions(next);
                }}
              />
            </label>
            <label className="text-[10px] font-semibold text-[var(--mut)]">
              Cut-off
              <input
                className="mt-0.5 h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 text-sm"
                defaultValue={s.cutoff}
                onBlur={(e) => {
                  const next = sessions.map((x, i) =>
                    i === idx ? { ...x, cutoff: e.target.value } : x
                  );
                  setSessions(next);
                }}
              />
            </label>
            <button
              type="button"
              className="mb-1 text-rose-600"
              onClick={() => setSessions(sessions.filter((_, i) => i !== idx))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
