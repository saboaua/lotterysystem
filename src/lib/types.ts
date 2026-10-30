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

export type FastPlayPrice = 2 | 3 | 5 | 7;

export interface FastPlayGame {
  id: string;
  name: string;
  color: string;
  logo?: string;
  prices: FastPlayPrice[];
  default_price: FastPlayPrice;
  active: boolean;
  show_on_sell: boolean;
  description?: string;
  sort_order?: number;
  top_prize?: number;
}

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
  active: boolean;
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
  voucher_code_label: string;
  voucher_text: string;
  voucher_footer: string;
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

export interface BroadcastMessage {
  id: string;
  text: string;
  duration_minutes: number;
  sent_at: string;
  title?: string;
  print?: boolean;
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
