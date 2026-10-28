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
  /** Advertised progressive pool for the next / current open draw */
  jackpot_current?: number;
  /** Pool amount before the last rollover or win (for MOTD / reports) */
  jackpot_previous?: number;
  /** Seed / floor after a jackpot win (progressive reset amount) */
  jackpot_base?: number;
  /** Optional fixed amount added each draw with no jackpot winner */
  jackpot_increment?: number;
  /** Percent of that draw's sales added to the progressive pool (0–100) */
  jackpot_sales_pct?: number;
  /** Optional hard ceiling on the progressive pool */
  jackpot_cap?: number;
  /** Optional % of won jackpot reserved to help fund the next seed (0–100) */
  jackpot_reserve_pct?: number;
  /**
   * Short code for ticket tokens, e.g. "lm" → {jackpot_lm} and {prev_jackpot_lm}.
   * Also always available as {jackpot_<game_id>}.
   */
  jackpot_token?: string;
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

/** Fixed-price instant / Fast Play games sold from the sell screen. */
export type FastPlayPrice = 2 | 3 | 5 | 7;

export interface FastPlayGame {
  id: string;
  name: string;
  color: string;
  logo?: string;
  /** Ticket price points available for this title (AWG). */
  prices: FastPlayPrice[];
  /** Default price when clerk taps the tile. */
  default_price: FastPlayPrice;
  /** Master switch — inactive games are hidden from sell and reports. */
  active: boolean;
  /** When true and active, tile appears on the sell Fast Play tab. */
  show_on_sell: boolean;
  /** Optional short description shown under the name in back office. */
  description?: string;
  sort_order?: number;
  /** Top prize amount for display (not used for settlement yet). */
  top_prize?: number;
}

/** Account status for a retailer shop (separate from live online/offline ping). */
export type RetailerStatus = "active" | "suspended" | "disabled";

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
  /** @deprecated prefer status; kept for backward compatibility */
  active: boolean;
  /** active | suspended | disabled — default active when missing */
  status?: RetailerStatus;
  lat?: number;
  lng?: number;
  username?: string;
  last_seen?: string;
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
  jackpot_at_draw?: number;
  jackpot_next?: number;
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
  ping_interval_sec?: number;
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
  relative_to_motd?: "before_manual" | "after_manual";
  /** Optional schedule window start (ISO or datetime-local: YYYY-MM-DDTHH:mm). Empty = no start limit. */
  start?: string;
  /** Optional schedule window end (ISO or datetime-local: YYYY-MM-DDTHH:mm). Empty = no end limit. */
  end?: string;
}

/** Player top-up: either a printed voucher code, or a direct credit to a scanned player code. */
export type TopUpKind = "voucher" | "direct";
export type TopUpStatus = "issued" | "redeemed" | "credited" | "failed" | "void";

export interface TopUp {
  id: string;
  kind: TopUpKind;
  amount: number;
  retailer_id: string;
  clerk?: string;
  /** Voucher only: code the player enters on the website. */
  code?: string;
  /** Direct only: player account code that was scanned / typed. */
  player_code?: string;
  status: TopUpStatus;
  created_at: string;
  redeemed_at?: string;
  /** True when no player-account system is connected (nothing was really credited). */
  demo?: boolean;
  error?: string;
}

/** Back-office texts and rules for top-up tickets (all configurable). */
export interface TopUpDesign {
  enabled: boolean;
  website: string;
  quick_amounts: number[];
  min_amount: number;
  max_amount: number;
  code_length: number;
  code_prefix: string;
  /** Print a confirmation ticket after a direct credit. */
  print_on_direct: boolean;
  show_qr: boolean;
  /** Tokens: {website} {code} */
  qr_url_template: string;
  /** Printed voucher (seller chose a top-up). Tokens: {website} {code} {amount} {currency} {retailer} {date} */
  voucher_title: string;
  voucher_code_label: string;
  voucher_text: string;
  voucher_footer: string;
  /** Printed after a scanned player code was credited. Tokens: {amount} {currency} {player_code} {retailer} {date} {website} */
  credited_title: string;
  credited_text: string;
  credited_footer: string;
}

export interface TicketDesign {
  topup?: TopUpDesign;
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
  manual_text?: string;
  manual_text_game_ids?: string[];
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

/** Owner-broadcast popup shown on seller terminals. */
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
