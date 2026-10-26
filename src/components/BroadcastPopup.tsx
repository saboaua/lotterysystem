"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Printer, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { expandBroadcastText } from "@/lib/broadcast-tokens";

/**
 * Seller-side popup for active owner broadcasts.
 * Auto-hides when duration elapses; optional print once.
 */
export function BroadcastPopup() {
  const {
    user,
    broadcast,
    clearBroadcast,
    games,
    retailers,
    selectedRetailerId,
    currency,
  } = useStore();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [printedId, setPrintedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const isSeller = user?.role === "retailer";

  useEffect(() => {
    if (!broadcast) return;
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, [broadcast?.id]);

  const stillActive = useMemo(() => {
    if (!broadcast) return false;
    const ends =
      new Date(broadcast.sent_at).getTime() +
      broadcast.duration_minutes * 60_000;
    return Date.now() < ends;
  }, [broadcast]);

  const shop = retailers.find((r) => r.id === selectedRetailerId);
  const jpGame = games.find((g) => g.format === "jackpot" && g.jackpot_current);

  const body = useMemo(() => {
    if (!broadcast) return "";
    return expandBroadcastText(broadcast.text, {
      game: broadcast.preview_game || jpGame?.name || games[0]?.name,
      retailer: broadcast.preview_retailer || shop?.name,
      jackpot: broadcast.preview_amount ?? jpGame?.jackpot_current,
      amount: broadcast.preview_amount ?? jpGame?.jackpot_current,
      currency,
    });
  }, [broadcast, jpGame, shop, games, currency]);

  useEffect(() => {
    if (
      !isSeller ||
      !broadcast ||
      !stillActive ||
      !broadcast.print ||
      printedId === broadcast.id
    )
      return;
    try {
      const w = window.open("", "_blank", "width=400,height=300");
      if (!w) return;
      w.document.write(
        `<pre style="font-family:monospace;padding:16px;font-size:14px">${
          broadcast.title ? broadcast.title + "\\n\\n" : ""
        }${body.replace(/</g, "<")}</pre>`
      );
      w.document.close();
      w.print();
      setPrintedId(broadcast.id);
    } catch {
      /* ignore */
    }
  }, [isSeller, broadcast, stillActive, body, printedId]);

  if (!isSeller || !broadcast || !stillActive || dismissedId === broadcast.id) {
    return null;
  }

  const endsAt =
    new Date(broadcast.sent_at).getTime() + broadcast.duration_minutes * 60_000;
  const minsLeft = Math.max(1, Math.ceil((endsAt - Date.now()) / 60_000));

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              <Megaphone size={18} />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Broadcast
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {broadcast.title || "Announcement"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700">
              {minsLeft} min
            </span>
            <button
              type="button"
              onClick={() => setDismissedId(broadcast.id)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{body}</p>
        {broadcast.print && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <Printer size={12} /> Printed on this terminal
          </div>
        )}
        <button
          type="button"
          onClick={() => setDismissedId(broadcast.id)}
          className="w-full rounded-full bg-violet-600 py-2.5 text-sm font-bold text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
