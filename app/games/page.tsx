import { listJams, listGames } from "@/app/games/actions";
import { CategoryTabs } from "./components/CategoryTabs";
import { JamSelector } from "./components/JamSelector";
import { GameRow } from "./components/GameRow";
import { GameJamList } from "./components/GameJamList";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; jam?: string | string[] }>;
}) {
  const params = await searchParams;
  const activeCategory = (Array.isArray(params.category) ? params.category[0] : params.category) || "all";
  const requestedJam = Array.isArray(params.jam) ? params.jam[0] : params.jam;
  const isJam = activeCategory === "game-jams";

  // Fetch only what the active view needs. The jam view loads the jam list
  // (to resolve the latest jam default and populate the "Other Jams"
  // dropdown) plus a single game list for the active jam. The non-jam view
  // skips listJams entirely and reads the three ranked rows from the
  // game_scores view (the fetchAll path from PR #84).
  if (isJam) {
    const jams = await listJams();
    const activeJam = requestedJam || jams[0]?.id;
    const jamGames = await listGames({ category: "game-jams", jam: activeJam, sort: "hot", limit: 100 });

    return (
      <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
        <CategoryTabs active={activeCategory} />
        <JamSelector jams={jams} activeJam={activeJam} />
        <GameJamList games={jamGames} />
      </main>
    );
  }

  const [newest, hot, trending] = await Promise.all([
    listGames({ sort: "newest", limit: 10 }),
    listGames({ sort: "hot", limit: 10 }),
    listGames({ sort: "trending", limit: 10 }),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <CategoryTabs active={activeCategory} />
      <div className="flex flex-col gap-8">
        <GameRow title="Newest" games={newest} />
        <GameRow title="Hot" games={hot} />
        <GameRow title="Trending" games={trending} />
      </div>
    </main>
  );
}
