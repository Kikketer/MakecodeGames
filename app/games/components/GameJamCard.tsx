"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { GameWithStats } from "@/app/games/actions";
import { recordClick } from "@/app/games/actions";
import { LikeControl } from "./LikeControl";

export function GameJamCard({ game, user }: { game: GameWithStats; user: User | null }) {
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <article className="w-full border-4 border-makecode-yellow bg-white p-4 shadow-[4px_4px_0_#000000]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-xl font-bold text-makecode-black" title={game.title}>
            {game.title}
          </h3>
          <p className="font-sans text-sm text-makecode-brown">{game.author_username || "Anonymous"}</p>
        </div>
        <div className="flex items-center gap-3">
          <LikeControl game={game} user={user} />
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

      <div className="flex flex-col gap-4 md:flex-row">
        <a
          href={game.game_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-makecode-tan md:w-64"
          onClick={() => startTransition(() => recordClick(game.id))}
          aria-label={`Play ${game.title}`}
        >
          {failed ? (
            <div className="flex h-full items-center justify-center font-sans text-xs text-makecode-brown">No preview</div>
          ) : (
            <Image
              src={game.thumb_url}
              alt={game.title}
              fill
              sizes="(max-width: 768px) 100vw, 256px"
              className="object-cover"
              onError={() => setFailed(true)}
            />
          )}
        </a>

        {game.post_cooked ? (
          <div
            className="post-cooked min-w-0 flex-1 text-sm text-makecode-black [&_a]:text-makecode-blue [&_a]:hover:underline [&_img]:hidden [&_blockquote]:border-l-4 [&_blockquote]:border-makecode-mauve [&_blockquote]:pl-3"
            dangerouslySetInnerHTML={{ __html: game.post_cooked }}
          />
        ) : (
          <p className="flex-1 font-sans text-sm text-makecode-brown">No forum description available.</p>
        )}
      </div>
    </article>
  );
}
