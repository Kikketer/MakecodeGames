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
    <main className="flex min-h-screen flex-col gap-6 bg-zinc-50 px-6 py-6 dark:bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">MakeCode Games Library</h1>
        <AuthButton user={user} />
      </header>

      <CategoryTabs categories={categories} active={activeCategory} />

      {activeCategory === "game-jams" && <JamSelector jams={jams} activeJam={activeJam} />}

      <div className="flex flex-col gap-8">
        <GameRow title="Hot" games={hot} user={user} />
        <GameRow title="Most Liked" games={liked} user={user} />
        <GameRow title="Newest" games={newest} user={user} />
      </div>
    </main>
  );
}
