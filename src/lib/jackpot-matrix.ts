/**
 * Jackpot / lotto matrix helpers — industry-standard n/k + optional secondary pool.
 *
 * Real-world matrices (illustrative):
 * - Classic lotto:       6 from 49          (no mega)
 * - Powerball-style:     5 from 69 + 1 from 26
 * - Mega Millions-style: 5 from 70 + 1 from 25
 * - EuroMillions-style:  5 from 50 + 2 from 12
 * - Small regional JP:   5 from 30 + 1 from 10–15
 */

export type JackpotMatrix = {
  main_count: number;
  main_max: number;
  /** 0 = no secondary ball */
  mega_count: number;
  mega_max: number;
};

export type MatrixPreset = {
  id: string;
  label: string;
  hint: string;
  matrix: JackpotMatrix;
};

/** Common operator presets for back-office quick setup. */
export const JACKPOT_MATRIX_PRESETS: MatrixPreset[] = [
  {
    id: "lm_5_30_1_15",
    label: "Lotto Mac style",
    hint: "5 from 1–30 + Mega 1 from 1–15",
    matrix: { main_count: 5, main_max: 30, mega_count: 1, mega_max: 15 },
  },
  {
    id: "lm_5_30_1_10",
    label: "Regional 5/30 + mega 10",
    hint: "5 from 1–30 + Mega 1 from 1–10",
    matrix: { main_count: 5, main_max: 30, mega_count: 1, mega_max: 10 },
  },
  {
    id: "classic_6_49",
    label: "Classic 6/49",
    hint: "6 from 1–49 (no mega)",
    matrix: { main_count: 6, main_max: 49, mega_count: 0, mega_max: 0 },
  },
  {
    id: "classic_5_35",
    label: "5/35",
    hint: "5 from 1–35 (no mega)",
    matrix: { main_count: 5, main_max: 35, mega_count: 0, mega_max: 0 },
  },
  {
    id: "powerballish",
    label: "Powerball-style",
    hint: "5 from 1–69 + 1 from 1–26",
    matrix: { main_count: 5, main_max: 69, mega_count: 1, mega_max: 26 },
  },
  {
    id: "megamillionsish",
    label: "Mega Millions-style",
    hint: "5 from 1–70 + 1 from 1–25",
    matrix: { main_count: 5, main_max: 70, mega_count: 1, mega_max: 25 },
  },
  {
    id: "euromillionsish",
    label: "EuroMillions-style",
    hint: "5 from 1–50 + 2 from 1–12",
    matrix: { main_count: 5, main_max: 50, mega_count: 2, mega_max: 12 },
  },
  {
    id: "uk_6_59",
    label: "UK Lotto-style",
    hint: "6 from 1–59 (no mega)",
    matrix: { main_count: 6, main_max: 59, mega_count: 0, mega_max: 0 },
  },
];

export const DEFAULT_JACKPOT_MATRIX: JackpotMatrix = {
  main_count: 5,
  main_max: 30,
  mega_count: 1,
  mega_max: 15,
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Normalize operator input into a valid matrix. */
export function sanitizeMatrix(input: Partial<JackpotMatrix>): JackpotMatrix {
  let main_max = clampInt(Number(input.main_max ?? DEFAULT_JACKPOT_MATRIX.main_max), 2, 99);
  let main_count = clampInt(Number(input.main_count ?? DEFAULT_JACKPOT_MATRIX.main_count), 1, main_max);
  let mega_count = clampInt(Number(input.mega_count ?? 0), 0, 5);
  let mega_max =
    mega_count === 0
      ? 0
      : clampInt(Number(input.mega_max ?? DEFAULT_JACKPOT_MATRIX.mega_max), mega_count, 99);
  if (mega_count > 0 && mega_max < mega_count) mega_max = mega_count;
  if (main_count > main_max) main_count = main_max;
  return { main_count, main_max, mega_count, mega_max };
}

/** Binomial coefficient C(n, k) — exact for lottery-sized n. */
export function combinations(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let num = 1;
  let den = 1;
  for (let i = 1; i <= k; i++) {
    num *= n - k + i;
    den *= i;
  }
  return Math.round(num / den);
}

/** Total ticket combinations for jackpot odds (1 in N). */
export function matrixCombinations(m: JackpotMatrix): number {
  const s = sanitizeMatrix(m);
  const main = combinations(s.main_max, s.main_count);
  if (s.mega_count <= 0 || s.mega_max <= 0) return main;
  return main * combinations(s.mega_max, s.mega_count);
}

export function formatOdds(total: number): string {
  if (!total || total < 1) return "—";
  return "1 in " + total.toLocaleString();
}

export function matrixSummary(m: Partial<JackpotMatrix>): string {
  const s = sanitizeMatrix(m);
  const main = `${s.main_count}/${s.main_max}`;
  if (s.mega_count <= 0) return main;
  return `${main} + ${s.mega_count}/${s.mega_max}`;
}

export function matrixFromGame(g: {
  main_count?: number;
  main_max?: number;
  mega_count?: number;
  mega_max?: number;
}): JackpotMatrix {
  return sanitizeMatrix({
    main_count: g.main_count,
    main_max: g.main_max,
    mega_count: g.mega_count,
    mega_max: g.mega_max,
  });
}
