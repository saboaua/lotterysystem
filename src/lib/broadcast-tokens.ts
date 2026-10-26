/** Expand broadcast message tokens for preview or seller display. */
export function expandBroadcastText(
  template: string,
  vars: {
    game?: string;
    retailer?: string;
    jackpot?: number | string;
    amount?: number | string;
    currency?: string;
  }
): string {
  const currency = vars.currency ?? "AWG";
  const jackpot =
    vars.jackpot != null
      ? typeof vars.jackpot === "number"
        ? vars.jackpot.toLocaleString("en-US")
        : String(vars.jackpot)
      : "—";
  const amount =
    vars.amount != null
      ? typeof vars.amount === "number"
        ? vars.amount.toLocaleString("en-US")
        : String(vars.amount)
      : "—";
  return template
    .replace(/\{game\}/gi, vars.game ?? "Game")
    .replace(/\{retailer\}/gi, vars.retailer ?? "Retailer")
    .replace(/\{jackpot\}/gi, jackpot)
    .replace(/\{amount\}/gi, amount)
    .replace(/\{currency\}/gi, currency);
}

export const BROADCAST_TOKEN_HELP =
  "Tokens: {game} · {retailer} · {jackpot} · {amount} · {currency}";
