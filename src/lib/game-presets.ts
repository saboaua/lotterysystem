/**
 * Pre-loaded game templates for back office.
 * Operators pick a template → digits, bet types, matrix, stakes, and prize tiers
 * fill in automatically (same idea as jackpot matrix presets).
 */

import type { Game, GameFormat, GameSession } from "./types";
import { DEFAULT_JACKPOT_MATRIX, type JackpotMatrix } from "./jackpot-matrix";
import {
  defaultDigitPrizeTiers,
  diarioPayoutTiers,
  defaultJackpotPrizeTiers,
  defaultWhePrizeTiers,
  defaultZodiacPrizeTiers,
} from "./prize-tiers";

/** Supported fixed-length number games (Pick 2 … Pick 6). */
export type DigitLength = 2 | 3 | 4 | 5 | 6;

/** Digit / number-game parameter bundle. */
export type DigitParams = {
  digits: DigitLength;
  /** Bet-type keys enabled on this game */
  bet_types: string[];
  min_stake: number;
  max_stake: number;
};

/** Suggested bet types for a digit length (Aruba-style + plain Pick-N). */
export function betTypesForDigits(digits: DigitLength): string[] {
  if (digits === 2) {
    return ["2_cifra_3ch", "2_cifra_bf", "2_cifra_b"];
  }
  if (digits === 3) {
    return ["3_cifra", "3_skina", "2_cifra_3ch", "2_cifra_bf", "2_cifra_b"];
  }
  if (digits === 5) {
    return ["5_cifra", "4_cifra", "3_cifra", "2_cifra_3ch"];
  }
  if (digits === 6) {
    return ["6_cifra", "5_cifra", "4_cifra", "3_cifra"];
  }
  // 4-digit full Aruba menu
  return ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"];
}

export const DIGIT_PARAM_PRESETS: {
  id: string;
  label: string;
  hint: string;
  params: DigitParams;
}[] = [
  {
    id: "pick2",
    label: "Pick 2",
    hint: "2-digit · box / front-back style bets",
    params: { digits: 2, bet_types: betTypesForDigits(2), min_stake: 0.5, max_stake: 50 },
  },
  {
    id: "pick3",
    label: "Pick 3",
    hint: "3-digit · exact + permutation (Skina)",
    params: { digits: 3, bet_types: betTypesForDigits(3), min_stake: 0.5, max_stake: 100 },
  },
  {
    id: "pick4",
    label: "Pick 4",
    hint: "4-digit · full Aruba bet menu",
    params: { digits: 4, bet_types: betTypesForDigits(4), min_stake: 0.5, max_stake: 100 },
  },
  {
    id: "pick5",
    label: "Pick 5",
    hint: "5-digit · straight + shorter partials",
    params: { digits: 5, bet_types: betTypesForDigits(5), min_stake: 0.5, max_stake: 50 },
  },
  {
    id: "pick6",
    label: "Pick 6",
    hint: "6-digit · straight + shorter partials",
    params: { digits: 6, bet_types: betTypesForDigits(6), min_stake: 0.5, max_stake: 50 },
  },
  {
    id: "pick3_exact_only",
    label: "Pick 3 exact only",
    hint: "3-digit · straight (3 Cifra) only",
    params: { digits: 3, bet_types: ["3_cifra"], min_stake: 0.5, max_stake: 100 },
  },
  {
    id: "pick4_exact_only",
    label: "Pick 4 exact only",
    hint: "4-digit · straight (4 Cifra) only",
    params: { digits: 4, bet_types: ["4_cifra"], min_stake: 0.5, max_stake: 100 },
  },
  {
    id: "pick5_exact_only",
    label: "Pick 5 exact only",
    hint: "5-digit · straight (5 Cifra) only",
    params: { digits: 5, bet_types: ["5_cifra"], min_stake: 0.5, max_stake: 50 },
  },
  {
    id: "pick6_exact_only",
    label: "Pick 6 exact only",
    hint: "6-digit · straight (6 Cifra) only",
    params: { digits: 6, bet_types: ["6_cifra"], min_stake: 0.5, max_stake: 50 },
  },
];

export type GameTemplate = {
  id: string;
  label: string;
  group: "digit" | "jackpot" | "special";
  hint: string;
  /** Partial game fields applied on create / apply */
  patch: Partial<Game> & { format: GameFormat };
};

