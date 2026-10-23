export type Role = "owner" | "retailer";

export type GameFormat = "digit" | "zodiac" | "whe" | "jackpot";

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
}

export interface BetType {
  key: string;
  label: string;
  multiplier: number;
  enabled: boolean;
}

export interface TicketLine {
  id: string;
  game: string;
  bet_type: string;
  number: string;
  amount: number;
  date: string;
  symbols?: string[];
  balls?: number[];
  mega?: number;
}

export interface Ticket {
  id: string;
  retailer_id: string;
  lines: TicketLine[];
  total: number;
  status: "sold" | "cancelled" | "won" | "paid";
  created_at: string;
}

export interface Clerk {
  id: string;
  retailer_id: string;
  name: string;
  pin: string;
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

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  retailer_id?: string;
}

export interface AppState {
  user: AppUser | null;
  games: Game[];
  retailers: Retailer[];
  betTypes: BetType[];
  currency: string;
  settings: {
    name: string;
    tagline: string;
  };
}
