import Link from "next/link";

export function AllGamesPagination({
  letter,
  page,
  total,
  limit = 20,
}: {
  letter: string;
  page: number;
  total: number;
  limit?: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  const basePath = `/games/all/${letter}`;
  const pageHref = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  // Build a compact page-number list with ellipsis
  const pages: (number | "ellipsis")[] = [];
  const add = (n: number | "ellipsis") => {
    if (pages[pages.length - 1] !== n) pages.push(n);
  };

  add(1);
  if (page - 1 > 2) add("ellipsis");
  for (let n = Math.max(2, page - 1); n <= Math.min(pageCount - 1, page + 1); n++) {
    add(n);
  }
  if (pageCount - page > 2) add("ellipsis");
  if (pageCount > 1) add(pageCount);

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      {hasPrev ? (
        <Link
          href={pageHref(page - 1)}
          className="border-2 border-makecode-white bg-makecode-cyan px-3 py-1 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-yellow"
        >
          Prev
        </Link>
      ) : (
        <span className="border-2 border-makecode-white px-3 py-1 font-sans text-sm font-bold text-makecode-white/40">
          Prev
        </span>
      )}

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e${i}`} className="font-sans text-sm font-bold text-makecode-white">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`border-2 border-makecode-white px-3 py-1 font-sans text-sm font-bold transition ${
              p === page
                ? "bg-makecode-yellow text-makecode-black"
                : "bg-makecode-cyan text-makecode-black hover:bg-makecode-yellow"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {hasNext ? (
        <Link
          href={pageHref(page + 1)}
          className="border-2 border-makecode-white bg-makecode-cyan px-3 py-1 font-sans text-sm font-bold text-makecode-black hover:bg-makecode-yellow"
        >
          Next
        </Link>
      ) : (
        <span className="border-2 border-makecode-white px-3 py-1 font-sans text-sm font-bold text-makecode-white/40">
          Next
        </span>
      )}
    </nav>
  );
}
