import { GameWithStats } from "@/app/games/actions";
import { GameCard } from "./GameCard";

export function GameRow({ title, games }: { title: string; games: GameWithStats[] }) {
  if (games.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-sans text-2xl font-bold text-makecode-yellow">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}
