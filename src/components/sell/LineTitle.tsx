"use client";

import type { BetType, Game } from "@/lib/types";

/** Game · play-type for cart / ticket lines — avoids "Play Whe · play_whe" duplication. */
export function formatLineTitle(
  gameId: string,
  betTypeKey: string,
  games: Game[],
  betTypes: BetType[]
): string {
  const gName = games.find((g) => g.id === gameId)?.name || gameId;
  const bt = betTypes.find((b) => b.key === betTypeKey);
  const label = bt?.label || betTypeKey.replace(/_/g, " ");
  if (
    betTypeKey === "play_whe" ||
    betTypeKey === "zodiac" ||
    betTypeKey === "jackpot" ||
    betTypeKey === "fast_play" ||
    label.toLowerCase() === gName.toLowerCase()
  ) {
    return gName;
  }
  return `${gName} · ${label}`;
}

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
  return <>{formatLineTitle(gameId, betTypeKey, games, betTypes)}</>;
}
