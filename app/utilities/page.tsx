import type { Metadata } from "next";
import Link from "next/link";
import { UTILITY_TOOLS } from "./utility-tools";

export const metadata: Metadata = {
  title: "Utilities — MakeCode Games",
  description:
    "Convert PNGs and .jres entries into MakeCode Arcade img literals and back.",
};

function ToolIcon({ id }: { id: string }) {
  const common = "h-7 w-7";
  switch (id) {
    case "png-to-img":
    case "png-to-jres":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    case "jres-to-img":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return null;
  }
}

function ArrowIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function UtilitiesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="font-sans text-4xl font-extrabold tracking-tight text-makecode-yellow">
          Image Utilities
        </h1>
        <p className="max-w-2xl font-sans text-lg text-makecode-tan">
          Convert PNGs into MakeCode Arcade img literals and .jres entries, or
          decode .jres data back into img literals.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        {UTILITY_TOOLS.map((tool) => (
          <article
            key={tool.id}
            className="relative flex w-full items-center gap-5 border-4 border-makecode-black bg-makecode-blue p-4 shadow-[4px_4px_0_#000000] transition hover:border-makecode-cyan focus-within:ring-2 focus-within:ring-makecode-yellow"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border-4 border-makecode-black bg-makecode-white text-makecode-black">
              <ToolIcon id={tool.id} />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-sans text-lg font-bold text-makecode-yellow">
                  {tool.title}
                </h2>
                <Link
                  href={tool.href}
                  className="focus:outline-none after:absolute after:inset-0"
                >
                  <span className="sr-only">Open {tool.title}</span>
                  <span className="text-makecode-cyan">
                    <ArrowIcon />
                  </span>
                </Link>
              </div>
              <p className="font-sans text-sm text-white">{tool.description}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
