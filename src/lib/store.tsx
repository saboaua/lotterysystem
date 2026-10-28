"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AppUser,
  BetType,
  BrandSettings,
  DrawResult,
  FastPlayGame,
  Game,
  Holiday,
  Promotion,
  Retailer,
  SupportTicket,
  Ticket,
  TicketDesign,
  TopUp,
  TicketLine,
} from "./types";
import {
  CURRENCY,
  DEMO_BET_TYPES,
  DEMO_BRAND,
  DEMO_FAST_PLAY,
  DEMO_GAMES,
  DEMO_PROMOTIONS,
  DEMO_RETAILERS,
  DEMO_TICKET_DESIGN,
  DEMO_USERS,
} from "./demo-data";
import { signOut as sbSignOut, isSupabaseConfigured } from "./auth";
import { persistSoldTicket, fetchTicketsFromSupabase } from "./tickets-api";
import { loadJson, saveJson } from "./persist";
import { arubaDate, arubaToday } from "./dates";
import { computeJackpotAfterDraw, describeJackpotChange } from "./jackpot";

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
  holidays: Holiday[];
  drawResults: DrawResult[];
  selectedRetailerId: string;
  lines: TicketLine[];
  soldTickets: Ticket[];
  topUps: TopUp[];
  addTopUp: (t: TopUp) => void;
  updateTopUp: (id: string, patch: Partial<TopUp>) => void;
  supportTickets: SupportTicket[];
  lastTicketId: string | null;
  toasts: Toast[];
  loginAs: (userId: string) => void;
  setUserFromAuth: (user: AppUser) => void;
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
  addGame: (game: Game) => void;
  deleteGame: (id: string) => void;
  updateRetailer: (id: string, patch: Partial<Retailer>) => void;
  addRetailer: (r: Omit<Retailer, "id">) => Retailer;
  updateBrand: (patch: Partial<BrandSettings>) => void;
  updateTicketDesign: (patch: Partial<TicketDesign>) => void;
  updateBetType: (key: string, patch: Partial<BetType>) => void;
  addSupport: (subject: string, body: string) => void;
  addPromotion: (p: Promotion) => void;
  updatePromotion: (id: string, patch: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  setResults: (result: Omit<DrawResult, "id">) => void;
  addHoliday: (h: Omit<Holiday, "id">) => void;
  deleteHoliday: (id: string) => void;
  importHolidays: (rows: { date: string; name: string }[]) => number;
  checkPromoCode: (code: string) => { ok: boolean; message: string; prize?: number };
  pingRetailer: (retailerId?: string) => void;
  toast: (message: string, err?: boolean) => void;
  total: number;
  salesToday: number;
  ticketsToday: number;
  unpaidPrizes: number;
  fastPlayGames: FastPlayGame[];
  updateFastPlayGame: (id: string, patch: Partial<FastPlayGame>) => void;
  addFastPlayGame: (game: FastPlayGame) => void;
  deleteFastPlayGame: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

let toastSeq = 0;
let lineSeq = 0;
let ticketSeq = 1000;
let supportSeq = 0;
let promoSeq = 10;
let holidaySeq = 0;
let resultSeq = 0;
let retailerSeq = 100;

function padTicket(n: number) {
  return `T${String(n).padStart(8, "0")}`;
}

function randomCode(len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function applyPromotions(
  lines: TicketLine[],
  promotions: Promotion[],
  now = new Date()
): { promo_id?: string; promo_code?: string } {
  const active = promotions.filter((p) => {
    if (!p.active) return false;
    if (p.start && new Date(p.start) > now) return false;
    if (p.end && new Date(p.end) < now) return false;
    return true;
  });
  for (const p of active) {
    const scoped = p.game_ids?.length
      ? lines.filter((l) => p.game_ids!.includes(l.game))
      : lines;
    if (!scoped.length) continue;
    if (p.min_plays != null && scoped.length < p.min_plays) continue;
    if (p.min_games != null) {
      const distinct = new Set(scoped.map((l) => l.game)).size;
      if (distinct < p.min_games) continue;
    }
    if (p.min_amount != null) {
      const sum = scoped.reduce((s, l) => s + l.amount, 0);
      if (sum < p.min_amount) continue;
    }
    return { promo_id: p.id, promo_code: randomCode(p.code_len || 6) };
  }
  return {};
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [games, setGames] = useState<Game[]>(DEMO_GAMES);
  const [retailers, setRetailers] = useState<Retailer[]>(DEMO_RETAILERS);
  const [betTypes, setBetTypes] = useState<BetType[]>(DEMO_BET_TYPES);
  const [brand, setBrand] = useState<BrandSettings>(DEMO_BRAND);
  const [ticketDesign, setTicketDesign] = useState<TicketDesign>(DEMO_TICKET_DESIGN);
  const [promotions, setPromotions] = useState<Promotion[]>(DEMO_PROMOTIONS);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState("r001");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fastPlayGames, setFastPlayGames] = useState<FastPlayGame[]>(DEMO_FAST_PLAY);

  useEffect(() => {
    setGames(loadJson("games", DEMO_GAMES));
    setBrand(loadJson("brand", DEMO_BRAND));
    setTicketDesign(loadJson("ticketDesign", DEMO_TICKET_DESIGN));
    setHolidays(loadJson("holidays", []));
    setDrawResults(loadJson("drawResults", []));
    setRetailers(loadJson("retailers", DEMO_RETAILERS));
    setPromotions(loadJson("promotions", DEMO_PROMOTIONS));
    setFastPlayGames(loadJson("fastPlayGames", DEMO_FAST_PLAY));
    setTopUps(loadJson("topUps", []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveJson("games", games);
  }, [games, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("brand", brand);
  }, [brand, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("ticketDesign", ticketDesign);
  }, [ticketDesign, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("holidays", holidays);
  }, [holidays, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("drawResults", drawResults);
  }, [drawResults, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("retailers", retailers);
  }, [retailers, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("promotions", promotions);
  }, [promotions, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("topUps", topUps);
  }, [topUps, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveJson("fastPlayGames", fastPlayGames);
  }, [fastPlayGames, hydrated]);

  const toast = useCallback((message: string, err = false) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, message, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
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

  const setUserFromAuth = useCallback((u: AppUser) => {
    setUser(u);
    if (u.role === "retailer" && u.retailer_id) setSelectedRetailerId(u.retailer_id);
    if (isSupabaseConfigured) {
      void fetchTicketsFromSupabase(300).then((res) => {
        if (res.ok && res.tickets.length) {
          setSoldTickets(res.tickets);
        }
      });
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setLines([]);
    if (isSupabaseConfigured) void sbSignOut();
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
    const promo = applyPromotions(lines, promotions);
    const retailerId =
      (user?.role === "retailer" && user.retailer_id) || selectedRetailerId;
    const t: Ticket = {
      id,
      retailer_id: retailerId,
      lines: [...lines],
      total: lines.reduce((s, l) => s + l.amount, 0),
      status: "sold",
      created_at: new Date().toISOString(),
      clerk_id: user?.id,
      ...promo,
    };
    setSoldTickets((prev) => [t, ...prev]);
    setLastTicketId(id);
    setLines([]);
    if (promo.promo_code) toast(`Ticket ${id} sold - promo ${promo.promo_code}`);

    if (isSupabaseConfigured) {
      void persistSoldTicket(t, { userId: user?.id, retailerId }).then((res) => {
        if (res.ok === false) {
          toast(`Ticket ${id} local only: ${res.error}`, true);
          return;
        }
        toast(`Ticket ${id} saved to server`);
      });
    }
    return t;
  }, [lines, selectedRetailerId, promotions, toast, user]);

  const cancelTicket = useCallback(
    (id: string) => {
      setSoldTickets((prev) =>
        prev.map((t) =>
          t.id === id && t.status === "sold"
            ? { ...t, status: "cancelled", cancelled_at: new Date().toISOString() }
            : t
        )
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
            ? {
                ...t,
                status: "paid",
                prize: t.prize ?? t.total * 10,
                redeemed_at: new Date().toISOString(),
              }
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
      setLines(t.lines.map((l) => ({ ...l, id: `L${++lineSeq}` })));
      toast(`Replaying ${id}`);
    },
    [soldTickets, toast]
  );

  const updateGame = useCallback((id: string, patch: Partial<Game>) => {
    setGames((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addGame = useCallback((game: Game) => {
    setGames((g) => [...g, game]);
  }, []);

  const deleteGame = useCallback((id: string) => {
    setGames((g) => g.filter((x) => x.id !== id));
  }, []);

  const updateFastPlayGame = useCallback((id: string, patch: Partial<FastPlayGame>) => {
    setFastPlayGames((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addFastPlayGame = useCallback((game: FastPlayGame) => {
    setFastPlayGames((g) => [...g, game]);
  }, []);

  const deleteFastPlayGame = useCallback((id: string) => {
    setFastPlayGames((g) => g.filter((x) => x.id !== id));
  }, []);

  const updateRetailer = useCallback((id: string, patch: Partial<Retailer>) => {
    setRetailers((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addRetailer = useCallback((r: Omit<Retailer, "id">): Retailer => {
    const id = `r${String(++retailerSeq).padStart(3, "0")}`;
    const full: Retailer = { ...r, id };
    setRetailers((prev) => [...prev, full]);
    return full;
  }, []);

  const updateBrand = useCallback((patch: Partial<BrandSettings>) => {
    setBrand((b) => ({ ...b, ...patch }));
  }, []);

  const addTopUp = useCallback((t: TopUp) => {
    setTopUps((prev) => [t, ...prev]);
  }, []);
  const updateTopUp = useCallback((id: string, patch: Partial<TopUp>) => {
    setTopUps((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
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

  const addPromotion = useCallback((p: Promotion) => {
    setPromotions((prev) => [...prev, p.id ? p : { ...p, id: `p${++promoSeq}` }]);
  }, []);

  const updatePromotion = useCallback((id: string, patch: Partial<Promotion>) => {
    setPromotions((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const deletePromotion = useCallback((id: string) => {
    setPromotions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setResults = useCallback(
    (result: Omit<DrawResult, "id">) => {
      const id = `R${++resultSeq}`;
      let enriched: DrawResult = { ...result, id };
      let jpNote = "";

      setGames((prevGames) => {
        const game = prevGames.find((g) => g.id === result.game_id);
        if (game?.format === "jackpot") {
          const jp = computeJackpotAfterDraw(game, { ...result, id }, soldTickets);
          enriched = {
            ...enriched,
            jackpot_at_draw: jp.jackpot_at_draw,
            jackpot_next: jp.jackpot_next,
            jackpot_won: jp.jackpot_won,
          };
          jpNote = describeJackpotChange(jp, CURRENCY);
          return prevGames.map((g) =>
            g.id === game.id
              ? {
                  ...g,
                  jackpot_previous: jp.jackpot_previous,
                  jackpot_current: jp.jackpot_next,
                }
              : g
          );
        }
        return prevGames;
      });

      setDrawResults((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              r.game_id === result.game_id &&
              r.draw_date === result.draw_date &&
              r.session === result.session
            )
        );
        return [enriched, ...filtered];
      });

      if (jpNote) {
        toast(`Results ${result.game_id} ${result.draw_date} · ${jpNote}`);
      } else {
        toast(`Results saved for ${result.game_id} ${result.draw_date}`);
      }
    },
    [toast, soldTickets]
  );

  const pingRetailer = useCallback(
    (retailerId?: string) => {
      const id = retailerId || selectedRetailerId;
      if (!id) return;
      const now = new Date().toISOString();
      setRetailers((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, last_seen: now, last_ack: now } : r
        )
      );
    },
    [selectedRetailerId]
  );

  const addHoliday = useCallback((h: Omit<Holiday, "id">) => {
    setHolidays((prev) => {
      if (prev.some((x) => x.date === h.date && x.name === h.name)) return prev;
      return [...prev, { ...h, id: `H${++holidaySeq}` }];
    });
  }, []);

  const deleteHoliday = useCallback((id: string) => {
    setHolidays((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const importHolidays = useCallback((rows: { date: string; name: string }[]) => {
    let added = 0;
    setHolidays((prev) => {
      const next = [...prev];
      for (const row of rows) {
        if (next.some((x) => x.date === row.date)) continue;
        next.push({ ...row, id: `H${++holidaySeq}` });
        added++;
      }
      return next;
    });
    return added;
  }, []);

  const checkPromoCode = useCallback(
    (code: string) => {
      const t = soldTickets.find((x) => x.promo_code === code);
      if (!t) return { ok: false, message: "Code not found" };
      const promo = promotions.find((p) => p.id === t.promo_id);
      return {
        ok: true,
        message: promo?.label || "Promo code valid",
        prize: promo?.prize,
      };
    },
    [soldTickets, promotions]
  );

  const total = useMemo(() => lines.reduce((s, l) => s + l.amount, 0), [lines]);
  const todayStr = arubaToday();
  const todayTickets = useMemo(
    () =>
      soldTickets.filter(
        (t) =>
          arubaDate(t.created_at) === todayStr &&
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
  const unpaidPrizes = useMemo(
    () => soldTickets.filter((t) => t.status === "won").reduce((s, t) => s + (t.prize || 0), 0),
    [soldTickets]
  );

  const value: Store = {
    user,
    games,
    retailers,
    betTypes,
    currency: CURRENCY,
    brand,
    ticketDesign,
    promotions,
    holidays,
    drawResults,
    selectedRetailerId,
    lines,
    soldTickets,
    topUps,
    addTopUp,
    updateTopUp,
    supportTickets,
    lastTicketId,
    toasts,
    loginAs,
    setUserFromAuth,
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
    addGame,
    deleteGame,
    updateRetailer,
    addRetailer,
    updateBrand,
    updateTicketDesign,
    updateBetType,
    addSupport,
    addPromotion,
    updatePromotion,
    deletePromotion,
    setResults,
    addHoliday,
    deleteHoliday,
    importHolidays,
    checkPromoCode,
    pingRetailer,
    toast,
    total,
    salesToday,
    ticketsToday,
    unpaidPrizes,
    fastPlayGames,
    updateFastPlayGame,
    addFastPlayGame,
    deleteFastPlayGame,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
