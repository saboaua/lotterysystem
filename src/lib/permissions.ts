import type { AppUser } from "./types";

/** Back-office areas a staff role can be granted. Each has `view` and (except audit) `edit`. */
export interface PermissionModule {
  key: string;
  label: string;
  description: string;
  /** Audit trail is read-only. */
  viewOnly?: boolean;
}

export const PERMISSION_MODULES: PermissionModule[] = [
  { key: "games", label: "Games & bet types", description: "Games, schedule, prize payouts, tokens, bet types" },
  { key: "fastplay", label: "Fast Play", description: "Fast Play instant games" },
  { key: "schedule", label: "Draw calendar", description: "Draw calendar and holidays" },
  { key: "results", label: "Results & draw reports", description: "Enter draw results, winners, draw reports" },
  { key: "promos", label: "Promotions", description: "Promotion rules and prizes" },
  { key: "brand", label: "Branding & message", description: "Name, logo, LED message and schedule" },
  { key: "ticket", label: "Ticket design", description: "Ticket layout, texts and top-up ticket design" },
  { key: "broadcast", label: "Broadcast", description: "Popups sent to seller terminals" },
  { key: "retailers", label: "Retailers", description: "Retailer accounts, commissions, status" },
  { key: "reports", label: "Reports & tickets", description: "Sales reports, tickets, top ups", viewOnly: true },
  { key: "isp", label: "ISP / network", description: "Network tools", viewOnly: true },
  { key: "audit", label: "Audit trail", description: "See who logged in and what was changed", viewOnly: true },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap((m) =>
  m.viewOnly ? [`${m.key}:view`] : [`${m.key}:view`, `${m.key}:edit`]
);

/** Back-office users: the owner and staff. Retailers use the sell terminal. */
export function isBackOffice(u: Pick<AppUser, "role"> | null | undefined): boolean {
  return u?.role === "owner" || u?.role === "staff";
}

/** Owner can do everything; staff only what their role grants (edit implies view). */
export function can(u: Pick<AppUser, "role" | "permissions"> | null | undefined, perm: string): boolean {
  if (!u) return false;
  if (u.role === "owner") return true;
  if (u.role !== "staff") return false;
  const list = u.permissions || [];
  if (list.includes(perm)) return true;
  if (perm.endsWith(":view")) return list.includes(perm.replace(/:view$/, ":edit"));
  return false;
}

/** Back-office tab → permission module (tabs not listed are open to every back-office user). */
export const TAB_MODULE: Record<string, string | undefined> = {
  games: "games",
  fast_play: "fastplay",
  calendar: "schedule",
  brand: "brand",
  broadcast: "broadcast",
  ticket: "ticket",
  promos: "promos",
  results: "results",
  draw_reports: "results",
  reports: "reports",
  retailers: "retailers",
  isp: "isp",
};
