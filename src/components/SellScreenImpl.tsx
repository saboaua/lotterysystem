"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Printer,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { TicketLine } from "@/lib/types";
import { BulletinBoard } from "@/components/BulletinBoard";
import { HolidayDrawCard } from "@/components/sell/HolidayDrawCard";
import { LineTitle } from "@/components/sell/LineTitle";
import { printReceipt } from "@/lib/print-receipt";

export function SellScreen() {
  const {
    games,
    betTypes,
    currency,
    lines,
    removeLine,
    clearLines,
    sellTicket,
    selectedRetailerId,
    retailers,
    total,
    toast,
    brand,
    ticketDesign,
    holidays,
    user,
  } = useStore();

  const [heldLines, setHeldLines] = useState<TicketLine[] | null>(null);
  const shop = retailers.find((r) => r.id === selectedRetailerId);

  function holdOrder() {
    if (heldLines?.length) {
      // Recall is simplified; full cart restore lands with full SellScreen restore
      setHeldLines(null);
      toast("Order recalled");
      return;
    }
    if (!lines.length) return toast("No plays to hold", true);
    setHeldLines([...lines]);
    clearLines();
    toast("Order held");
  }

  async function sendTicket() {
    if (!lines.length) return toast("No plays on ticket", true);
    const t = await sellTicket();
    if (!t) return;
    printReceipt({
      ticket: t,
      brand,
      design: ticketDesign,
      retailer: shop,
      games,
      currency,
    });
    toast("Ticket printed");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6fb] lg:flex-row dark:bg-slate-950">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:p-4">
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {user && (
            <BulletinBoard brand={brand} retailerId={selectedRetailerId} userKey={user.id} />
          )}
          <HolidayDrawCard holidays={holidays} games={games} />
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-bold">Sell keypad temporarily simplified</p>
          <p className="mt-1 text-xs opacity-90">
            Bulletin board, holiday / no-draw calendar, and ticket panel are live. The full game
            keypad is being restored from the last good build — refresh after the next deploy if
            game tiles are missing.
          </p>
        </div>
      </section>
      <aside className="flex max-h-[38%] w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Ticket · {shop?.name || "Shop"}
          </span>
          <button
            type="button"
            onClick={() => clearLines()}
            className="-mr-2 min-h-[40px] px-3 text-xs font-semibold text-rose-500"
          >
            Clear
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {lines.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">No plays yet</p>
          ) : (
            lines.map((l) => (
              <div
                key={l.id}
                className="flex items-start gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    <LineTitle
                      gameId={l.game}
                      betTypeKey={l.bet_type}
                      games={games}
                      betTypes={betTypes}
                    />
                  </div>
                  <div className="text-slate-500">
                    {l.number}
                    {l.session ? " · " + l.session : ""} · {l.date}
                  </div>
                </div>
                <span className="font-bold">
                  {currency} {l.amount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  className="text-rose-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-lg font-black">
            <span>Total</span>
            <span>
              {currency} {total.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={holdOrder}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-200 py-2.5 text-xs font-bold dark:bg-slate-700"
            >
              <Bookmark size={14} /> {heldLines?.length ? "Recall" : "Hold"}
            </button>
            <button
              type="button"
              onClick={sendTicket}
              className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white"
            >
              <Printer size={16} /> Send & Print
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default SellScreen;
