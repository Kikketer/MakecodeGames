import { getUser } from "@/lib/auth";
import { listCategories, listJams, listGames } from "@/app/games/actions";
import { CategoryTabs } from "./components/CategoryTabs";
import { JamSelector } from "./components/JamSelector";
import { GameRow } from "./components/GameRow";
import { AuthButton } from "./components/AuthButton";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; jam?: string | string[] }>;
}) {
  const params = await searchParams;
  const activeCategory = (Array.isArray(params.category) ? params.category[0] : params.category) || "all";
  const activeJam = Array.isArray(params.jam) ? params.jam[0] : params.jam;

  const [user, categories, jams, hot, liked, newest] = await Promise.all([
    getUser(),
    listCategories(),
    listJams(),
    listGames({ category: activeCategory, jam: activeJam, sort: "hot" }),
    listGames({ category: activeCategory, jam: activeJam, sort: "likes" }),
    listGames({ category: activeCategory, jam: activeJam, sort: "newest" }),
  ]);

  return (
    <>
      <header className="bg-makecode-blue border-b-4 border-makecode-white px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-bold text-white">MakeCode Games Library</h1>
            <p className="mt-1 font-mono text-sm text-makecode-tan">
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
          <AuthButton user={user} />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
        <CategoryTabs categories={categories} active={activeCategory} />

        {activeCategory === "game-jams" && <JamSelector jams={jams} activeJam={activeJam} />}

        <div className="flex flex-col gap-8">
          <GameRow title="Hot" games={hot} user={user} />
          <GameRow title="Most Liked" games={liked} user={user} />
          <GameRow title="Newest" games={newest} user={user} />
        </div>
      </main>
    </>
  );
}
