"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Copy,
  Delete,
  Dice5,
  Printer,
  RotateCcw,
  Ticket,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, TicketLine } from "@/lib/types";
import { ZODIAC_SYMBOLS } from "@/lib/constants";
import { printReceipt } from "@/lib/print-receipt";
import {
  SessionsPicker,
  MultiDrawPicker,
  ZodiacPicker,
  PlayWhePicker,
  JackpotPicker,
} from "@/components/sell/GamePickers";
import { FastPlaySellGrid } from "@/components/sell/FastPlaySellGrid";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [0.5, 1, 2, 3, 5, 7, 10, 20, 50, 100];
const BUMPS = [0.5, 1, 5];

export function SellScreen() {
  const {
    games,
    fastPlayGames,
    betTypes,
    currency,
    lines,
    addLine,
    removeLine,
    clearLines,
    sellTicket,
    selectedRetailerId,
    retailers,
    total,
    toast,
    brand,
    ticketDesign,
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
  const [amt, setAmt] = useState("2");
  const [field, setField] = useState<"num" | "amt">("num");
  const [date, setDate] = useState(today());
  const [session, setSession] = useState("");
  const [multiDraw, setMultiDraw] = useState(1);
  const [heldLines, setHeldLines] = useState<TicketLine[] | null>(null);
  const [lastPlay, setLastPlay] = useState<{
    num: string;
    amt: string;
    bt: string;
  } | null>(null);
  const [zodiacPick, setZodiacPick] = useState<string[]>([]);
  const [allZodiac, setAllZodiac] = useState(false);
  const [whePick, setWhePick] = useState<number | null>(null);
  const [jackBalls, setJackBalls] = useState<string[]>([]);
  const [jackMega, setJackMega] = useState<string | null>(null);
  const [sellTab, setSellTab] = useState<"lottery" | "fast_play">("lottery");

  const primary: Game | undefined = useMemo(
    () => (sel.length ? enabled.find((g) => g.id === sel[0]) : undefined),
    [enabled, sel]
  );

  // Rest of file is large - this is incomplete on purpose to test
  return <div>SellScreen loading...</div>;
}

export default SellScreen;
