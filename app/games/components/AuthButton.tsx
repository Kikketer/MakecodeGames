"use client";

import { User } from "@supabase/supabase-js";
import { signInWithMicrosoft } from "@/lib/auth-client";
import { signOut } from "@/app/games/actions";

export function AuthButton({ user }: { user: User | null }) {
  if (user) {
    return (
      <form action={signOut} className="flex items-center gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{user.email}</span>
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign out
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => signInWithMicrosoft()}
      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Sign in with Microsoft
    </button>
  );
}
