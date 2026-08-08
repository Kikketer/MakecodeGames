import type { Metadata } from "next";
import Link from "next/link";
import { extensions } from "@/content/extensions";

export const metadata: Metadata = {
  title: "MakeCode Arcade Extensions",
  description: "A curated directory of MakeCode Arcade extensions.",
};

export default function ExtensionsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <h2 className="font-sans text-2xl font-bold text-white">MakeCode Arcade Extensions</h2>
      <p className="font-sans text-white">
        A curated, student-friendly documentation set for community-made MakeCode Arcade extensions.
      </p>
      <ul className="flex flex-col gap-4">
        {extensions.map((extension) => (
          <li
            key={`${extension.owner}/${extension.repo}`}
            className="border-4 border-makecode-yellow bg-makecode-blue p-6 shadow-[4px_4px_0_#000000]"
          >
            <Link
              href={`/extensions/${extension.owner}/${extension.repo}`}
              className="font-sans text-lg font-bold text-makecode-yellow hover:underline"
            >
              {extension.displayName}
            </Link>
            <p className="mt-2 font-sans text-white">{extension.description}</p>
            <p className="mt-2 font-sans text-sm text-makecode-tan">
              {extension.tools.length} documented {extension.tools.length === 1 ? "tool" : "tools"} ·{" "}
              <code className="font-mono">{extension.packageSlug}</code>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
