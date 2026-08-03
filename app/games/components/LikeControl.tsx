"use client";

import { GameWithStats } from "@/app/games/actions";

function LikedIndicator({ likes }: { likes: number }) {
  return (
    <span className="flex items-center gap-1 px-3 py-1 font-sans text-sm font-bold text-makecode-pink">
      ♥ {likes}
    </span>
  );
}

export function LikeControl({ game }: { game: GameWithStats }) {
  return <LikedIndicator likes={game.likes} />;
}
