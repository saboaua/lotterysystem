import type { DrawResult, Game, PrizeTier, Ticket, TicketLine } from "./types";

/** Default Zodiaco structure (4-digit + sign) as provided by operator. */
export function defaultZodiacPrizeTiers(): PrizeTier[] {
  return [
    {
      id: "z1",
      rank: 1,
      label: "1st",
      description: "match 4 numbers & Zodiac Sign",
      amount: 25000,
      rule: "exact_and_sign",
      enabled: true,
    },
    {
      id: "z2",
      rank: 2,
      label: "2nd",
      description: "match 4 numbers",
      amount: 2500,
      rule: "exact",
      enabled: true,
    },
    {
      id: "z3",
      rank: 3,
      label: "3rd",
      description: "match last 3 numbers & Zodiac Sign",
      amount: 500,
      rule: "last_n_and_sign",
      digits: 3,
      enabled: true,
    },
    {
      id: "z4",
      rank: 4,
      label: "4th",
      description: "match last 3 numbers",
      amount: 50,
      rule: "last_n",
      digits: 3,
      enabled: true,
    },
  ];
}

export function defaultDigitPrizeTiers(digits = 4): PrizeTier[] {
  return [
    {
      id: "d1",
      rank: 1,
      label: "1st",
      description: `match ${digits} numbers (exact)`,
      amount: 5000,
      rule: "exact",
      enabled: true,
    },
    {
      id: "d2",
      rank: 2,
      label: "2nd",
      description: "match last 3 numbers",
      amount: 500,
      rule: "last_n",
      digits: 3,
      enabled: true,
    },
    {
      id: "d3",
      rank: 3,
      label: "3rd",
      description: "match last 2 numbers",
      amount: 50,
      rule: "last_n",
      digits: 2,
      enabled: true,
    },
  ];
}

type TierSpec = [
  label: string,
  description: string,
  amount: number,
  bet_type: string,
  rule: PrizeTier["rule"],
  digits: number | undefined,
  position: 1 | 2 | 3,
];

function buildTiers(prefix: string, specs: TierSpec[]): PrizeTier[] {
  return specs.map(([label, description, amount, bet_type, rule, digits, position], i) => ({
    id: `${prefix}${i + 1}`,
    rank: i + 1,
    label,
    description,
    amount,
    rule,
    ...(digits ? { digits } : {}),
    position,
    bet_type,
    enabled: true,
  }));
}

/** Shared lower tiers of the Aruba / Sint Maarten / Bonaire / Curacao menu (Afl. 1.00 wager). */
const SHARED_MENU: TierSpec[] = [
  ["Pick 4 — 2nd prize", "Match 4 numbers", 1000, "4_cifra", "exact", undefined, 2],
  ["Pick 4 — 3rd prize", "Match 4 numbers", 500, "4_cifra", "exact", undefined, 3],
  ["3 Skina", "Match last 3 numbers", 700, "3_skina", "last_n", 3, 1],
  ["Last 3 — 1st prize", "Back 3 numbers", 400, "3_cifra", "last_n", 3, 1],
  ["Last 3 — 2nd prize", "Back 3 numbers", 200, "3_cifra", "last_n", 3, 2],
  ["Last 3 — 3rd prize", "Back 3 numbers", 100, "3_cifra", "last_n", 3, 3],
  ["3 Chances — 1st", "Last 2 numbers", 45, "2_cifra_3ch", "last_n", 2, 1],
  ["3 Chances — 2nd", "Last 2 numbers", 25, "2_cifra_3ch", "last_n", 2, 2],
  ["3 Chances — 3rd", "Last 2 numbers", 10, "2_cifra_3ch", "last_n", 2, 3],
  ["Back", "Last 2 (1st prize only)", 75, "2_cifra_b", "last_n", 2, 1],
  ["Front & Back", "Front 2 (1st prize)", 25, "2_cifra_bf", "first_n", 2, 1],
  ["Front & Back", "Back 2 (1st prize)", 55, "2_cifra_bf", "last_n", 2, 1],
];

/** Diario: Pick 4 1st 4,000 + shared menu (no 4 Skina). Per Afl. 1.00 wager. */
export function diarioPayoutTiers(): PrizeTier[] {
  return buildTiers("dia", [
    ["Pick 4 — 1st prize", "Match 4 numbers", 4000, "4_cifra", "exact", undefined, 1],
    ...SHARED_MENU,
  ]);
}

