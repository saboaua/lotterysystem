"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { FastPlayGame, FastPlayPrice } from "@/lib/types";

const PRICE_POINTS: FastPlayPrice[] = [2, 3, 5, 7];
const QTY_OPTIONS = [1, 2, 5, 10];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatPrize(n: number) {
  return n.toLocaleString("en-US");
}

export function FastPlaySellGrid() {
  const { fastPlayGames, currency, addLine, toast } = useStore();
  const [price, setPrice] = useState<FastPlayPrice>(2);
  const [qty, setQty] = useState(1);

  const available = useMemo(
    () =>
      [...fastPlayGames]
        .filter((g) => g.active && g.show_on_sell)
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
        ),
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
      {/* Price point + Qty toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Price point
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_POINTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrice(p)}
              className={
                "h-9 min-w-[4.25rem] rounded-full px-3.5 text-sm font-extrabold transition " +
                (price === p
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700")
              }
            >
              {currency} {p}
            </button>
          ))}
        </div>

        <span className="ml-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Qty
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QTY_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQty(n)}
              className={
                "grid h-9 min-w-[2.75rem] place-items-center rounded-full px-2.5 text-xs font-extrabold transition " +
                (qty === n
                  ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900"
                  : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700")
              }
            >
              {n}×
            </button>
          ))}
        </div>
      </div>

      {/* Game tiles — logo fills tile, no outline box */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {available.map((g) => {
          const can = g.prices.includes(price);
          const badge = can ? price : g.default_price;
          const footer = can
            ? `ADD ${qty}× @ ${currency} ${price}`
            : g.prices.length === 1
              ? `ONLY ${currency} ${g.prices[0]}`
              : `ONLY ${currency} ${g.prices.join(" · ")}`;

          return (
            <button
              key={g.id}
              type="button"
              disabled={!can}
              onClick={() => {
                if (!can) return;
                sellOne(g, price, qty);
              }}
              className={
                "group relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-2xl text-left shadow-md transition " +
                (can
                  ? "text-white hover:brightness-105 active:scale-[0.98]"
                  : "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-500 dark:ring-slate-700")
              }
              style={
                can
                  ? {
                      background:
                        "linear-gradient(165deg, " +
                        g.color +
                        " 0%, color-mix(in srgb, " +
                        g.color +
                        " 55%, #0f172a) 100%)",
                    }
                  : undefined
              }
            >
              {/* Corner price badge */}
              <span
                className={
                  "absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums shadow " +
                  (can
                    ? "bg-black/60 text-white"
                    : "bg-slate-300/90 text-slate-600 dark:bg-slate-700 dark:text-slate-300")
                }
              >
                {currency} {badge}
              </span>

              {/* Logo fills most of the tile — no border/outline box */}
              <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1.5 pb-0.5 pt-6">
                {g.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.logo}
                    alt=""
                    className={
                      "h-28 w-full max-w-[9.5rem] shrink-0 object-contain drop-shadow-md sm:h-32 " +
                      (can ? "" : "opacity-70")
                    }
                  />
                ) : (
                  <div
                    className={
                      "grid h-28 w-28 shrink-0 place-items-center rounded-2xl text-2xl font-black sm:h-32 sm:w-32 " +
                      (can
                        ? "bg-black/25 text-white"
                        : "bg-slate-200 text-slate-400 dark:bg-slate-700")
                    }
                  >
                    FP
                  </div>
                )}

                <div className="text-center">
                  <div
                    className={
                      "text-[13px] font-extrabold leading-tight " + (can ? "drop-shadow-sm" : "")
                    }
                  >
                    {g.name}
                  </div>
                  {g.top_prize != null ? (
                    <div
                      className={
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                        (can
                          ? "bg-black/25 text-white/95"
                          : "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80")
                      }
                    >
                      <span
                        className={
                          "grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] " +
                          (can
                            ? "bg-amber-400/90 text-amber-950"
                            : "bg-slate-300 text-slate-500")
                        }
                        aria-hidden
                      >
                        ¢
                      </span>
                      <span>
                        TOP {currency} {formatPrize(Number(g.top_prize))}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Footer CTA */}
              <div
                className={
                  "px-2 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide " +
                  (can
                    ? "bg-black/30 text-white"
                    : "bg-slate-200/90 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400")
                }
              >
                {footer}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
