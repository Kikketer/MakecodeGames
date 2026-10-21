"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GameWithStats, ForumTopic, searchGamesAndTopics, recordClick } from "@/app/games/actions";

const DEBOUNCE_MS = 250;
const MAX_DROPDOWN_RESULTS = 4;
const MAX_TOPIC_RESULTS = 3;

type DropdownItem =
  | { type: "topic"; topic: ForumTopic }
  | { type: "game"; game: GameWithStats };

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
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [games, setGames] = useState<GameWithStats[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const items: DropdownItem[] = useMemo(() => {
    const result: DropdownItem[] = [];
    for (const topic of topics.slice(0, MAX_TOPIC_RESULTS)) {
      result.push({ type: "topic", topic });
    }
    for (const game of games.slice(0, MAX_DROPDOWN_RESULTS)) {
      result.push({ type: "game", game });
    }
    return result;
  }, [topics, games]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      setPending(true);
      try {
        const { topics: matchedTopics, games: matchedGames } = await searchGamesAndTopics(trimmed, MAX_DROPDOWN_RESULTS);
        setTopics(matchedTopics);
        setGames(matchedGames);
        setHighlightedIndex(-1);
        const hasResults = matchedTopics.length > 0 || matchedGames.length > 0;
        setOpen(hasResults);
      } finally {
        setPending(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);
    setHighlightedIndex(-1);
    if (!value.trim()) {
      setTopics([]);
      setGames([]);
      setOpen(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/games/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  }

  function handleTopicClick(topic: ForumTopic) {
    router.push(`/games/search?topic=${topic.forum_topic_id}`);
    setQuery("");
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleGameClick(game: GameWithStats) {
    startTransition(() => recordClick(game.id));
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function openHighlightedResult() {
    const item = items[highlightedIndex];
    if (!item) return;

    if (item.type === "topic") {
      handleTopicClick(item.topic);
    } else {
      startTransition(() => recordClick(item.game.id));
      window.open(item.game.game_url, "_blank", "noopener,noreferrer");
      setOpen(false);
      setHighlightedIndex(-1);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) => Math.min(prev + 1, items.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
      return;
    }

    if (event.key === "Enter") {
      if (highlightedIndex >= 0 && items[highlightedIndex]) {
        event.preventDefault();
        openHighlightedResult();
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      event.currentTarget.blur();
    }
  }

  const trimmedQuery = query.trim();
  const hasTopics = items.some((item) => item.type === "topic");

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
          onFocus={() => trimmedQuery && items.length > 0 && setOpen(true)}
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
          {items.map((item, index) => (
            <div key={`${item.type}-${item.type === "topic" ? item.topic.forum_topic_id : item.game.id}`}>
              {item.type === "topic" ? (
                <a
                  href={`/games/search?topic=${item.topic.forum_topic_id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    handleTopicClick(item.topic);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`block px-3 py-2 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-cyan ${
                    index === highlightedIndex ? "bg-makecode-yellow" : ""
                  }`}
                >
                  <span className="block truncate" title={item.topic.title}>
                    {item.topic.title}
                  </span>
                  <span className="block truncate text-xs font-normal text-makecode-brown">
                    {item.topic.category_name || "Topic"} · {item.topic.reply_count} replies · {item.topic.view_count} views
                  </span>
                </a>
              ) : (
                <a
                  href={item.game.game_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleGameClick(item.game)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center gap-3 px-3 py-2 hover:bg-makecode-cyan ${
                    index === highlightedIndex ? "bg-makecode-yellow" : ""
                  }`}
                >
                  <DropdownThumb src={item.game.thumb_url} alt={item.game.title} />
                  <span
                    className="truncate font-sans text-sm font-bold text-makecode-black"
                    title={item.game.title}
                  >
                    {item.game.title}
                  </span>
                </a>
              )}
              {hasTopics && index === topics.slice(0, MAX_TOPIC_RESULTS).length - 1 && (
                <hr className="border-makecode-black" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
