"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { GameWithStats } from "@/app/games/actions";
import { toggleLike, recordClick } from "@/app/games/actions";
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

export function GameCard({ game, user }: { game: GameWithStats; user: User | null }) {
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="w-64 shrink-0 border-4 border-makecode-yellow bg-white p-2 shadow-[4px_4px_0_#000000]">
      <a
        href={game.game_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/3] overflow-hidden bg-makecode-tan"
        onClick={() => startTransition(() => recordClick(game.id))}
      >
        {failed ? (
          <div className="flex h-full items-center justify-center font-sans text-xs text-makecode-brown">No preview</div>
        ) : (
          <Image
            src={game.thumb_url}
            alt={game.title}
            fill
            sizes="256px"
            className="object-cover"
            onError={() => setFailed(true)}
          />
        )}
      </a>
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="truncate font-sans text-base font-bold text-makecode-black" title={game.title}>
          {game.title}
        </h3>
        <p className="font-sans text-sm text-makecode-brown">{game.author_username || "Anonymous"}</p>
        <div className="mt-2 flex items-center justify-between">
          {user ? (
            <form action={toggleLike.bind(null, game.id)}>
              <LikeButton likes={game.likes} />
            </form>
          ) : (
            <button
              onClick={() => signInWithMicrosoft()}
              className="flex items-center gap-1 border-2 border-makecode-black bg-makecode-mauve px-3 py-1 font-sans text-sm font-bold text-white hover:bg-makecode-pink"
            >
              ♥ {game.likes}
            </button>
          )}
          <a
            href={game.forum_url || `https://forum.makecode.com/t/${game.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit the forum post for ${game.title}`}
            title={`Visit the forum post for ${game.title}`}
            className="font-sans text-sm font-bold text-makecode-blue hover:underline"
          >
            Forum ({game.replies})
          </a>
        </div>
      </div>
    </div>
  );
}
