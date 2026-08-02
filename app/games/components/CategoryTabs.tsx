import Link from "next/link";

type Category = { id: number; name: string; slug: string; parent_category_id?: number | null };

const BUILT_IN = [
  { label: "All", slug: "all" },
  { label: "Game Jams", slug: "game-jams" },
];

export function CategoryTabs({ categories, active }: { categories: Category[]; active: string }) {
  const tabs = [
    ...BUILT_IN,
    ...categories
      .filter((c) => c.parent_category_id === 5 && !["all", "game-jams"].includes(c.slug))
      .map((c) => ({ label: c.name, slug: c.slug })),
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
      {tabs.map((tab) => {
        const isActive = active === tab.slug;
        return (
          <Link
            key={tab.slug}
            href={`/games?category=${tab.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
