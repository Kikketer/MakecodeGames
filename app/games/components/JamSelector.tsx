"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Jam = { id: string; title: string };

export function JamSelector({ jams, activeJam }: { jams: Jam[]; activeJam?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (jams.length === 0) return null;

  const active = jams.find((jam) => jam.id === activeJam) ?? jams[0];
  const others = jams.filter((jam) => jam.id !== active?.id);

  return (
    <div ref={containerRef} className="relative flex items-center gap-3 pt-2">
      <h2 className="font-sans text-lg font-bold text-makecode-yellow">
        {active?.title ?? "Game Jams"}
      </h2>

      {others.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="border-2 border-makecode-white bg-makecode-cyan px-3 py-1 font-sans text-sm font-bold text-makecode-black transition hover:bg-makecode-yellow"
          >
            Other Jams ▾
          </button>

          {open && (
            <ul
              role="listbox"
              className="absolute left-0 top-full z-10 mt-1 max-h-80 w-72 overflow-auto border-2 border-makecode-black bg-white shadow-[4px_4px_0_#000000]"
            >
              {others.map((jam) => (
                <li key={jam.id}>
                  <Link
                    href={`/games?category=game-jams&jam=${jam.id}`}
                    onClick={() => setOpen(false)}
                    className="block truncate px-3 py-2 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-cyan"
                    title={jam.title}
                  >
                    {jam.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
