import Link from "next/link";
import { searchGames } from "@/app/games/actions";
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
  );
}
