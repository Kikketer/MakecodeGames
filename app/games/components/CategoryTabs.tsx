import Link from "next/link";

type Category = { id: number; name: string; slug: string; parent_category_id?: number | null };

type Tab = { label: string; slug?: string; href?: string };

const BUILT_IN: Tab[] = [
  { label: "Today", slug: "all" },
  { label: "All", href: "/games/all" },
  { label: "Game Jams", slug: "game-jams" },
];

export function CategoryTabs({
  categories,
  active,
  allActive = false,
}: {
  categories: Category[];
  active: string;
  allActive?: boolean;
}) {
  const tabs: Tab[] = [
    ...BUILT_IN,
    ...categories
      .filter((c) => c.parent_category_id === 5 && c.slug === "show-tell")
      .map((c) => ({ label: c.name, slug: c.slug })),
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b-4 border-makecode-white pb-2">
      {tabs.map((tab) => {
        const href = tab.href ?? `/games?category=${tab.slug}`;
        const isActive = tab.href ? allActive : active === tab.slug;
        return (
          <Link
            key={tab.href ?? tab.slug}
            href={href}
            className={`border-2 border-makecode-white px-4 py-2 font-sans text-sm font-bold transition ${
              isActive
                ? "bg-makecode-red text-white hover:bg-makecode-pink"
                : "bg-makecode-cyan text-makecode-black hover:bg-makecode-yellow"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
