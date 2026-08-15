import Link from "next/link";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphabetIndex({
  counts,
  active,
}: {
  counts: Record<string, number>;
  active: string;
}) {
  const entries: { label: string; slug: string; count: number }[] = [
    ...LETTERS.map((letter) => ({ label: letter, slug: letter, count: counts[letter] ?? 0 })),
    { label: "#", slug: "other", count: counts["other"] ?? 0 },
  ];

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Alphabetical index">
      {entries.map(({ label, slug, count }) => {
        const isActive = active === slug;
        const disabled = count === 0;
        const href = `/games/all/${slug}`;

        if (disabled) {
          return (
            <span
              key={slug}
              className="border-2 border-makecode-white px-3 py-1 font-sans text-sm font-bold text-makecode-white/40"
            >
              {label}
            </span>
          );
        }

        return (
          <Link
            key={slug}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`border-2 border-makecode-white px-3 py-1 font-sans text-sm font-bold transition ${
              isActive
                ? "bg-makecode-yellow text-makecode-black"
                : "bg-makecode-cyan text-makecode-black hover:bg-makecode-yellow"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
