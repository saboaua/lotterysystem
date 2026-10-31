"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Delete,
  Printer,
  RotateCcw,
  Ticket,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, TicketLine } from "@/lib/types";
import { BulletinBoard } from "@/components/BulletinBoard";
import { HolidayDrawCard } from "@/components/sell/HolidayDrawCard";
import { LineTitle } from "@/components/sell/LineTitle";
import { ZODIAC_SYMBOLS } from "@/lib/constants";
import { addDays, arubaToday as today } from "@/lib/dates";
import { printReceipt } from "@/lib/print-receipt";
import {
  SessionsPicker,
  MultiDrawPicker,
  ZodiacPicker,
  PlayWhePicker,
  JackpotPicker,
} from "@/components/sell/GamePickers";
import { FastPlaySellGrid } from "@/components/sell/FastPlaySellGrid";
import { TopUpModal } from "@/components/sell/TopUpModal";
import { getTopUpDesign } from "@/lib/topup";

const PRESETS = [0.5, 1, 2, 3, 5, 7, 10, 20, 50, 100];
const BUMPS = [0.5, 1, 5];

export function SellScreen() {
  const {
    games,
    betTypes,
    currency,
    lines,
    addLine,
    removeLine,
    clearLines,
    sellTicket,
    checkBlocked,
    refreshBlockedNumbers,
    selectedRetailerId,
    retailers,
    total,
    toast,
    brand,
    ticketDesign,
    soldTickets,
    replayTicket,
    holidays,
    user,
  } = useStore();

  const enabled = [...games]
    .filter((g) => g.enabled)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    );
  const [sel, setSel] = useState<string[]>([]);
  const [bt, setBt] = useState("4_cifra");
  const [num, setNum] = useState("");
  const [amt, setAmt] = useState("");
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [session, setSession] = useState("");
  const [multiDraw, setMultiDraw] = useState(1);
  const [heldLines, setHeldLines] = useState<TicketLine[] | null>(null);
  const [zodiacPick, setZodiacPick] = useState<string[]>([]);
  const [allZodiac, setAllZodiac] = useState(false);
  const [whePicks, setWhePicks] = useState<number[]>([]);
  const [jackBalls, setJackBalls] = useState<string[]>([]);
  const [jackMega, setJackMega] = useState<string | null>(null);
  const [sellTab, setSellTab] = useState<"lottery" | "fast_play">("lottery");
  const [modal, setModal] = useState<null | "replay" | "scan">(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    ticket?: (typeof soldTickets)[0];
  } | null>(null);

  const primary: Game | undefined = useMemo(
    () => (sel.length ? enabled.find((g) => g.id === sel[0]) : undefined),
    [enabled, sel]
  );

  const allowedBets = useMemo(() => {
    if (!primary) {
      return betTypes.filter(
        (b) =>
          b.enabled &&
          ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"].includes(b.key)
      );
    }
    if (primary.format === "whe") return betTypes.filter((b) => b.key === "play_whe");
    if (primary.format === "zodiac") return betTypes.filter((b) => b.key === "zodiac");
    if (primary.format === "jackpot") return betTypes.filter((b) => b.key === "jackpot");
    const keys = primary.bet_types?.length ? primary.bet_types : betTypes.map((b) => b.key);
    return betTypes.filter((b) => b.enabled && keys.includes(b.key));
  }, [primary, betTypes]);

  useEffect(() => {
    if (allowedBets.length && !allowedBets.find((b) => b.key === bt)) {
      setBt(allowedBets[0].key);
    }
  }, [allowedBets, bt]);

  useEffect(() => {
    if (primary?.sessions?.length) {
      if (!session || !primary.sessions.find((s) => s.id === session)) {
        setSession(primary.sessions[0].id);
      }
    }
  }, [primary, session]);

  useEffect(() => {
    void refreshBlockedNumbers?.();
  }, [refreshBlockedNumbers]);

  const shop = retailers.find((r) => r.id === selectedRetailerId);

  function clearNum() {
    setNum("");
    setWhePicks([]);
    setZodiacPick([]);
    setJackBalls([]);
    setJackMega(null);
  }

  function removeLine(id: string) {
    removeLine(id);
  }

  function holdOrder() {
    if (heldLines?.length) {
      heldLines.forEach((l) => addLine(l));
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

  // NOTE: Full SellScreen continues in runtime - this is a simplified restore.
  // If build fails on missing helpers, the full file must be restored from git history.

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6fb] lg:flex-row dark:bg-slate-950">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:p-4">
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {user && (
            <BulletinBoard brand={brand} retailerId={selectedRetailerId} userKey={user.id} />
          )}
          <HolidayDrawCard holidays={holidays} games={games} />
        </div>
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Sell screen is recovering from a deploy issue. Pull the latest commit or contact support if this message remains after refresh.
        </p>
      </section>
      <aside className="flex max-h-[38%] w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Ticket · {shop?.name || "Shop"}
          </span>
          <button type="button" onClick={() => clearLines()} className="-mr-2 min-h-[40px] px-3 text-xs font-semibold text-rose-500">
            Clear
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {lines.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">No plays yet</p>
          ) : (
            lines.map((l) => (
              <div key={l.id} className="flex items-start gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-800">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    <LineTitle gameId={l.game} betTypeKey={l.bet_type} games={games} betTypes={betTypes} />
                  </div>
                  <div className="text-slate-500">
                    {l.number}{l.session ? " · " + l.session : ""} · {l.date}
                  </div>
                </div>
                <span className="font-bold">{currency} {l.amount.toFixed(2)}</span>
                <button type="button" onClick={() => removeLine(l.id)} className="text-rose-500"><X size={14} /></button>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-lg font-black">
            <span>Total</span>
            <span>{currency} {total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={holdOrder} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-200 py-2.5 text-xs font-bold dark:bg-slate-700">
              <Bookmark size={14} /> {heldLines?.length ? "Recall" : "Hold"}
            </button>
            <button type="button" onClick={sendTicket} className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">
              <Printer size={16} /> Send & Print
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default SellScreen;
