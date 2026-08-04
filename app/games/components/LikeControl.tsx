"use client";

import { GameWithStats } from "@/app/games/actions";

function LikedIndicator({ likes }: { likes: number }) {
  return (
    <span
      className="inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full bg-makecode-pink px-1.5 font-sans text-xs font-bold text-red-800"
      aria-label={`${likes} likes`}
    >
      ♥ {likes}
    </span>
  );
}

export function LikeControl({ game }: { game: GameWithStats }) {
  return <LikedIndicator likes={game.likes} />;
}