const midday: GameSession = {
  id: "midday",
  label: "Midday",
  draw_time: "13:00",
  cutoff: "12:45",
};

function digitTemplate(
  id: string,
  label: string,
  hint: string,
  params: DigitParams,
  extra?: Partial<Game>
): GameTemplate {
  return {
    id,
    label,
    group: "digit",
    hint,
    patch: {
      format: "digit",
      name: label,
      digits: params.digits,
      bet_types: params.bet_types,
      min_stake: params.min_stake,
      max_stake: params.max_stake,
      draw_time: "13:00",
      cutoff: "12:45",
      draw_days: [0, 1, 2, 3, 4, 5, 6],
      sessions: [midday],
      prize_tiers: defaultDigitPrizeTiers(params.digits),
      color:
        params.digits === 2
          ? "#0ea5e9"
          : params.digits === 3
            ? "#8b5cf6"
            : params.digits === 5
              ? "#f97316"
              : params.digits === 6
                ? "#db2777"
                : "#22c55e",
      ...extra,
    },
  };
}

function jackpotTemplate(
  id: string,
  label: string,
  hint: string,
  matrix: JackpotMatrix,
  extra?: Partial<Game>
): GameTemplate {
  return {
    id,
    label,
    group: "jackpot",
    hint,
    patch: {
      format: "jackpot",
      name: label,
      bet_types: ["jackpot"],
      main_count: matrix.main_count,
      main_max: matrix.main_max,
      mega_count: matrix.mega_count,
      mega_max: matrix.mega_max,
      min_stake: 1,
      max_stake: 1,
      draw_time: "18:45",
      cutoff: "18:15",
      draw_days: [0, 1, 2, 3, 4, 5, 6],
      jackpot_base: 50_000,
      jackpot_current: 50_000,
      jackpot_increment: 5_000,
      jackpot_sales_pct: 30,
      prize_tiers: defaultJackpotPrizeTiers(),
      color: "#64748b",
      ...extra,
    },
  };
}

/** Full catalog — extend this list to add new one-click games. */
function digitPreset(id: string): DigitParams {
  const p = DIGIT_PARAM_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error("Unknown digit preset: " + id);
  return p.params;
}

