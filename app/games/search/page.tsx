import Link from "next/link";
import { searchGames, listGames, getTopicTitle } from "@/app/games/actions";
import { GameCard } from "../components/GameCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; topic?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawTopic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const query = rawQuery?.trim() || "";
  const topicId = rawTopic ? Number(rawTopic) : undefined;

  if (topicId) {
    const [topicTitle, games] = await Promise.all([
      getTopicTitle(topicId),
      listGames({ topic: topicId, sort: "hot", limit: 50 }),
    ]);

    return (
      <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
        <Link
          href="/games"
          className="w-fit border-2 border-makecode-black bg-makecode-cyan px-4 py-2 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-yellow"
        >
          Back to games
        </Link>

        <h2 className="font-sans text-2xl font-bold text-makecode-yellow">
          Games from topic: {topicTitle || `Topic ${topicId}`}
        </h2>

        {games.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <p className="font-sans text-white">Nothing found</p>
        )}
      </main>
    );
  }

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
