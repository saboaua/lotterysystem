"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type {
  AppUser,
  BetType,
  BrandSettings,
  Game,
  Promotion,
  Retailer,
  SupportTicket,
  Ticket,
  TicketDesign,
  TicketLine,
} from "./types";
import {
  CURRENCY,
  DEMO_BET_TYPES,
  DEMO_BRAND,
  DEMO_GAMES,
  DEMO_PROMOTIONS,
  DEMO_RETAILERS,
  DEMO_TICKET_DESIGN,
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
  brand: BrandSettings;
  ticketDesign: TicketDesign;
  promotions: Promotion[];
  selectedRetailerId: string;
  lines: TicketLine[];
  soldTickets: Ticket[];
  supportTickets: SupportTicket[];
  lastTicketId: string | null;
  toasts: Toast[];
  loginAs: (userId: string) => void;
  logout: () => void;
  setSelectedRetailer: (id: string) => void;
  addLine: (line: Omit<TicketLine, "id">) => void;
  removeLine: (id: string) => void;
  clearLines: () => void;
  sellTicket: () => Ticket | null;
  cancelTicket: (id: string) => void;
  redeemTicket: (id: string) => void;
  replayTicket: (id: string) => void;
  updateGame: (id: string, patch: Partial<Game>) => void;
  updateRetailer: (id: string, patch: Partial<Retailer>) => void;
  updateBrand: (patch: Partial<BrandSettings>) => void;
  updateTicketDesign: (patch: Partial<TicketDesign>) => void;
  updateBetType: (key: string, patch: Partial<BetType>) => void;
  addSupport: (subject: string, body: string) => void;
  toast: (message: string, err?: boolean) => void;
  total: number;
  salesToday: number;
  ticketsToday: number;
}

const Ctx = createContext<Store | null>(null);

let toastSeq = 0;
let lineSeq = 0;
let ticketSeq = 1000;
let supportSeq = 0;

function padTicket(n: number) {
  return `T${String(n).padStart(8, "0")}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [games, setGames] = useState<Game[]>(DEMO_GAMES);
  const [retailers, setRetailers] = useState<Retailer[]>(DEMO_RETAILERS);
  const [betTypes, setBetTypes] = useState<BetType[]>(DEMO_BET_TYPES);
  const [brand, setBrand] = useState<BrandSettings>(DEMO_BRAND);
  const [ticketDesign, setTicketDesign] = useState<TicketDesign>(DEMO_TICKET_DESIGN);
  const [promotions] = useState<Promotion[]>(DEMO_PROMOTIONS);
  const [selectedRetailerId, setSelectedRetailerId] = useState("r001");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
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

  const sellTicket = useCallback((): Ticket | null => {
    if (!lines.length) return null;
    const id = padTicket(++ticketSeq);
    const t: Ticket = {
      id,
      retailer_id: selectedRetailerId,
      lines: [...lines],
      total: lines.reduce((s, l) => s + l.amount, 0),
      status: "sold",
      created_at: new Date().toISOString(),
    };
    setSoldTickets((prev) => [t, ...prev]);
    setLastTicketId(id);
    setLines([]);
    return t;
  }, [lines, selectedRetailerId]);

  const cancelTicket = useCallback(
    (id: string) => {
      setSoldTickets((prev) =>
        prev.map((t) => (t.id === id && t.status === "sold" ? { ...t, status: "cancelled" } : t))
      );
      toast(`Ticket ${id} cancelled`);
    },
    [toast]
  );

  const redeemTicket = useCallback(
    (id: string) => {
      setSoldTickets((prev) =>
        prev.map((t) =>
          t.id === id && (t.status === "won" || t.status === "sold")
            ? { ...t, status: "paid", prize: t.prize ?? t.total * 10 }
            : t
        )
      );
      toast(`Ticket ${id} redeemed`);
    },
    [toast]
  );

  const replayTicket = useCallback(
    (id: string) => {
      const t = soldTickets.find((x) => x.id === id);
      if (!t) return toast("Ticket not found", true);
      setLines(
        t.lines.map((l) => ({
          ...l,
          id: `L${++lineSeq}`,
        }))
      );
      toast(`Replaying ${id}`);
    },
    [soldTickets, toast]
  );

  const updateGame = useCallback((id: string, patch: Partial<Game>) => {
    setGames((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const updateRetailer = useCallback((id: string, patch: Partial<Retailer>) => {
    setRetailers((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const updateBrand = useCallback((patch: Partial<BrandSettings>) => {
    setBrand((b) => ({ ...b, ...patch }));
  }, []);

  const updateTicketDesign = useCallback((patch: Partial<TicketDesign>) => {
    setTicketDesign((d) => ({ ...d, ...patch }));
  }, []);

  const updateBetType = useCallback((key: string, patch: Partial<BetType>) => {
    setBetTypes((bt) => bt.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }, []);

  const addSupport = useCallback(
    (subject: string, body: string) => {
      const st: SupportTicket = {
        id: `S${++supportSeq}`,
        retailer_id: selectedRetailerId,
        subject,
        body,
        status: "open",
        created_at: new Date().toISOString(),
      };
      setSupportTickets((prev) => [st, ...prev]);
      toast("Support ticket submitted");
    },
    [selectedRetailerId, toast]
  );

  const total = useMemo(() => lines.reduce((s, l) => s + l.amount, 0), [lines]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTickets = useMemo(
    () =>
      soldTickets.filter(
        (t) =>
          t.created_at.slice(0, 10) === todayStr &&
          t.status !== "cancelled" &&
          (user?.role === "owner" || t.retailer_id === selectedRetailerId)
      ),
    [soldTickets, todayStr, user, selectedRetailerId]
  );
  const salesToday = useMemo(
    () => todayTickets.reduce((s, t) => s + t.total, 0),
    [todayTickets]
  );
  const ticketsToday = todayTickets.length;

  const value: Store = {
    user,
    games,
    retailers,
    betTypes,
    currency: CURRENCY,
    brand,
    ticketDesign,
    promotions,
    selectedRetailerId,
    lines,
    soldTickets,
    supportTickets,
    lastTicketId,
    toasts,
    loginAs,
    logout,
    setSelectedRetailer: setSelectedRetailerId,
    addLine,
    removeLine,
    clearLines,
    sellTicket,
    cancelTicket,
    redeemTicket,
    replayTicket,
    updateGame,
    updateRetailer,
    updateBrand,
    updateTicketDesign,
    updateBetType,
    addSupport,
    toast,
    total,
    salesToday,
    ticketsToday,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
