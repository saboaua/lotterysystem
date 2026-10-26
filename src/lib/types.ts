export type Role = "owner" | "retailer";

export type GameFormat = "digit" | "zodiac" | "whe" | "jackpot";

export type BetMode =
  | "exact"
  | "perm"
  | "bf"
  | "back"
  | "chances"
  | "zodiac"
  | "jackpot"
  | "whe";

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
  /** Current advertised jackpot for next draw */
  jackpot_current?: number;
  /** Jackpot before last rollover (for MOTD / reports) */
  jackpot_previous?: number;
  /** Floor / reset amount after a jackpot win */
  jackpot_base?: number;
  /** Fixed amount added when a draw closes with no jackpot winner */
  jackpot_increment?: number;
  /** Percent of that draw's sales added to the pool when no jackpot winner (0–100) */
  jackpot_sales_pct?: number;
  main_count?: number;
  main_max?: number;
  mega_count?: number;
  mega_max?: number;
  sessions?: GameSession[];
  bet_types?: string[];
  logo?: string;
  min_stake?: number;
  max_stake?: number;
  sort_order?: number;
  prize_tiers?: PrizeTier[];
}

export interface Retailer {
  id: string;
  number: string;
  name: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  phone?: string;
  commission_sell: number;
  commission_redeem: number;
  active: boolean;
  lat?: number;
  lng?: number;
  username?: string;
  /** ISO timestamp of last successful ping from POS */
  last_seen?: string;
  /** Server-side acknowledgement timestamp (base ping-back) */
  last_ack?: string;
}

export interface BetType {
  key: string;
  label: string;
  digits: number;
  mode: BetMode;
  multiplier: number;
  enabled: boolean;
  min_stake?: number;
  max_stake?: number;
}

export interface TicketLine {
  id: string;
  game: string;
  bet_type: string;
  number: string;
  amount: number;
  date: string;
  session?: string;
  symbols?: string[];
  balls?: number[];
  mega?: number;
  prize?: number;
  status?: string;
  prize_tier_id?: string;
  prize_rank?: number;
}

export interface Ticket {
  id: string;
  retailer_id: string;
  lines: TicketLine[];
  total: number;
  status: "sold" | "cancelled" | "won" | "paid" | "void";
  created_at: string;
  prize?: number;
  promo_code?: string;
  promo_id?: string;
  cancelled_at?: string;
  redeemed_at?: string;
  clerk_id?: string;
}

export interface Clerk {
  id: string;
  retailer_id: string;
  name: string;
  pin?: string;
  active: boolean;
}

export interface SupportTicket {
  id: string;
  retailer_id: string;
  subject: string;
  body: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
}

export interface DrawResult {
  id: string;
  game_id: string;
  draw_date: string;
  session?: string;
  first?: string;
  second?: string;
  third?: string;
  balls?: number[];
  mega?: number;
  zodiac?: string;
  whe?: number;
  source?: string;
  /** Jackpot amount at close of this draw (before rollover) */
  jackpot_at_draw?: number;
  /** New jackpot advertised for next draw after rollover / reset */
  jackpot_next?: number;
  /** True if jackpot tier had at least one winner */
  jackpot_won?: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  note?: string;
}

export interface PromoPrize {
  label: string;
  amount: number;
  quantity: number;
}

export interface Promotion {
  id: string;
  name: string;
  label: string;
  instruction: string;
  code_len: number;
  min_plays?: number;
  min_games?: number;
  min_amount?: number;
  game_ids?: string[];
  prize?: number;
  prizes?: PromoPrize[];
  active: boolean;
  start?: string;
  end?: string;
  url?: string;
}

export interface PromoCode {
  code: string;
  promotion_id: string;
  ticket_id?: string;
  retailer_id?: string;
  status: "issued" | "claimed" | "won" | "expired";
  prize_amount?: number;
  prize_label?: string;
  created_at: string;
  claimed_at?: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  retailer_id?: string;
  username?: string;
  must_change_password?: boolean;
}

export interface LedScheduleMessage {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
  start?: string;
  end?: string;
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
  /** How often POS sends a presence ping (seconds). Default 60. */
  ping_interval_sec?: number;
  /** Seconds without a ping before a shop is considered offline. Default 3x interval. */
  offline_after_sec?: number;
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
}

export interface TicketDesign {
  font: string;
  size: number;
  width: number;
  align: "left" | "center" | "right";
  header: string;
  footer: string;
  show_logo: boolean;
  logo_height: number;
  show_name: boolean;
  show_retailer: boolean;
  show_retailer_number?: boolean;
  show_retailer_address?: boolean;
  show_retailer_phone?: boolean;
  show_datetime?: boolean;
  show_barcode: boolean;
  show_qr: boolean;
  bold_total: boolean;
  qr_size?: number;
  qr_prefix?: string;
  show_jackpot?: boolean;
  jackpot_mode?: string;
  jackpot_text?: string;
  border_box?: boolean;
  divider?: string;
  padding?: number;
  line_gap?: number;
  messages?: string[];
  schedule_messages?: TicketScheduleMessage[];
  /** Manual message of the day (MOTD) — always rendered before scheduled messages at the same placement */
  manual_text?: string;
  /** Games this MOTD applies to; empty = all tickets */
  manual_text_game_ids?: string[];
  /** Where to place the MOTD relative to total / promo */
  motd_placement?: "after_total" | "after_promo";
  retailer_template?: string;
  preview_game_id?: string;
  logo?: string;
  paper_size?: "58mm" | "80mm" | "A4";
  printer_name?: string;
  promo_placement?: "after_total" | "before_total" | "footer";
}

export interface SalesSettings {
  currency: string;
  min_stake: number;
  max_stake: number;
  allow_multi_draw: boolean;
  max_multi_draw: number;
}

export interface AppState {
  user: AppUser | null;
  games: Game[];
  retailers: Retailer[];
  betTypes: BetType[];
  currency: string;
  settings: BrandSettings;
}
