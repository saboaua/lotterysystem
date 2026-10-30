import type { BlockedNumber, Game } from "./types";

export const PATTERN_RE = /^[0-9*]{1,6}$/;

export function newBlockedId(): string {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Split pasted text ("2323, 4444\n7777") into valid, de-duplicated numbers / patterns. */
export function parseNumberList(text: string): { numbers: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const numbers: string[] = [];
  const invalid: string[] = [];
  for (const part of parts) {
    if (PATTERN_RE.test(part)) {
      if (!numbers.includes(part)) numbers.push(part);
    } else invalid.push(part);
  }
  return { numbers, invalid };
}

export type RuleStatus = "active" | "paused" | "expired";

export function ruleStatus(r: BlockedNumber, today: string): RuleStatus {
  if (!r.enabled) return "paused";
  if (r.until && r.until < today) return "expired";
  return "active";
}

/** The digits that matter for a line's number ("2323-heart" for zodiac → "2323"). */
export function playedDigits(number: string): string {
  return number.split("-")[0].replace(/\D/g, "");
}

const stripZeros = (s: string) => s.replace(/^0+(?=\d)/, "");
const sortChars = (s: string) => s.split("").sort().join("");

function patternMatches(pattern: string, digits: string): boolean {
  if (pattern.length !== digits.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "*" && pattern[i] !== digits[i]) return false;
  }
  return true;
}

/** Does one rule block this play? `drawDate` is the date of the draw the line is for. */
export function ruleBlocks(
  r: BlockedNumber,
  game: Pick<Game, "id" | "format"> | undefined,
  betType: string,
  number: string,
  drawDate: string
): boolean {
  if (!r.enabled || !game || r.game_id !== game.id) return false;
  if (r.until && drawDate > r.until) return false;
  if (r.bet_types?.length && !r.bet_types.includes(betType)) return false;
  const played = playedDigits(number);
  if (!played) return false;
  if (game.format === "whe") return stripZeros(played) === stripZeros(r.number);
  if (patternMatches(r.number, played)) return true;
  if (r.permutations && !r.number.includes("*") && r.number.length === played.length) {
    return sortChars(r.number) === sortChars(played);
  }
  return false;
}

export function findBlocked(
  rules: BlockedNumber[],
  game: Pick<Game, "id" | "format"> | undefined,
  betType: string,
  number: string,
  drawDate: string
): BlockedNumber | null {
  if (!game || !rules.length) return null;
  return rules.find((r) => ruleBlocks(r, game, betType, number, drawDate)) ?? null;
}

export function describeUntil(r: BlockedNumber, today: string): string {
  if (!r.until) return "Until removed";
  if (r.until === today) return "Today only";
  return `Until ${r.until}`;
}
