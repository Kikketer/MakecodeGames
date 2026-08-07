"use client";

import { GameWithStats } from "@/app/games/actions";

export function PlayControl({ game }: { game: GameWithStats }) {
  return (
    <span
      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-300 px-1.5 font-sans text-xs font-bold text-makecode-black"
      aria-label={`${game.plays} plays`}
    >
      {game.plays}
    </span>
  );
}
