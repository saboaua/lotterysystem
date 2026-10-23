"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { AppUser, BetType, Game, Retailer, TicketLine } from "./types";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  CURRENCY,
  DEMO_BET_TYPES,
  DEMO_GAMES,
  DEMO_RETAILERS,
  DEMO_USERS,
} from "./demo-data";

interface Toast {
  id: number;
  message: string;
  err?: boolean;
}

interface Store {
  user: AppUser | null;
  games: Game[];
  retailers: Retailer[];
  betTypes: BetType[];
  currency: string;
  brand: string;
  tagline: string;
  selectedRetailerId: string;
  lines: TicketLine[];
  toasts: Toast[];
  loginAs: (userId: string) => void;
  logout: () => void;
  setSelectedRetailer: (id: string) => void;
  addLine: (line: Omit<TicketLine, "id">) => void;
  removeLine: (id: string) => void;
  clearLines: () => void;
  updateGame: (id: string, patch: Partial<Game>) => void;
  updateRetailer: (id: string, patch: Partial<Retailer>) => void;
  toast: (message: string, err?: boolean) => void;
  total: number;
}

const Ctx = createContext<Store | null>(null);

let toastSeq = 0;
let lineSeq = 0;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [games, setGames] = useState<Game[]>(DEMO_GAMES);
  const [retailers, setRetailers] = useState<Retailer[]>(DEMO_RETAILERS);
  const [betTypes] = useState<BetType[]>(DEMO_BET_TYPES);
  const [selectedRetailerId, setSelectedRetailerId] = useState("r001");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, err = false) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, message, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const loginAs = useCallback(
    (userId: string) => {
      const u = DEMO_USERS.find((x) => x.id === userId);
      if (!u) return toast("User not found", true);
      setUser(u);
      if (u.role === "retailer" && u.retailer_id) setSelectedRetailerId(u.retailer_id);
      toast(`Signed in as ${u.name}`);
    },
    [toast]
  );

  const logout = useCallback(() => {
    setUser(null);
    setLines([]);
  }, []);

  const addLine = useCallback((line: Omit<TicketLine, "id">) => {
    setLines((prev) => [...prev, { ...line, id: `L${++lineSeq}` }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearLines = useCallback(() => setLines([]), []);

  const updateGame = useCallback((id: string, patch: Partial<Game>) => {
    setGames((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const updateRetailer = useCallback((id: string, patch: Partial<Retailer>) => {
    setRetailers((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + l.amount, 0), [lines]);

  const value: Store = {
    user,
    games,
    retailers,
    betTypes,
    currency: CURRENCY,
    brand: BRAND_NAME,
    tagline: BRAND_TAGLINE,
    selectedRetailerId,
    lines,
    toasts,
    loginAs,
    logout,
    setSelectedRetailer: setSelectedRetailerId,
    addLine,
    removeLine,
    clearLines,
    updateGame,
    updateRetailer,
    toast,
    total,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