/** Philipsburg / Flamingo / Corsow: 4 Skina 5,000 (exact order) + Diario menu. */
export function fourSkinaPayoutTiers(): PrizeTier[] {
  return buildTiers("fs", [
    ["4 Skina", "Match 4 numbers (exact order)", 5000, "4_skina", "exact", undefined, 1],
    ["Pick 4 — 1st prize", "Match 4 numbers", 4000, "4_cifra", "exact", undefined, 1],
    ...SHARED_MENU,
  ]);
}

/** Super 4 pays on the 1st prize number only. */
export function super4PayoutTiers(): PrizeTier[] {
  return buildTiers("s4", [
    ["Pick 4 — 1st prize", "Match 4 numbers (exact order)", 5000, "4_cifra", "exact", undefined, 1],
    ["Last 3 — 1st prize", "Back 3 numbers", 700, "3_cifra", "last_n", 3, 1],
    ["Front & Back", "Front 2 (1st prize)", 25, "2_cifra_bf", "first_n", 2, 1],
    ["Front & Back", "Back 2 (1st prize)", 55, "2_cifra_bf", "last_n", 2, 1],
  ]);
}

/** Official payout structure per game id (from the published Prize Payouts tables). */
export const GAME_PAYOUT_PRESETS: Record<string, () => PrizeTier[]> = {
  diario: diarioPayoutTiers,
  super4: super4PayoutTiers,
  philb: fourSkinaPayoutTiers,
  flamingo: fourSkinaPayoutTiers,
  corsow: fourSkinaPayoutTiers,
};

/**
 * Upgrade saved games (browser storage) that still carry the old generic digit tiers.
 * Games already on the per-play-type structure (any tier with bet_type) are left untouched.
 */
export function migrateGamePayouts(games: Game[]): Game[] {
  return games.map((g) => {
    const preset = GAME_PAYOUT_PRESETS[g.id];
    if (!preset || g.format !== "digit") return g;
    if ((g.prize_tiers || []).some((t) => t.bet_type)) return g;
    return { ...g, prize_tiers: preset() };
  });
}

export function defaultWhePrizeTiers(): PrizeTier[] {
  return [
    {
      id: "w1",
      rank: 1,
      label: "1st",
      description: "match Play Whe mark",
      amount: 24,
      rule: "whe_mark",
      enabled: true,
    },
  ];
}

export function defaultJackpotPrizeTiers(): PrizeTier[] {
  return [
    {
      id: "j1",
      rank: 1,
      label: "Jackpot",
      description: "match all main numbers + mega",
      amount: 0,
      rule: "jackpot_main_mega",
      enabled: true,
    },
    {
      id: "j2",
      rank: 2,
      label: "2nd",
      description: "match all main numbers",
      amount: 500,
      rule: "jackpot_main",
      enabled: true,
    },
  ];
}

export function defaultPrizeTiersForFormat(format: Game["format"], digits?: number): PrizeTier[] {
  if (format === "zodiac") return defaultZodiacPrizeTiers();
  if (format === "whe") return defaultWhePrizeTiers();
  if (format === "jackpot") return defaultJackpotPrizeTiers();
  return defaultDigitPrizeTiers(digits || 4);
}

function parseZodiacLine(number: string): { digits: string; sign?: string } {
  const parts = number.split("-");
  if (parts.length >= 2) {
    return { digits: parts[0].replace(/\D/g, ""), sign: parts[parts.length - 1].toLowerCase() };
  }
  return { digits: number.replace(/\D/g, "") };
}

function lastN(num: string, n: number): string {
  const d = num.replace(/\D/g, "");
  return d.slice(-n);
}

