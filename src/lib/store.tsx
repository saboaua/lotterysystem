"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { migrateGamePayouts } from "./prize-tiers";
import {
  auditCollectionChanges,
  describeChanges,
  diffFields,
  flushPendingAudit,
  logAudit,
  setAuditActor,
} from "./audit";
import { can, isBackOffice } from "./permissions";
import {
  holidayRowId,
  newUuid,
  pingRetailerRemote,
  pullBetTypes,
  pullFastPlay,
  pullGames,
  pullHolidays,
  pullPromotions,
  pullResults,
  pullSetting,
  pullSupport,
  pullTopUps,
  pushBetTypes,
  pushBrand,
  pushFastPlay,
  pushGames,
  pushHolidays,
  pushPromoCode,
  pushPromotions,
  pushResults,
  pushSupport,
  pushTicketDesign,
  pushTicketStatus,
  pushTopUp,
  resultRowId,
} from "./cloud";
import { fetchRetailersFromSupabase, persistRetailerToSupabase } from "./supabase-data";
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

type CloudSnap = { hash: string; ids: string[]; items: unknown[] };

/**
 * Saves a collection to Supabase whenever it changes (owner only, after the first successful pull).
 * Rows that disappeared since the last save are deleted remotely.
 */
function useCloudSync<T>(
  name: string,
  items: T[],
  idOf: (t: T) => string,
  push: (items: T[], removed: string[]) => Promise<{ ok: true } | { ok: false; error: string }>,
  enabled: boolean,
  snaps: React.MutableRefObject<Record<string, CloudSnap>>,
  onError: (msg: string) => void,
  audit?: { entity: string; label: (t: T) => string }
) {
  const pushRef = useRef(push);
  const auditRef = useRef(audit);
  auditRef.current = audit;
  const idRef = useRef(idOf);
  const errRef = useRef(onError);
  pushRef.current = push;
  idRef.current = idOf;
  errRef.current = onError;
  useEffect(() => {
    if (!enabled) return;
    const hash = JSON.stringify(items);
    const prev = snaps.current[name];
    if (prev && prev.hash === hash) return;
    const timer = setTimeout(async () => {
      const ids = items.map((x) => idRef.current(x));
      const removed = prev ? prev.ids.filter((id) => !ids.includes(id)) : [];
      const res = await pushRef.current(items, removed);
      if (res.ok === false) {
        errRef.current(`Not saved to Supabase (${name}): ${res.error}. Run supabase/sync.sql if columns are missing.`);
        return;
      }
      snaps.current[name] = { hash, ids, items };
      const a = auditRef.current;
      if (a && prev) {
        auditCollectionChanges(a.entity, prev.items as T[], items, idRef.current, a.label);
      } else if (a && !prev) {
        void logAudit({ action: "create", entity: a.entity, summary: `Initial save of ${items.length} ${a.entity} record(s) to Supabase`, details: { count: items.length } });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [items, enabled, name, snaps]);
}

function markSynced<T>(
  snaps: React.MutableRefObject<Record<string, CloudSnap>>,
  name: string,
  items: T[],
  idOf: (t: T) => string
) {
  snaps.current[name] = { hash: JSON.stringify(items), ids: items.map(idOf), items };
}

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
  useEffect(() => {
    soldTicketsRef.current = soldTickets;
  }, [soldTickets]);
  useEffect(() => {
    topUpsRef.current = topUps;
  }, [topUps]);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fastPlayGames, setFastPlayGames] = useState<FastPlayGame[]>(DEMO_FAST_PLAY);
  const retailersRef = useRef<Retailer[]>(retailers);
  const userRef = useRef<AppUser | null>(user);
  useEffect(() => {
    retailersRef.current = retailers;
  }, [retailers]);
  useEffect(() => {
    userRef.current = user;
    setAuditActor(
      user ? { id: user.id, name: user.name || user.email, email: user.email, role: user.role } : null
    );
  }, [user]);
  const soldTicketsRef = useRef<Ticket[]>([]);
  const topUpsRef = useRef<TopUp[]>([]);

  useEffect(() => {
    setGames(migrateGamePayouts(loadJson("games", DEMO_GAMES)));
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

  /**
   * Live mode: the retailer list must come from Supabase (UUID ids). Demo ids like "r001"
   * cannot be linked to profiles.retailer_id and tickets would never save to the server.
   */
  const syncRetailers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const res = await fetchRetailersFromSupabase();
    if (res.ok === false) {
      toast(`Could not load retailers from Supabase: ${res.error}`, true);
      return;
    }
    if (!res.retailers.length) return;
    const list = res.retailers;
    setRetailers((prev) => {
      const local = new Map(prev.map((r) => [r.id, r]));
      return list.map((r) => ({
        ...r,
        last_seen: r.last_seen ?? local.get(r.id)?.last_seen,
        last_ack: r.last_ack ?? local.get(r.id)?.last_ack,
      }));
    });
    setSelectedRetailerId((cur) => {
      const u = userRef.current;
      // A signed-in retailer always keeps their own shop.
      if (u?.role === "retailer" && u.retailer_id) return u.retailer_id;
      return list.some((r) => r.id === cur) ? cur : list[0].id;
    });
  }, [toast]);

  useEffect(() => {
    if (hydrated) void syncRetailers();
  }, [hydrated, syncRetailers]);

  const persistRetailer = useCallback(
    (oldId: string, r: Retailer, before?: Retailer) => {
      if (!isSupabaseConfigured) return;
      if (!can(userRef.current, "retailers:edit")) return;
      void persistRetailerToSupabase(r).then((res) => {
        if (res.ok === false) {
          toast(`Retailer saved locally only: ${res.error}`, true);
          return;
        }
        const saved = res.retailer;
        if (before) {
          const changes = diffFields(
            before as unknown as Record<string, unknown>,
            r as unknown as Record<string, unknown>,
            ["last_seen", "last_ack"]
          );
          if (Object.keys(changes).length) {
            void logAudit({
              action: "update",
              entity: "retailer",
              entity_id: saved.id,
              summary: `Changed retailer "${r.name}": ${describeChanges(changes)}`,
              details: { changes },
            });
          }
        } else {
          void logAudit({
            action: "create",
            entity: "retailer",
            entity_id: saved.id,
            summary: `Created retailer "${r.name}" (#${r.number})`,
          });
        }
        setRetailers((prev) =>
          prev.map((x) =>
            x.id === oldId ? { ...saved, last_seen: x.last_seen, last_ack: x.last_ack } : x
          )
        );
        if (saved.id !== oldId) setSelectedRetailerId((cur) => (cur === oldId ? saved.id : cur));
      });
    },
    [toast]
  );

  /* ── Supabase: pull everything on start, then save every change (owner) ── */
  const [cloudReady, setCloudReady] = useState(false);
  const snaps = useRef<Record<string, CloudSnap>>({});
  const lastCloudErr = useRef("");
  const cloudError = useCallback(
    (msg: string) => {
      if (lastCloudErr.current === msg) return;
      lastCloudErr.current = msg;
      toast(msg, true);
    },
    [toast]
  );

  const pullAll = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const [g, bt, rs, hd, pm, br, td, fp] = await Promise.all([
      pullGames(DEMO_GAMES),
      pullBetTypes(),
      pullResults(),
      pullHolidays(),
      pullPromotions(),
      pullSetting<Partial<BrandSettings>>("brand"),
      pullSetting<Partial<TicketDesign>>("ticket_design"),
      pullFastPlay(),
    ]);
    const failed = [g, bt, rs, hd, pm, br, td, fp].find((x) => x.ok === false);
    if (failed && failed.ok === false) {
      cloudError(`Could not load from Supabase: ${failed.error}`);
      return;
    }
    if (g.ok && g.data.games.length) {
      const list = migrateGamePayouts(g.data.games);
      setGames(list);
      if (g.data.unsynced) delete snaps.current.games;
      else markSynced(snaps, "games", g.data.games, (x) => x.id);
    }
    if (bt.ok && bt.data.length) {
      const have = new Set(bt.data.map((b) => b.key));
      setBetTypes([...bt.data, ...DEMO_BET_TYPES.filter((b) => !have.has(b.key))]);
      markSynced(snaps, "bet_types", bt.data, (x) => x.key);
    }
    if (rs.ok && rs.data.length) {
      setDrawResults(rs.data);
      markSynced(snaps, "results", rs.data, resultRowId);
    }
    if (hd.ok && hd.data.length) {
      setHolidays(hd.data);
      markSynced(snaps, "holidays", hd.data, holidayRowId);
    }
    if (pm.ok && pm.data.length) {
      setPromotions(pm.data);
      markSynced(snaps, "promotions", pm.data, (x) => x.id);
    }
    if (br.ok && br.data) {
      const merged = { ...DEMO_BRAND, ...br.data };
      setBrand(merged);
      markSynced(snaps, "brand", [merged], () => "brand");
    }
    if (td.ok && td.data) {
      const merged = { ...DEMO_TICKET_DESIGN, ...td.data };
      setTicketDesign(merged);
      markSynced(snaps, "ticket_design", [merged], () => "ticket_design");
    }
    if (fp.ok && fp.data) {
      setFastPlayGames(fp.data);
      markSynced(snaps, "fast_play", fp.data, (x) => x.id);
    }
    lastCloudErr.current = "";
    setCloudReady(true);
  }, [cloudError]);

  /** Tables protected by sign-in (top ups, support) — pulled after login. */
  const pullPrivate = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const [t, sp] = await Promise.all([pullTopUps(), pullSupport()]);
    if (t.ok) setTopUps(t.data);
    if (sp.ok) setSupportTickets(sp.data);
  }, []);

  useEffect(() => {
    if (hydrated) void pullAll();
  }, [hydrated, pullAll]);

  // Owner screens: refresh presence (last seen) and shared data regularly.
  useEffect(() => {
    if (!isSupabaseConfigured || !isBackOffice(user)) return;
    const id = setInterval(() => void syncRetailers(), 30_000);
    return () => clearInterval(id);
  }, [user, syncRetailers]);

  const canSave = cloudReady && isSupabaseConfigured && isBackOffice(user);
  const may = (perm: string) => canSave && can(user, perm);
  const label = (x: { name?: string; label?: string; key?: string; date?: string; id?: string }) =>
    x.name || x.label || x.key || x.date || x.id || "";
  useCloudSync("games", games, (x) => x.id, pushGames, may("games:edit"), snaps, cloudError, { entity: "game", label });
  useCloudSync("bet_types", betTypes, (x) => x.key, pushBetTypes, may("games:edit"), snaps, cloudError, { entity: "bet type", label });
  useCloudSync(
    "results",
    drawResults,
    resultRowId,
    pushResults,
    may("results:edit"),
    snaps,
    cloudError,
    { entity: "draw result", label: (r) => `${r.game_id} ${r.draw_date}${r.session ? " " + r.session : ""}` }
  );
  useCloudSync("holidays", holidays, holidayRowId, pushHolidays, may("schedule:edit"), snaps, cloudError, { entity: "holiday", label: (h) => `${h.name} ${h.date}` });
  useCloudSync("promotions", promotions, (x) => x.id, pushPromotions, may("promos:edit"), snaps, cloudError, { entity: "promotion", label });
  useCloudSync("brand", [brand], () => "brand", (b) => pushBrand(b[0]), may("brand:edit"), snaps, cloudError, { entity: "branding", label: () => "Branding & message" });
  useCloudSync(
    "ticket_design",
    [ticketDesign],
    () => "ticket_design",
    (d) => pushTicketDesign(d[0]),
    may("ticket:edit"),
    snaps,
    cloudError,
    { entity: "ticket design", label: () => "Ticket design" }
  );
  useCloudSync("fast_play", fastPlayGames, (x) => x.id, (f) => pushFastPlay(f), may("fastplay:edit"), snaps, cloudError, { entity: "fast play game", label });

  const loginAs = useCallback(
    (userId: string) => {
      const u = DEMO_USERS.find((x) => x.id === userId);
      if (!u) return toast("User not found", true);
      setUser(u);
      setAuditActor({ id: u.id, name: u.name || u.email, email: u.email, role: u.role });
      void logAudit({ action: "login", summary: `${u.name || u.email} signed in (${u.role})` });
      if (u.role === "retailer" && u.retailer_id) setSelectedRetailerId(u.retailer_id);
      toast(`Signed in as ${u.name}`);
    },
    [toast]
  );

  const setUserFromAuth = useCallback((u: AppUser) => {
    setUser(u);
    if (u.role === "retailer" && u.retailer_id) setSelectedRetailerId(u.retailer_id);
    userRef.current = u;
    setAuditActor({ id: u.id, name: u.name || u.email, email: u.email, role: u.role });
    void logAudit({
      action: "login",
      summary: `${u.name || u.email} signed in (${u.role}${u.staff_role ? ` · ${u.staff_role}` : ""})`,
    }).then(() => flushPendingAudit());
    if (isSupabaseConfigured) {
      void syncRetailers();
      void pullAll();
      void pullPrivate();
      void fetchTicketsFromSupabase(300).then((res) => {
        if (res.ok && res.tickets.length) {
          setSoldTickets(res.tickets);
        }
      });
    }
  }, [syncRetailers, pullAll, pullPrivate]);

  const logout = useCallback(() => {
    const u = userRef.current;
    setUser(null);
    setLines([]);
    // Record the sign-out while the session is still valid, then end it.
    const done = u ? logAudit({ action: "logout", summary: `${u.name || u.email} signed out` }) : Promise.resolve();
    if (isSupabaseConfigured) void done.then(() => sbSignOut());
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
    // Live mode: ids must be unique across terminals and page reloads (tickets.id is the primary key).
    const id = isSupabaseConfigured
      ? `T${String(Math.floor(Date.now() / 10)).slice(-10)}`
      : padTicket(++ticketSeq);
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
        if (t.promo_code && t.promo_id) {
          void pushPromoCode({
            code: t.promo_code,
            promotion_id: t.promo_id,
            ticket_id: id,
            retailer_id: retailerId,
          }).then((r) => {
            if (r.ok === false) toast(`Promo code not saved to server: ${r.error}`, true);
          });
        }
      });
    }
    return t;
  }, [lines, selectedRetailerId, promotions, toast, user]);

  const cancelTicket = useCallback(
    (id: string) => {
      const cancelledAt = new Date().toISOString();
      setSoldTickets((prev) =>
        prev.map((t) =>
          t.id === id && t.status === "sold"
            ? { ...t, status: "cancelled", cancelled_at: cancelledAt }
            : t
        )
      );
      toast(`Ticket ${id} cancelled`);
      if (isSupabaseConfigured) {
        void pushTicketStatus(id, { status: "cancelled", cancelled_at: cancelledAt }).then((r) => {
          if (r.ok === false) toast(`Cancel not saved to server: ${r.error}`, true);
        });
      }
      void logAudit({ action: "cancel_ticket", entity: "ticket", entity_id: id, summary: `Cancelled ticket ${id}` });
    },
    [toast]
  );

  const redeemTicket = useCallback(
    (id: string) => {
      const redeemedAt = new Date().toISOString();
      const existing = soldTicketsRef.current.find((t) => t.id === id);
      const prize = existing ? (existing.prize ?? existing.total * 10) : undefined;
      setSoldTickets((prev) =>
        prev.map((t) =>
          t.id === id && (t.status === "won" || t.status === "sold")
            ? { ...t, status: "paid", prize: t.prize ?? t.total * 10, redeemed_at: redeemedAt }
            : t
        )
      );
      toast(`Ticket ${id} redeemed`);
      if (isSupabaseConfigured && existing && (existing.status === "won" || existing.status === "sold")) {
        void pushTicketStatus(id, { status: "paid", prize, redeemed_at: redeemedAt }).then((r) => {
          if (r.ok === false) toast(`Redeem not saved to server: ${r.error}`, true);
        });
      }
      void logAudit({ action: "redeem_ticket", entity: "ticket", entity_id: id, summary: `Redeemed ticket ${id}${prize != null ? ` (prize ${prize.toFixed(2)})` : ""}` });
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

  const updateRetailer = useCallback(
    (id: string, patch: Partial<Retailer>) => {
      const current = retailersRef.current.find((x) => x.id === id);
      if (!current) return;
      const changed = (Object.keys(patch) as (keyof Retailer)[]).some((k) => current[k] !== patch[k]);
      if (!changed) return;
      const next = { ...current, ...patch };
      setRetailers((r) => r.map((x) => (x.id === id ? next : x)));
      persistRetailer(id, next, current);
    },
    [persistRetailer]
  );

  const addRetailer = useCallback(
    (r: Omit<Retailer, "id">): Retailer => {
      const id = `r${String(++retailerSeq).padStart(3, "0")}`;
      const full: Retailer = { ...r, id };
      setRetailers((prev) => [...prev, full]);
      persistRetailer(id, full);
      return full;
    },
    [persistRetailer]
  );

  const updateBrand = useCallback((patch: Partial<BrandSettings>) => {
    setBrand((b) => ({ ...b, ...patch }));
  }, []);

  const saveTopUp = useCallback(
    (t: TopUp) => {
      if (!isSupabaseConfigured) return;
      void pushTopUp(t).then((r) => {
        if (r.ok === false) toast(`Top up not saved to server: ${r.error}`, true);
      });
    },
    [toast]
  );
  const addTopUp = useCallback(
    (t: TopUp) => {
      setTopUps((prev) => [t, ...prev]);
      saveTopUp(t);
      void logAudit({
        action: "topup",
        entity: "topup",
        entity_id: t.id,
        summary: `Top up ${t.kind} ${t.amount.toFixed(2)}${t.demo ? " (demo)" : ""}`,
        details: { retailer_id: t.retailer_id, kind: t.kind, amount: t.amount },
      });
    },
    [saveTopUp]
  );
  const updateTopUp = useCallback(
    (id: string, patch: Partial<TopUp>) => {
      const current = topUpsRef.current.find((t) => t.id === id);
      setTopUps((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (current) saveTopUp({ ...current, ...patch });
    },
    [saveTopUp]
  );

  const updateTicketDesign = useCallback((patch: Partial<TicketDesign>) => {
    setTicketDesign((d) => ({ ...d, ...patch }));
  }, []);

  const updateBetType = useCallback((key: string, patch: Partial<BetType>) => {
    setBetTypes((bt) => bt.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }, []);

  const addSupport = useCallback(
    (subject: string, body: string) => {
      const st: SupportTicket = {
        id: isSupabaseConfigured ? newUuid() : `S${++supportSeq}`,
        retailer_id: selectedRetailerId,
        subject,
        body,
        status: "open",
        created_at: new Date().toISOString(),
      };
      setSupportTickets((prev) => [st, ...prev]);
      toast("Support ticket submitted");
      if (isSupabaseConfigured) {
        void pushSupport(st, userRef.current?.id).then((r) => {
          if (r.ok === false) toast(`Support ticket not saved to server: ${r.error}`, true);
        });
      }
    },
    [selectedRetailerId, toast]
  );

  const addPromotion = useCallback((p: Promotion) => {
    setPromotions((prev) => [
      ...prev,
      p.id ? p : { ...p, id: `p${Date.now().toString(36)}${(++promoSeq).toString(36)}` },
    ]);
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
      if (isSupabaseConfigured && userRef.current?.role === "retailer") void pingRetailerRemote();
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
          (isBackOffice(user) || t.retailer_id === selectedRetailerId)
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
