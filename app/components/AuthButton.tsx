"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { signInWithMicrosoft } from "@/lib/auth-client";
import { signOut } from "@/app/games/actions";

export function AuthButton({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handle = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!user) {
    return (
      <button
        onClick={() => signInWithMicrosoft()}
        className="border-2 border-makecode-black bg-makecode-blue px-4 py-2 font-sans font-bold text-white hover:bg-makecode-cyan"
      >
        Sign in with Microsoft
      </button>
    );
  }

  const meta = user.user_metadata as { picture?: string; avatar_url?: string } | undefined;
  const avatar = meta?.picture || meta?.avatar_url;
  const initial = (user.email?.[0] || "U").toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="border-2 border-makecode-white"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center bg-makecode-pink font-sans font-bold text-white">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-10 mt-2 min-w-[10rem] border-2 border-makecode-black bg-makecode-white p-2 shadow-[4px_4px_0_#000000]"
          role="menu"
        >
          <form action={signOut}>
            <button
              type="submit"
              className="w-full border-2 border-makecode-black bg-makecode-red px-3 py-1 font-sans text-sm font-bold text-white hover:bg-makecode-pink"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
