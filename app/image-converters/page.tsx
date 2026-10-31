import type { Metadata } from "next";
import Link from "next/link";
import { CONVERTER_TOOLS } from "./converter-tools";

export const metadata: Metadata = {
  title: "Image Converters — MakeCode Games",
  description:
    "Convert PNG images into MakeCode Arcade img literals and .jres entries, or convert between img and .jres formats.",
};

function ToolIcon({ id }: { id: string }) {
  const common = "h-7 w-7";
  switch (id) {
    case "png-to-img":
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
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    case "img-to-png":
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
          <rect x="3" y="3" width="8" height="8" />
          <path d="M13 15l-2-2M15 13l2 2M11 21h10v-10h-4M21 11v-4a2 2 0 0 0-2-2h-4" />
        </svg>
      );
    case "img-to-jres":
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
          <rect x="3" y="4" width="8" height="8" />
          <rect x="13" y="12" width="8" height="8" />
          <path d="M11 8h5a2 2 0 0 1 2 2v2M13 16H8a2 2 0 0 1-2-2v-2" />
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
          <rect x="13" y="4" width="8" height="8" />
          <rect x="3" y="12" width="8" height="8" />
          <path d="M13 8H8a2 2 0 0 0-2 2v2M11 16h5a2 2 0 0 0 2-2v-2" />
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

export default function ImageConvertersPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="font-sans text-4xl font-extrabold tracking-tight text-makecode-yellow">
          Convert Your Images
        </h1>
        <p className="max-w-2xl font-sans text-lg text-makecode-tan">
          Turn PNG images into MakeCode Arcade img literals and .jres entries,
          or convert between the two formats.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        {CONVERTER_TOOLS.map((tool) => (
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