export const GAME_TEMPLATES: GameTemplate[] = [
  // ── Digit / number games ──────────────────────────────────────────
  digitTemplate("tpl_pick2", "Pick 2", "2-digit number game", digitPreset("pick2")),
  digitTemplate("tpl_pick3", "Pick 3", "3-digit number game (exact + box)", digitPreset("pick3")),
  digitTemplate("tpl_pick4", "Pick 4", "4-digit full menu (Aruba-style)", digitPreset("pick4")),
  digitTemplate("tpl_pick5", "Pick 5", "5-digit number game", digitPreset("pick5")),
  digitTemplate("tpl_pick6", "Pick 6", "6-digit number game", digitPreset("pick6")),
  digitTemplate(
    "tpl_diario",
    "Diario-style",
    "4-digit midday draw, full bet menu",
    digitPreset("pick4"),
    { name: "Diario", color: "#22c55e", draw_time: "13:00", cutoff: "12:45", prize_tiers: diarioPayoutTiers() }
  ),
  digitTemplate(
    "tpl_evening4",
    "Evening 4",
    "4-digit evening draw",
    digitPreset("pick4"),
    {
      name: "Evening 4",
      color: "#3b82f6",
      draw_time: "19:00",
      cutoff: "18:45",
      sessions: [{ id: "eve", label: "Evening", draw_time: "19:00", cutoff: "18:45" }],
    }
  ),

  // ── Jackpot ───────────────────────────────────────────────────────
  jackpotTemplate(
    "tpl_lottomac",
    "Lotto Mac style",
    "5 from 1–30 + Mega 1–15",
    { main_count: 5, main_max: 30, mega_count: 1, mega_max: 15 },
    { name: "Lotto Mac", jackpot_token: "lm", color: "#64748b" }
  ),
  jackpotTemplate(
    "tpl_classic649",
    "Classic 6/49",
    "6 from 1–49, no mega",
    { main_count: 6, main_max: 49, mega_count: 0, mega_max: 0 },
    { name: "Lotto 6/49", color: "#dc2626" }
  ),
  jackpotTemplate(
    "tpl_powerballish",
    "Powerball-style",
    "5 from 1–69 + 1 from 1–26",
    { main_count: 5, main_max: 69, mega_count: 1, mega_max: 26 },
    { name: "Powerball-style", color: "#b91c1c" }
  ),
  jackpotTemplate(
    "tpl_euromillionsish",
    "EuroMillions-style",
    "5 from 1–50 + 2 from 1–12",
    { main_count: 5, main_max: 50, mega_count: 2, mega_max: 12 },
    { name: "EuroMillions-style", color: "#1d4ed8" }
  ),
  jackpotTemplate(
    "tpl_default_jp",
    "Jackpot (default matrix)",
    "5/30 + mega 1/15 progressive",
    DEFAULT_JACKPOT_MATRIX,
    { name: "Jackpot" }
  ),

  // ── Special formats ───────────────────────────────────────────────
  {
    id: "tpl_zodiac",
    label: "Zodiac",
    group: "special",
    hint: "Number + zodiac sign",
    patch: {
      format: "zodiac",
      name: "Zodiaco",
      digits: 4,
      bet_types: ["zodiac"],
      min_stake: 1,
      max_stake: 50,
      draw_time: "18:45",
      cutoff: "18:30",
      draw_days: [0, 1, 2, 3, 4, 5, 6],
      prize_tiers: defaultZodiacPrizeTiers(),
      color: "#1e3a8a",
    },
  },
  {
    id: "tpl_whe",
    label: "Play Whe",
    group: "special",
    hint: "Mark 1 of 36 (Play Whe)",
    patch: {
      format: "whe",
      name: "Play Whe",
      digits: 2,
      bet_types: ["play_whe"],
      min_stake: 1,
      max_stake: 100,
      draw_time: "18:30",
      cutoff: "18:15",
      draw_days: [0, 1, 2, 3, 4, 5, 6],
      prize_tiers: defaultWhePrizeTiers(),
      color: "#ea580c",
    },
  },
];

export function findDigitPreset(digits: number, bet_types?: string[]): string | "" {
  const keys = [...(bet_types || [])].sort().join(",");
  for (const p of DIGIT_PARAM_PRESETS) {
    if (p.params.digits !== digits) continue;
    if ([...p.params.bet_types].sort().join(",") === keys) return p.id;
  }
  // Match by digits only if bet list is the default for that length
  if (digits === 2 || digits === 3 || digits === 4 || digits === 5 || digits === 6) {
    const def = betTypesForDigits(digits as DigitLength);
    if (!bet_types?.length || [...bet_types].sort().join(",") === [...def].sort().join(",")) {
      return (
        DIGIT_PARAM_PRESETS.find(
          (p) => p.params.digits === digits && /^pick[2-6]$/.test(p.id)
        )?.id || ""
      );
    }
  }
  return "";
}

/** Build a full Game from a template + unique id / sort order. */
export function gameFromTemplate(
  templateId: string,
  opts: { sort_order: number; id?: string }
): Game | null {
  const t = GAME_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return null;
  const id = opts.id || `game_${Date.now().toString(36)}`;
  return {
    id,
    name: t.patch.name || t.label,
    color: t.patch.color || "#6366f1",
    format: t.patch.format,
    digits: t.patch.digits,
    draw_time: t.patch.draw_time || "13:00",
    cutoff: t.patch.cutoff || "12:45",
    enabled: true,
    draw_days: t.patch.draw_days || [0, 1, 2, 3, 4, 5, 6],
    bet_types: t.patch.bet_types,
    min_stake: t.patch.min_stake,
    max_stake: t.patch.max_stake,
    sessions: t.patch.sessions,
    prize_tiers: t.patch.prize_tiers,
    main_count: t.patch.main_count,
    main_max: t.patch.main_max,
    mega_count: t.patch.mega_count,
    mega_max: t.patch.mega_max,
    jackpot_base: t.patch.jackpot_base,
    jackpot_current: t.patch.jackpot_current,
    jackpot_increment: t.patch.jackpot_increment,
    jackpot_sales_pct: t.patch.jackpot_sales_pct,
    jackpot_token: t.patch.jackpot_token,
    sort_order: opts.sort_order,
  };
}
