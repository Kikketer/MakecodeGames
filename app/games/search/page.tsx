import Link from "next/link";
import { searchGames } from "@/app/games/actions";
import { SearchBox } from "../components/SearchBox";
import { GameCard } from "../components/GameCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() || "";
  const results = query ? await searchGames(query) : [];

  return (
    <>
      <header className="bg-makecode-blue border-b-4 border-makecode-white px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-3xl font-bold text-white">MakeCode Games!</h1>
            <p className="mt-1 font-sans text-sm text-makecode-tan">
              This is not affiliated with Microsoft, this is a fan-made site.{" "}
              Visit{" "}
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
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
        <Link
          href="/games"
          className="w-fit border-2 border-makecode-black bg-makecode-cyan px-4 py-2 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-yellow"
        >
          Back to games
        </Link>

        {query ? (
          <>
            <h2 className="font-sans text-2xl font-bold text-makecode-yellow">
              Results for &quot;{query}&quot;
            </h2>
            {results.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {results.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <p className="font-sans text-white">Nothing found</p>
            )}
          </>
        ) : (
          <p className="font-sans text-white">
            Enter a search query above to find games.
          </p>
        )}
      </main>
    </>
  );
}
