"use client";

import { useState, useCallback, useTransition, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { searchExtensionTools, type SearchResult } from "../actions";

const MAX_QUERY_LENGTH = 400;

export function ExtensionSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // SPA back-button: when results arrive, push a state entry so the browser
  // back button clears results and re-shows the general list (no URL change).
  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      if (event.state?.extSearch) {
        // Back from results → clear results, keep query text for refinement.
        setResult(null);
        setError(null);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const showResults = useCallback((res: SearchResult) => {
    setResult(res);
    setError(null);
    // pushState on first result, replaceState on subsequent (avoid stacking).
    if (window.history.state?.extSearch) {
      window.history.replaceState({ extSearch: true }, "");
    } else {
      window.history.pushState({ extSearch: true }, "");
    }
  }, []);

  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
    // If we pushed a state entry, go back to pop it off.
    if (window.history.state?.extSearch) {
      window.history.back();
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        const res = await searchExtensionTools(trimmed);
        showResults(res);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you need…"
            aria-label="Describe what you need"
            maxLength={MAX_QUERY_LENGTH}
            className="flex-1 border-4 border-makecode-black bg-white px-4 py-3 font-sans text-base font-bold text-makecode-black placeholder:font-normal placeholder:text-makecode-brown focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || pending}
            className="border-4 border-l-0 border-makecode-black bg-makecode-cyan px-6 py-3 font-sans text-base font-bold text-makecode-black hover:bg-makecode-yellow disabled:opacity-50"
          >
            {pending ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <p className="font-sans text-white">{error}</p>
      )}

      {result && !error && (
        <div className="flex flex-col gap-3">
          <p className="font-sans font-bold text-makecode-yellow">
            Results for: &ldquo;{query}&rdquo;
          </p>
          {result.matches.length > 0 ? (
            <>
              {result.matches.map((match) => (
                <Link
                  key={match.id}
                  href={match.docUrl}
                  className="block border-4 border-makecode-yellow bg-makecode-blue p-4 shadow-[4px_4px_0_#000000] hover:border-makecode-cyan"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-sans text-lg font-bold text-makecode-yellow">
                      {match.title}
                    </span>
                    <span className="font-sans text-xs text-makecode-tan">
                      {match.extensionDisplayName}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-sm text-white">{match.blurb}</p>
                </Link>
              ))}
            </>
          ) : (
            <p className="font-sans text-white">{result.note}</p>
          )}
          <Link
            href="/extensions"
            onClick={(e) => {
              e.preventDefault();
              clearResults();
            }}
            className="self-start font-sans text-sm font-bold text-makecode-cyan hover:underline"
          >
            &larr; Back to extensions
          </Link>
        </div>
      )}

      {!result && !error && children}
    </div>
  );
}
