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
      className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
    >
      ♥ {likes}
    </button>
  );
}

export function GameCard({ game, user }: { game: GameWithStats; user: User | null }) {
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="w-64 shrink-0 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <a
        href={game.game_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100"
        onClick={() => startTransition(() => recordClick(game.id))}
      >
        {failed ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">No preview</div>
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
        <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50" title={game.title}>
          {game.title}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{game.author_username || "Anonymous"}</p>
        <div className="mt-2 flex items-center justify-between">
          {user ? (
            <form action={toggleLike.bind(null, game.id)}>
              <LikeButton likes={game.likes} />
            </form>
          ) : (
            <button
              onClick={() => signInWithMicrosoft()}
              className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              ♥ {game.likes}
            </button>
          )}
          <a
            href={game.forum_url || `https://forum.makecode.com/t/${game.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Forum
          </a>
        </div>
      </div>
    </div>
  );
}
