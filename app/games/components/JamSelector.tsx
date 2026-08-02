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
            className={`border-2 border-makecode-white px-3 py-1 font-mono text-sm font-bold transition ${
              isActive
                ? "bg-makecode-teal text-white hover:bg-makecode-green"
                : "bg-makecode-yellow text-makecode-black hover:bg-makecode-green"
            }`}
          >
            {jam.title}
          </Link>
        );
      })}
    </div>
  );
}