/** Evaluate best (highest rank / amount) prize for one line against a draw result. */
export function matchLinePrize(
  line: TicketLine,
  game: Game,
  result: DrawResult
): { tier: PrizeTier; amount: number } | null {
  const tiers = (game.prize_tiers || [])
    .filter((t) => t.enabled)
    .slice()
    .sort((a, b) => a.rank - b.rank);
  if (!tiers.length) return null;

  if (game.format === "zodiac") {
    const winNum = (result.first || "").replace(/\D/g, "");
    const winSign = (result.zodiac || "").toLowerCase();
    const played = parseZodiacLine(line.number);
    const playedSign = (line.symbols?.[0] || played.sign || "").toLowerCase();

    for (const tier of tiers) {
      if (tier.rule === "exact_and_sign") {
        if (winNum && played.digits === winNum && winSign && playedSign === winSign) {
          return { tier, amount: tier.amount };
        }
      } else if (tier.rule === "exact") {
        if (winNum && played.digits === winNum) {
          return { tier, amount: tier.amount };
        }
      } else if (tier.rule === "last_n_and_sign") {
        const n = tier.digits || 3;
        if (
          winNum &&
          lastN(played.digits, n) === lastN(winNum, n) &&
          winSign &&
          playedSign === winSign
        ) {
          return { tier, amount: tier.amount };
        }
      } else if (tier.rule === "last_n") {
        const n = tier.digits || 3;
        if (winNum && lastN(played.digits, n) === lastN(winNum, n)) {
          return { tier, amount: tier.amount };
        }
      }
    }
    return null;
  }

  if (game.format === "whe") {
    const mark = result.whe;
    if (mark == null) return null;
    const played = parseInt(line.number, 10);
    if (played === mark) {
      const tier = tiers.find((t) => t.rule === "whe_mark") || tiers[0];
      return tier ? { tier, amount: tier.amount } : null;
    }
    return null;
  }

  if (game.format === "digit") {
    const played = line.number.replace(/\D/g, "");
    const drawn = [result.first, result.second, result.third].map((x) => (x || "").replace(/\D/g, ""));
    let best: { tier: PrizeTier; amount: number } | null = null;
    for (const tier of tiers) {
      // Per-play-type tiers only apply to their own bet type.
      if (tier.bet_type && tier.bet_type !== line.bet_type) continue;
      const winNum = drawn[(tier.position || 1) - 1];
      if (!winNum || !played) continue;
      const n = tier.digits || 3;
      // Per-play-type tiers need the played number to be exactly the matched length.
      if (tier.bet_type && tier.rule !== "exact" && played.length !== n) continue;
      let hit = false;
      if (tier.rule === "exact") hit = played === winNum;
      else if (tier.rule === "last_n") hit = lastN(played, n) === lastN(winNum, n);
      else if (tier.rule === "first_n") hit = played.slice(0, n) === winNum.slice(0, n);
      if (!hit) continue;
      // Per-play-type amounts are per 1.00 wagered (0.50 pays 50%).
      const amount = tier.bet_type ? Math.round(tier.amount * line.amount * 100) / 100 : tier.amount;
      if (!best || amount > best.amount) best = { tier, amount };
    }
    return best;
  }

  if (game.format === "jackpot") {
    const winBalls = (result.balls || []).slice().sort((a, b) => a - b);
    const winMega = result.mega;
    const played = (line.balls || []).slice().sort((a, b) => a - b);
    const playedMega = line.mega;
    const mainMatch =
      winBalls.length &&
      played.length === winBalls.length &&
      winBalls.every((b, i) => b === played[i]);
    for (const tier of tiers) {
      if (tier.rule === "jackpot_main_mega" && mainMatch && winMega != null && playedMega === winMega) {
        return { tier, amount: tier.amount || game.jackpot_current || 0 };
      }
      if (tier.rule === "jackpot_main" && mainMatch) {
        return { tier, amount: tier.amount };
      }
    }
    return null;
  }

  return null;
}

export interface DrawCalcTierSummary {
  tier: PrizeTier;
  winners: number;
  payout: number;
}

export interface DrawCalcReport {
  result: DrawResult;
  game?: Game;
  tickets: number;
  sales: number;
  tierSummary: DrawCalcTierSummary[];
  totalPayout: number;
  winningLines: number;
}

export function buildDrawCalcReport(
  result: DrawResult,
  game: Game | undefined,
  soldTickets: Ticket[]
): DrawCalcReport {
  const tickets = soldTickets.filter(
    (t) =>
      t.status !== "cancelled" &&
      t.lines.some(
        (l) =>
          l.game === result.game_id &&
          l.date === result.draw_date &&
          (result.session ? l.session === result.session : true)
      )
  );
  const sales = tickets.reduce((s, t) => s + t.total, 0);
  const tiers = (game?.prize_tiers || []).filter((t) => t.enabled).sort((a, b) => a.rank - b.rank);
  const counts = new Map<string, { tier: PrizeTier; winners: number; payout: number }>();
  for (const t of tiers) counts.set(t.id, { tier: t, winners: 0, payout: 0 });

  let winningLines = 0;
  if (game) {
    for (const t of tickets) {
      for (const line of t.lines) {
        if (line.game !== result.game_id || line.date !== result.draw_date) continue;
        if (result.session && line.session && line.session !== result.session) continue;
        const hit = matchLinePrize(line, game, result);
        if (hit) {
          winningLines += 1;
          const row = counts.get(hit.tier.id);
          if (row) {
            row.winners += 1;
            row.payout += hit.amount;
          }
        }
      }
    }
  }

  const tierSummary = [...counts.values()];
  const totalPayout = tierSummary.reduce((s, x) => s + x.payout, 0);
  return {
    result,
    game,
    tickets: tickets.length,
    sales,
    tierSummary,
    totalPayout,
    winningLines,
  };
}
