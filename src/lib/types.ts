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

/** Prize tier used in draw calculation / settlement */
export type PrizeMatchRule =
  | "exact" // full number match
  | "exact_and_sign" // full number + zodiac sign
  | "last_n" // last N digits of winning number
  | "last_n_and_sign" // last N digits + zodiac sign
  | "whe_mark" // play whe mark
  | "jackpot_main" // all main balls
  | "jackpot_main_mega" // main + mega
  | "fixed"; // fixed payout label only

export interface PrizeTier {
  id: string;
  rank: number;
  label: string;
  /** Human description e.g. match 4 numbers & Zodiac Sign */
  description: string;
  amount: number;
  rule: PrizeMatchRule;
  /** For last_n / last_n_and_sign */
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
  /** 0=Sun .. 6=Sat; empty/undefined = every day */
  draw_days?: number[];
  jackpot_current?: number;
  main_count?: number;
  main_max?: number;
  mega_count?: number;
  mega_max?: number;
  sessions?: GameSession[];
  bet_types?: string[];
  /** Data URL or URL shown on sell tiles */
  logo?: string;
  /** Digit / number games — stake limits */
  min_stake?: number;
  max_stake?: number;
  sort_order?: number;
  /** Winning prize structure for draw calculation */
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

/** LED / sell-screen ticker scheduled rows */
export interface LedScheduleMessage {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
  /** ISO date YYYY-MM-DD optional window */
  start?: string;
  end?: string;
}

export interface BrandSettings {
  name: string;
  tagline: string;
  led_message: string;
  led_on: boolean;
  /** px/s style speed; UI maps slow/normal/fast */
  led_speed: number;
  led_color: string;
  logo?: string;
  /** Extra scheduled ticker messages */
  led_schedule?: LedScheduleMessage[];
}

export interface TicketScheduleMessage {
  id: string;
  label: string;
  /** Tokens: {date} {amount} {jackpot} {game} {game1} {amount1} {draw_time} {retailer} {ticket_id} {currency} {promo} */
  text: string;
  game_ids: string[];
  enabled: boolean;
  placement: "header" | "footer" | "after_lines" | "before_total";
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
  /** Message of the day under lines */
  manual_text?: string;
  /** Retailer block template under logo */
  retailer_template?: string;
  preview_game_id?: string;
  logo?: string;
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
