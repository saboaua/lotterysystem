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
    const winNum = (result.first || "").replace(/\D/g, "");
    const played = line.number.replace(/\D/g, "");
    for (const tier of tiers) {
      if (tier.rule === "exact") {
        if (winNum && played === winNum) return { tier, amount: tier.amount };
      } else if (tier.rule === "last_n") {
        const n = tier.digits || 3;
        if (winNum && lastN(played, n) === lastN(winNum, n)) return { tier, amount: tier.amount };
      }
    }
    return null;
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

export interface DrawCalcTierummary {
  tier: PrizeTier;
  winners: number;
  payout: number;
}

export interface DrawCalcReport {
  result: DrawResult;
  game?: Game;
  tickets: number;
  sales: number;
  tierSummary: DrawCalcTierummary[];
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
