"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GameWithStats, searchGames, recordClick } from "@/app/games/actions";

const DEBOUNCE_MS = 250;
const MAX_DROPDOWN_RESULTS = 4;

function DropdownThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-8 w-10 shrink-0 items-center justify-center bg-makecode-tan font-sans text-[10px] text-makecode-brown">
        -
      </div>
    );
  }

  return (
    <div className="relative h-8 w-10 shrink-0 overflow-hidden bg-makecode-tan">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="40px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameWithStats[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      setPending(true);
      try {
        const matches = await searchGames(trimmed);
        setResults(matches.slice(0, MAX_DROPDOWN_RESULTS));
        setOpen(matches.length > 0);
      } finally {
        setPending(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/games/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  }

  function handleResultClick(game: GameWithStats) {
    startTransition(() => recordClick(game.id));
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      event.currentTarget.blur();
    }
  }

  const trimmedQuery = query.trim();

  return (
    <div ref={containerRef} className="relative flex items-center">
      <form
        method="GET"
        action="/games/search"
        onSubmit={handleSubmit}
        className="flex"
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={handleChange}
          onFocus={() => trimmedQuery && results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search games..."
          aria-label="Search games"
          className="w-40 border-2 border-makecode-black bg-white px-3 py-2 font-sans text-sm font-bold text-makecode-black placeholder:font-normal placeholder:text-makecode-brown focus:outline-none sm:w-56"
        />
        <button
          type="submit"
          disabled={!trimmedQuery || pending}
          className="border-2 border-l-0 border-makecode-black bg-makecode-cyan px-3 py-2 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-yellow disabled:opacity-50 sm:px-4"
        >
          Search
        </button>
      </form>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-72 border-2 border-makecode-black bg-white shadow-[4px_4px_0_#000000]">
          {results.map((game) => (
            <a
              key={game.id}
              href={game.game_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleResultClick(game)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-makecode-cyan"
            >
              <DropdownThumb src={game.thumb_url} alt={game.title} />
              <span
                className="truncate font-sans text-sm font-bold text-makecode-black"
                title={game.title}
              >
                {game.title}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
