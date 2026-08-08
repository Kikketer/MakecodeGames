import type { Metadata } from "next";
import Link from "next/link";
import { listGeneratedExtensions, readGeneratedExtension } from "@/lib/extension-docs/generated-reader";

export const metadata: Metadata = {
  title: "Beta Extension Docs (AI-Generated)",
  description: "Visual comparison of AI-generated extension documentation.",
};

export const dynamic = "force-dynamic";

export default async function BetaExtensionsPage() {
  const entries = await listGeneratedExtensions();
  const docs = await Promise.all(
    entries.map(async ({ owner, repo }) => {
      const doc = await readGeneratedExtension(owner, repo);
      return doc ? { doc } : null;
    }),
  );
  const validDocs = docs.filter((d): d is { doc: NonNullable<typeof d>["doc"] } => d !== null);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <div>
        <h2 className="font-sans text-2xl font-bold text-white">Beta Extension Docs (AI-Generated)</h2>
        <p className="mt-1 font-sans text-sm text-makecode-orange">
          Temporary comparison view — these are AI-generated docs for visual review against the
          hand-written ones at{" "}
          <Link href="/extensions" className="text-makecode-yellow hover:underline">
            /extensions
          </Link>
          .
        </p>
      </div>
      {validDocs.length === 0 ? (
        <p className="font-sans text-white">
          No generated docs found yet. Run{" "}
          <code className="font-mono text-makecode-cyan">
            npx tsx scripts/document-extension.ts &lt;owner&gt;/&lt;repo&gt;
          </code>{" "}
          to generate one.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {validDocs.map(({ doc }) => (
            <li
              key={`${doc.owner}/${doc.repo}`}
              className="border-4 border-makecode-orange bg-makecode-blue p-6 shadow-[4px_4px_0_#000000]"
            >
              <Link
                href={`/extensions-beta/${doc.owner}/${doc.repo}`}
                className="font-sans text-lg font-bold text-makecode-yellow hover:underline"
              >
                {doc.displayName}
              </Link>
              <p className="mt-2 font-sans text-white">{doc.description}</p>
              <p className="mt-2 font-sans text-sm text-makecode-tan">
                {doc.tools.length} documented {doc.tools.length === 1 ? "tool" : "tools"} ·{" "}
                <code className="font-mono">{doc.packageSlug}</code>
              </p>
              <p className="mt-1 font-sans text-xs text-makecode-cyan">
                Compare with{" "}
                <Link
                  href={`/extensions/${doc.owner}/${doc.repo}`}
                  className="text-makecode-yellow hover:underline"
                >
                  hand-written version
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
