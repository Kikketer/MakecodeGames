import Link from "next/link";

type Jam = { id: string; title: string };

export function JamSelector({ jams, activeJam }: { jams: Jam[]; activeJam?: string }) {
  if (jams.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {jams.map((jam) => {
        const isActive = activeJam === jam.id;
        return (
          <Link
            key={jam.id}
            href={`/games?category=game-jams&jam=${jam.id}`}
            className={`rounded-full px-3 py-1 text-sm transition ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {jam.title}
          </Link>
        );
      })}
    </div>
  );
}
