import { redirect } from "next/navigation";
import { listAllGames, countAllLetters } from "@/app/games/actions";
import { CategoryTabs } from "../../components/CategoryTabs";
import { AlphabetIndex } from "../../components/AlphabetIndex";
import { AllGamesPagination } from "../../components/AllGamesPagination";
import { GameCard } from "../../components/GameCard";

const VALID_LETTERS = new Set([
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  "other",
]);

const PAGE_SIZE = 20;

export default async function AllGamesLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ letter: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { letter: rawLetter } = await params;
  const letter = rawLetter === "other" ? "other" : rawLetter.toUpperCase();

  if (!VALID_LETTERS.has(letter)) {
    redirect("/games/all/A");
  }

  const paramsObj = await searchParams;
  const rawPage = Array.isArray(paramsObj.page) ? paramsObj.page[0] : paramsObj.page;
  const page = Math.max(1, Math.floor(Number(rawPage) || 1));

  const [{ games, total }, counts] = await Promise.all([
    listAllGames({ letter, page, limit: PAGE_SIZE }),
    countAllLetters(),
  ]);

  const displayLetter = letter === "other" ? "#" : letter;

  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <CategoryTabs active="" allActive />

      <div className="flex flex-col gap-3">
        <h1 className="font-sans text-2xl font-bold text-makecode-yellow">
          All Games — {displayLetter}
        </h1>
        <AlphabetIndex counts={counts} active={letter} />
      </div>

      {games.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <p className="font-sans text-white">No games under {displayLetter}.</p>
      )}

      <AllGamesPagination letter={letter} page={page} total={total} limit={PAGE_SIZE} />
    </main>
  );
}
