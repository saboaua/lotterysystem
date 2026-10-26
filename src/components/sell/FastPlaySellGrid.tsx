"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { FastPlayGame, FastPlayPrice } from "@/lib/types";

const PRICE_POINTS: FastPlayPrice[] = [2, 3, 5, 7];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FastPlaySellGrid() {
  const { fastPlayGames, currency, addLine, toast } = useStore();
  const [price, setPrice] = useState<FastPlayPrice>(2);
  const [qty, setQty] = useState(1);

  const available = useMemo(
    () =>
      [...fastPlayGames]
        .filter((g) => g.active && g.show_on_sell)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)),
    [fastPlayGames]
  );

  function sellOne(g: FastPlayGame, amount: FastPlayPrice, count = 1) {
    if (!g.prices.includes(amount)) {
      toast(`${g.name} does not offer ${currency} ${amount}`, true);
      return;
    }
    for (let i = 0; i < count; i++) {
      addLine({
        game: g.id,
        bet_type: "fast_play",
        number: g.name,
        amount,
        date: today(),
      });
    }
    toast(
      count > 1
        ? `${count}× ${g.name} · ${currency} ${amount} each`
        : `${g.name} · ${currency} ${amount}`
    );
  }

  if (!available.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
        No Fast Play games on sell. Enable them in Office → Fast Play.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Price point
        </span>
        {PRICE_POINTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrice(p)}
            className={
              "h-10 min-w-[3.25rem] rounded-full px-3 text-sm font-extrabold shadow-sm " +
              (price === p
                ? "bg-rose-600 text-white ring-2 ring-rose-300"
                : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-200")
            }
          >
            {currency} {p}
          </button>
        ))}
        <span className="ml-2 text-[11px] font-bold uppercase text-slate-400">Qty</span>
        {[1, 2, 5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQty(n)}
            className={
              "h-9 min-w-[2.5rem] rounded-full px-2.5 text-xs font-bold " +
              (qty === n ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700")
            }
          >
            {n}×
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {available.map((g) => {
          const can = g.prices.includes(price);
          const badge = can ? price : g.default_price;
          return (
            <button
              key={g.id}
              type="button"
              disabled={!can}
              onClick={() => sellOne(g, can ? price : g.default_price, qty)}
              className={
                "relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl text-left text-white shadow-md transition " +
                (can ? "hover:brightness-110 active:scale-[0.98]" : "cursor-not-allowed opacity-40 grayscale")
              }
              style={{
                background:
                  "linear-gradient(160deg, " +
                  g.color +
                  ", color-mix(in srgb, " +
                  g.color +
                  " 45%, #111))",
              }}
            >
              <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-black tabular-nums shadow">
                {currency} {badge}
              </span>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 pt-8">
                {g.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.logo}
                    alt=""
                    className="h-16 w-16 rounded-2xl border-2 border-white/40 object-cover shadow-lg"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-black/25 text-lg font-black">
                    FP
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm font-extrabold leading-tight drop-shadow">{g.name}</div>
                  {g.top_prize != null ? (
                    <div className="mt-0.5 text-[10px] font-semibold opacity-90">
                      Top {currency} {Number(g.top_prize).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="bg-black/25 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide">
                {can ? `Add ${qty}× @ ${currency} ${price}` : `Only ${g.prices.map((p) => currency + " " + p).join(" · ")}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
