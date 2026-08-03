import { User } from "@supabase/supabase-js";
import { AuthButton } from "./AuthButton";
import { SiteNav } from "./SiteNav";

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="bg-makecode-blue border-b-4 border-makecode-white px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold text-white">MakeCode Games!</h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            This is not affiliated with Microsoft, this is a fan-made site.{" "}
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
        <AuthButton user={user} />
      </div>
      <SiteNav />
    </header>
  );
}
