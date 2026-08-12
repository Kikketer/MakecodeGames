"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Jam = { id: string; title: string };

const COLLAPSED_HEIGHT_PX = 64;

export function JamSelector({ jams, activeJam }: { jams: Jam[]; activeJam?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > COLLAPSED_HEIGHT_PX + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [jams]);

  if (jams.length === 0) return null;

  return (
    <div className="pt-2">
      <div
        ref={listRef}
        className="flex flex-wrap gap-2 overflow-hidden"
        style={{ maxHeight: expanded ? "none" : `${COLLAPSED_HEIGHT_PX}px` }}
      >
        {jams.map((jam) => {
          const isActive = activeJam === jam.id;
          return (
            <Link
              key={jam.id}
              href={`/games?category=game-jams&jam=${jam.id}`}
              className={`border-2 border-makecode-white px-3 py-1 font-sans text-sm font-bold transition ${
                isActive
                  ? "bg-makecode-teal text-white hover:bg-makecode-green"
                  : "bg-makecode-yellow text-makecode-black hover:bg-makecode-green"
              }`}
            >
              {jam.title}
            </Link>
          );
        })}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 font-sans text-sm font-bold text-makecode-yellow hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
