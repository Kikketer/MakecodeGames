"use client";

import { GameWithStats } from "@/app/games/actions";

export function PlayControl({ game }: { game: GameWithStats }) {
  return (
    <span
      className="flex items-center gap-1 px-3 py-1 font-sans text-sm font-bold text-makecode-green"
      aria-label={`${game.plays} plays`}
    >
      ▶ {game.plays}
    </span>
  );
}
