"use client";

import { useFormStatus } from "react-dom";
import { User } from "@supabase/supabase-js";
import { GameWithStats } from "@/app/games/actions";
import { addLike } from "@/app/games/actions";
import { signInWithMicrosoft } from "@/lib/auth-client";

function LikeButton({ likes }: { likes: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1 border-2 border-makecode-black bg-makecode-pink px-3 py-1 font-sans text-sm font-bold text-white hover:bg-makecode-red disabled:opacity-50"
    >
      ♥ {likes}
    </button>
  );
}

function LikedIndicator({ likes }: { likes: number }) {
  return (
    <span className="flex items-center gap-1 px-3 py-1 font-sans text-sm font-bold text-makecode-pink">
      ♥ {likes}
    </span>
  );
}

export function LikeControl({ game, user }: { game: GameWithStats; user: User | null }) {
  if (!user) {
    return (
      <button
        onClick={() => signInWithMicrosoft()}
        className="flex items-center gap-1 border-2 border-makecode-black bg-makecode-mauve px-3 py-1 font-sans text-sm font-bold text-white hover:bg-makecode-pink"
      >
        ♥ {game.likes}
      </button>
    );
  }

  if (game.likedByMe) {
    return <LikedIndicator likes={game.likes} />;
  }

  return (
    <form action={addLike.bind(null, game.id)}>
      <LikeButton likes={game.likes} />
    </form>
  );
}
