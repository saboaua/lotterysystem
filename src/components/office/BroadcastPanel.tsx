"use client";

import { useMemo, useState } from "react";
import { Megaphone, Printer, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { expandBroadcastText, BROADCAST_TOKEN_HELP } from "@/lib/broadcast-tokens";
import type { BroadcastMessage } from "@/lib/types";

const PRESETS = [
  {
    label: "Jackpot win",
    text: "{game} was won at {retailer} for jackpot amount {currency} {jackpot}",
  },
  {
    label: "Big win",
    text: "Congratulations! {game} won {currency} {amount} at {retailer}",
  },
  {
    label: "System notice",
    text: "Important: please check the latest draw results for {game}.",
  },
];

export function BroadcastPanel() {
  const {
    games,
    retailers,
    currency,
    broadcast,
    sendBroadcast,
    clearBroadcast,
    toast,
  } = useStore();

  const [title, setTitle] = useState("Announcement");
  const [text, setText] = useState(
    "{game} was won at {retailer} for jackpot amount {currency} {jackpot}"
  );
  const [minutes, setMinutes] = useState(5);
  const [print, setPrint] = useState(false);
  const [previewGame, setPreviewGame] = useState(games[0]?.name || "Lotto Mac");
  const [previewRetailer, setPreviewRetailer] = useState(
    retailers[0]?.name || "Main Shop"
  );
  const [previewAmount, setPreviewAmount] = useState(150000);

  const previewBody = useMemo(
    () =>
      expandBroadcastText(text, {
        game: previewGame,
        retailer: previewRetailer,
        jackpot: previewAmount,
        amount: previewAmount,
        currency,
      }),
    [text, previewGame, previewRetailer, previewAmount, currency]
  );

  const active = broadcast;
  const remainingMin = active
    ? Math.max(
        0,
        Math.ceil(
          (new Date(active.sent_at).getTime() +
            active.duration_minutes * 60_000 -
            Date.now()) /
            60_000
        )
      )
    : 0;

  function onSend() {
    if (!text.trim()) {
      toast("Enter a message", true);
      return;
    }
    const msg: Omit<BroadcastMessage, "id" | "sent_at"> = {
      text: text.trim(),
      title: title.trim() || undefined,
      duration_minutes: Math.max(1, Math.min(120, minutes || 5)),
      print,
      preview_game: previewGame,
      preview_retailer: previewRetailer,
      preview_amount: previewAmount,
    };
    sendBroadcast(msg);
    toast(`Broadcast sent · ${msg.duration_minutes} min on seller screens`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="text-violet-600" size={22} />
          <div>
            <h2 className="text-lg font-bold">Broadcast to sellers</h2>
            <p className="text-xs text-slate-500">
              Popup on every sell terminal · set how many minutes it stays · optional print
            </p>
          </div>
        </div>

        {active && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <span>
              <strong>Live now</strong> · ~{remainingMin} min left · “
              {(active.title || active.text).slice(0, 48)}
              {(active.title || active.text).length > 48 ? "…" : "”}
            </span>
            <button
              type="button"
              onClick={() => {
                clearBroadcast();
                toast("Broadcast cleared");
              }}
              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-600 shadow dark:bg-slate-800"
            >
              Clear now
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-[11px] font-semibold text-slate-500">
              Title
              <input
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="block text-[11px] font-semibold text-slate-500">
              Message
              <textarea
                className="mt-1 h-28 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <p className="text-[10px] text-slate-400">{BROADCAST_TOKEN_HELP}</p>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setText(p.text)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-slate-500">
                On screen (minutes)
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-600 dark:bg-slate-800"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 5)}
                />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={print}
                  onChange={(e) => setPrint(e.target.checked)}
                />
                <Printer size={14} /> Print on seller
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-[11px] font-semibold text-slate-500">
                Preview game
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-600 dark:bg-slate-800"
                  value={previewGame}
                  onChange={(e) => setPreviewGame(e.target.value)}
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-slate-500">
                Preview retailer
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-600 dark:bg-slate-800"
                  value={previewRetailer}
                  onChange={(e) => setPreviewRetailer(e.target.value)}
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-slate-500">
                Preview amount
                <input
                  type="number"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(parseFloat(e.target.value) || 0)}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onSend}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 py-3 text-sm font-bold text-white shadow-md shadow-violet-600/25"
            >
              <Send size={16} /> Send broadcast
            </button>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Preview · how it appears on seller
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-900/90 p-6 shadow-inner dark:border-slate-600">
              <div className="pointer-events-none absolute inset-0 bg-black/40" />
              <div className="relative mx-auto max-w-sm space-y-3 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700">
                      <Megaphone size={16} />
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-violet-600">
                        Broadcast
                      </div>
                      <div className="text-sm font-extrabold">{title || "Announcement"}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {minutes} min
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{previewBody}</p>
                {print && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Printer size={12} /> Will print on terminal
                  </div>
                )}
                <button
                  type="button"
                  className="w-full rounded-full bg-violet-600 py-2 text-xs font-bold text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
