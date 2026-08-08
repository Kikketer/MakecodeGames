import { User } from "@supabase/supabase-js";
import { AuthButton } from "./AuthButton";
import { SiteNav } from "./SiteNav";
import { SearchBox } from "@/app/games/components/SearchBox";

export function SiteHeader({ user }: { user: User | null }) {
  // Intentionally hidden — do not expose this login right now.
  // The sign-in code (AuthButton, signInWithMicrosoft, signOut, /auth/callback) is
  // kept on purpose for future use. Do not remove it. To re-enable, set SHOW_AUTH to true.
  const SHOW_AUTH = false;

  return (
    <header className="bg-makecode-blue border-b-4 border-makecode-white px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold text-white">MakeCode Games!</h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            A fan-made community library of MakeCode Arcade games. Visit{" "}
            <a
              href="https://arcade.makecode.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white hover:underline"
            >
              MakeCode Arcade
            </a>{" "}
            to make a game!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox />
          {SHOW_AUTH && <AuthButton user={user} />}
        </div>
      </div>
      <SiteNav />
    </header>
  );
}
