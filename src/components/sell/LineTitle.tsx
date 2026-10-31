"use client";

import type { BetType, Game } from "@/lib/types";
export { formatLineTitle } from "@/lib/line-title";
import { formatLineTitle as fmt } from "@/lib/line-title";

export function LineTitle({
  gameId,
  betTypeKey,
  games,
  betTypes,
}: {
  gameId: string;
  betTypeKey: string;
  games: Game[];
  betTypes: BetType[];
}) {
  return <>{fmt(gameId, betTypeKey, games, betTypes)}</>;
}
