export type Role = "owner" | "staff" | "retailer";

export type GameFormat = "digit" | "zodiac" | "whe" | "jackpot";

export type BetMode =
  | "exact"
  | "perm"
  | "bf"
  | "back"
  | "chances"
  | "zodiac"
  | "jackpot"
  | "whe"
  | "fast_play";

export interface GameSession {
  id: string;
  label: string;
  draw_time: string;
  cutoff: string;
}

export type PrizeMatchRule =
  | "exact"
  | "exact_and_sign"
  | "last_n"
  | "last_n_and_sign"
  | "first_n"
  | "whe_mark"
  | "jackpot_main"
  | "jackpot_main_mega"
  | "fixed";

export interface PrizeTier {
  id: string;
  rank: number;
  label: string;
  description: string;
  amount: number;
  rule: PrizeMatchRule;
  digits?: number;
  position?: 1 | 2 | 3;
  bet_type?: string;
  enabled: boolean;
}

export interface Game {
  id: string;
  name: string;
  color: string;
  format: GameFormat;
  digits?: number;
  draw_time: string;
  cutoff: string;
  enabled: boolean;
  draw_days?: number[];
  jackpot_current?: number;
  jackpot_previous?: number;
  jackpot_base?: number;
  jackpot_increment?: number;
  jackpot_sales_pct?: number;
  jackpot_cap?: number;
  jackpot_reserve_pct?: number;
  jackpot_token?: string;
  token?: string;
  main_count?: number;
  mega_count?: number;
  main_max?: number;
  mega_max?: number;
  price?: number;
  sessions?: GameSession[];
  prize_tiers?: PrizeTier[];
  [key: string]: unknown;
}

export interface BrandSettings {
  name: string;
  tagline: string;
  led_message: string;
  led_on: boolean;
  led_speed: number;
  led_color: string;
  logo?: string;
  led_schedule?: LedScheduleMessage[];
  bulletins?: Bulletin[];
  bulletin_on?: boolean;
  ping_interval_sec?: number;
  offline_after_sec?: number;
  theme_id?: string;
  login_welcome?: string;
  login_subtitle?: string;
}

export interface LedScheduleMessage {
  id: string;
  text: string;
  enabled: boolean;
  start?: string;
  end?: string;
}

export type BulletinLevel = "info" | "warning" | "promo";

export interface Bulletin {
  id: string;
  title: string;
  body: string;
  level: BulletinLevel;
  pinned?: boolean;
  enabled: boolean;
  retailer_ids?: string[];
  link_label?: string;
  link_url?: string;
  updated_at: string;
}

export type TicketMessagePlacement =
  | "header"
  | "footer"
  | "after_lines"
  | "before_total"
  | "after_total"
  | "after_promo";

export interface TicketScheduleMessage {
  id: string;
  label: string;
  text: string;
  game_ids: string[];
  enabled: boolean;
  placement: TicketMessagePlacement;
  relative_to_motd?: "before_manual" | "after_manual";
  start?: string;
  end?: string;
}

export type TopUpKind = "voucher" | "direct";
export type TopUpStatus = "issued" | "redeemed" | "credited" | "failed" | "void";

export interface TopUp {
  id: string;
  kind: TopUpKind;
  amount: number;
  status: TopUpStatus;
  code?: string;
  player_code?: string;
  retailer_id?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  staff_role?: string;
  permissions?: string[];
  retailer_id?: string;
  [key: string]: unknown;
}

export interface Retailer {
  id: string;
  name: string;
  code?: string;
  status?: string;
  commission_pct?: number;
  [key: string]: unknown;
}

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface TicketDesign {
  [key: string]: unknown;
}

export interface TopUpDesign {
  [key: string]: unknown;
}

/** Minimal stubs for other types used across the app — extend as needed. */
export type SoldTicket = {
  id: string;
  retailer_id: string;
  total: number;
  status: string;
  promo_code?: string;
  [key: string]: unknown;
};
