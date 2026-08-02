"use client";

import { User } from "@supabase/supabase-js";
import { signInWithMicrosoft } from "@/lib/auth-client";
import { signOut } from "@/app/games/actions";

export function AuthButton({ user }: { user: User | null }) {
  if (user) {
    const meta = user.user_metadata as { picture?: string; avatar_url?: string } | undefined;
    const avatar = meta?.picture || meta?.avatar_url;
    const initial = (user.email?.[0] || "U").toUpperCase();

    return (
      <form action={signOut} className="flex items-center gap-2">
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 border-2 border-makecode-white object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center border-2 border-makecode-white bg-makecode-pink font-sans font-bold text-white">
            {initial}
          </div>
        )}
        <button
          type="submit"
          className="border-2 border-makecode-black bg-makecode-red px-3 py-1 font-sans text-sm font-bold text-white hover:bg-makecode-pink"
        >
          Sign out
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => signInWithMicrosoft()}
      className="border-2 border-makecode-black bg-makecode-blue px-4 py-2 font-sans font-bold text-white hover:bg-makecode-cyan"
    >
      Sign in with Microsoft
    </button>
  );
}
