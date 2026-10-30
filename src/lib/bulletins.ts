import type { BrandSettings, Bulletin, BulletinLevel } from "./types";

export const LEVELS: Record<
  BulletinLevel,
  { label: string; icon: string; rank: number; card: string; chip: string; bar: string }
> = {
  urgent: {
    label: "Urgent",
    icon: "🚨",
    rank: 0,
    card: "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/40",
    chip: "bg-rose-600 text-white",
    bar: "bg-rose-500",
  },
  important: {
    label: "Important",
    icon: "⚠️",
    rank: 1,
    card: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30",
    chip: "bg-amber-500 text-white",
    bar: "bg-amber-500",
  },
  promo: {
    label: "Promotion",
    icon: "🎁",
    rank: 2,
    card: "border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-500/30 dark:bg-fuchsia-950/30",
    chip: "bg-fuchsia-600 text-white",
    bar: "bg-fuchsia-500",
  },
  update: {
    label: "Update",
    icon: "🆕",
    rank: 3,
    card: "border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/30",
    chip: "bg-sky-600 text-white",
    bar: "bg-sky-500",
  },
  info: {
    label: "Info",
    icon: "📰",
    rank: 4,
    card: "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800",
    chip: "bg-slate-600 text-white",
    bar: "bg-indigo-500",
  },
};

export const LEVEL_ORDER: BulletinLevel[] = ["urgent", "important", "promo", "update", "info"];

/** Starter posts the back office can add with one click. */
export const BULLETIN_TEMPLATES: { label: string; level: BulletinLevel; title: string; body: string }[] = [
  { label: "Draw delay", level: "important", title: "Draw delayed", body: "Today's draw is delayed. Sales stay open until the new cut-off time shown on the terminal." },
  { label: "Maintenance", level: "urgent", title: "System maintenance tonight", body: "The system will be unavailable for a short time tonight. Please finish your sales before closing." },
  { label: "New game", level: "update", title: "New game available", body: "A new game is now on the sell screen. Ask the player if they would like to try it." },
  { label: "Promotion", level: "promo", title: "Promotion this week", body: "Spend the minimum on the promotion and give the player their promo code on the ticket." },
  { label: "Reminder", level: "info", title: "Weekly settlement reminder", body: "Settlement closes Sunday evening. Check your profile for your balance." },
];

export function newBulletin(over: Partial<Bulletin> = {}): Bulletin {
  return {
    id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    body: "",
    level: "info",
    enabled: true,
    dismissible: true,
    updated_at: new Date().toISOString(),
    ...over,
  };
}

/**
 * One-time upgrade from the old scrolling ticker: its message and scheduled messages become
 * posts. Brands that already have `bulletins` are left alone.
 */
export function ensureBulletins(b: BrandSettings): BrandSettings {
  if (b.bulletins !== undefined) return { ...b, bulletin_on: b.bulletin_on ?? b.led_on ?? true };
  const posts: Bulletin[] = [];
  const stamp = new Date().toISOString();
  if (b.led_message?.trim()) {
    posts.push(newBulletin({ id: "b-welcome", title: "Welcome", body: b.led_message.trim(), pinned: true, updated_at: stamp }));
  }
  for (const m of b.led_schedule || []) {
    if (!m.text?.trim()) continue;
    posts.push(
      newBulletin({
        id: `b-${m.id}`,
        title: m.label?.trim() || "News",
        body: m.text.trim(),
        enabled: m.enabled,
        start: m.start,
        end: m.end,
        updated_at: stamp,
      })
    );
  }
  return { ...b, bulletins: posts, bulletin_on: b.led_on ?? true };
}

/** Must the seller acknowledge this post? Explicit setting wins, otherwise Important / Urgent do. */
export function needsAck(p: Pick<Bulletin, "level" | "require_ack">): boolean {
  return p.require_ack ?? (p.level === "urgent" || p.level === "important");
}

export type BulletinStatus = "live" | "scheduled" | "expired" | "off";

export function statusOf(p: Bulletin, today: string): BulletinStatus {
  if (!p.enabled) return "off";
  if (p.start && today < p.start) return "scheduled";
  if (p.end && today > p.end) return "expired";
  return "live";
}

export function sortPosts(list: Bulletin[]): Bulletin[] {
  return [...list].sort(
    (a, b) =>
      Number(!!b.pinned) - Number(!!a.pinned) ||
      LEVELS[a.level].rank - LEVELS[b.level].rank ||
      b.updated_at.localeCompare(a.updated_at)
  );
}

/** Posts a given retailer should currently see (live, targeted at them), best first. */
export function livePosts(brand: BrandSettings, retailerId: string | undefined, today: string): Bulletin[] {
  if (brand.bulletin_on === false) return [];
  return sortPosts(
    (brand.bulletins || []).filter(
      (p) =>
        statusOf(p, today) === "live" &&
        (p.title.trim() || p.body.trim()) &&
        (!p.retailer_ids?.length || (retailerId ? p.retailer_ids.includes(retailerId) : true))
    )
  );
}

export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Only allow http(s) links so a post can never run script from a javascript: URL. */
export function safeUrl(u?: string): string | null {
  if (!u) return null;
  try {
    const x = new URL(u.trim());
    return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null;
  } catch {
    return null;
  }
}
