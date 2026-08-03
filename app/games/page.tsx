import { getUser } from "@/lib/auth";
import { listCategories, listJams, listGames } from "@/app/games/actions";
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
  const activeJam = Array.isArray(params.jam) ? params.jam[0] : params.jam;
  const limit = activeCategory === "game-jams" ? 100 : 10;

  const [user, categories, jams, hot, liked, newest] = await Promise.all([
    getUser(),
    listCategories(),
    listJams(),
    listGames({ category: activeCategory, jam: activeJam, sort: "hot", limit }),
    listGames({ category: activeCategory, jam: activeJam, sort: "likes", limit }),
    listGames({ category: activeCategory, jam: activeJam, sort: "newest", limit }),
  ]);

  const isJam = activeCategory === "game-jams";

  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <CategoryTabs categories={categories} active={activeCategory} />

      {isJam && <JamSelector jams={jams} activeJam={activeJam} />}

      {isJam ? (
        <GameJamList games={hot} user={user} />
      ) : (
        <div className="flex flex-col gap-8">
          <GameRow title="Hot" games={hot} user={user} />
          <GameRow title="Most Liked" games={liked} user={user} />
          <GameRow title="Newest" games={newest} user={user} />
        </div>
      )}
    </main>
  );
}
