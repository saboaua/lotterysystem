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

export interface BrandSettings {
  name: string;
  tagline: string;
  led_message: string;
  led_on: boolean;
  led_speed: number;
  led_color: string;
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
