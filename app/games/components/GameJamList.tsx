import { GameWithStats } from "@/app/games/actions";
import { GameJamCard } from "./GameJamCard";
import { User } from "@supabase/supabase-js";

export function GameJamList({ games, user }: { games: GameWithStats[]; user: User | null }) {
  if (games.length === 0) return null;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {games.map((game) => (
        <GameJamCard key={game.id} game={game} user={user} />
      ))}
    </section>
  );
}
