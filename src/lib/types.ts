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
  /** Which draw result to compare against: 1 = 1st prize number (default), 2 = 2nd, 3 = 3rd. */
  position?: 1 | 2 | 3;
  /** Restrict this tier to one play type (BetType.key). When set, `amount` is paid per 1.00 wagered. */
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
  /** Short ticket-text shortcut for this game, e.g. "dia" → {dia} prints "Diario". Defaults to the first 3 letters of the name. */
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
