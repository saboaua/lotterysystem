import type { Role, Game, Retailer, BetType } from "./types-core";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  retailer_id?: string;
  username?: string;
  must_change_password?: boolean;
  staff_role?: string;
  permissions?: string[];
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface LedScheduleMessage {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
  start?: string;
  end?: string;
}

export interface BlockedNumber {
  id: string;
  game_id: string;
  number: string;
  bet_types?: string[];
  permutations?: boolean;
  until?: string;
  enabled: boolean;
  reason?: string;
  created_at: string;
  created_by?: string;
}

export type BulletinLevel = "info" | "update" | "promo" | "important" | "urgent";

export interface Bulletin {
  id: string;
  title: string;
  body: string;
  level: BulletinLevel;
  pinned?: boolean;
  enabled: boolean;
  start?: string;
  end?: string;
  dismissible?: boolean;
  require_ack?: boolean;
  retailer_ids?: string[];
  link_label?: string;
  link_url?: string;
  updated_at: string;
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
  retailer_id: string;
  clerk?: string;
  code?: string;
  player_code?: string;
  status: TopUpStatus;
  created_at: string;
  redeemed_at?: string;
  demo?: boolean;
  error?: string;
}

export interface TopUpDesign {
  enabled: boolean;
  website: string;
  quick_amounts: number[];
  min_amount: number;
  max_amount: number;
  code_length: number;
  code_prefix: string;
  print_on_direct: boolean;
  show_qr: boolean;
  qr_url_template: string;
  voucher_title: string;
  voucher_body: string;
  direct_title?: string;
  direct_body?: string;
  [key: string]: unknown;
}

export interface TicketDesign {
  [key: string]: unknown;
}

export interface BroadcastMessage {
  id: string;
  /** Message body; supports tokens e.g. {game} {retailer} {jackpot} {currency} {amount} */
  text: string;
  /** How long the popup stays on the seller screen (minutes). */
  duration_minutes: number;
  /** When the broadcast was sent (ISO). */
  sent_at: string;
  /** Optional title shown above the body. */
  title?: string;
  /** If true, seller terminal may auto-print the message. */
  print?: boolean;
  /** Optional sample values used only for back-office preview. */
  preview_game?: string;
  preview_retailer?: string;
  preview_amount?: number;
}

export interface AppState {
  user: AppUser | null;
  games: Game[];
  retailers: Retailer[];
  betTypes: BetType[];
  currency: string;
  settings: BrandSettings;
}
