import { GameWithStats } from "@/app/games/actions";
import { GameCard } from "./GameCard";
import { User } from "@supabase/supabase-js";

export function GameRow({ title, games, user }: { title: string; games: GameWithStats[]; user: User | null }) {
  if (games.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-sans text-2xl font-bold text-makecode-yellow">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {games.map((game) => (
          <GameCard key={game.id} game={game} user={user} />
        ))}
      </div>
    </section>
  );
}
