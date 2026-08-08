import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  readGeneratedExtension,
  sortedGeneratedTools,
} from "@/lib/extension-docs/generated-reader";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  const extension = await readGeneratedExtension(owner, repo);
  if (!extension) return {};

  return {
    title: `${extension.displayName} (Beta) - AI-Generated Extension Docs`,
    description: extension.description,
  };
}

export default async function BetaExtensionOverviewPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const extension = await readGeneratedExtension(owner, repo);

  if (!extension) {
    notFound();
  }

  const tools = sortedGeneratedTools(extension);

  return (
    <div className="flex flex-col gap-4 border-4 border-makecode-orange bg-makecode-blue p-6">
      <p className="font-sans text-white">
        Pick a tool from the list on the left to see what it does, its parameters, and a copy-pasteable
        example. This extension has {tools.length} documented {tools.length === 1 ? "tool" : "tools"}.
      </p>
      <p className="font-sans text-white">
        Or open the extension directly in MakeCode Arcade:{" "}
        <a
          href={`https://arcade.makecode.com/#import:${extension.packageSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-makecode-yellow hover:underline"
        >
          Import {extension.repo}
        </a>
        .
      </p>
      <p className="font-sans text-sm text-makecode-cyan">
        Compare with the{" "}
        <Link
          href={`/extensions/${owner}/${repo}`}
          className="text-makecode-yellow hover:underline"
        >
          hand-written version
        </Link>
        .
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={`/extensions-beta/${owner}/${repo}/${tool.slug}`}
              className={`block border-2 border-makecode-white bg-makecode-dark px-3 py-2 font-sans text-white hover:border-makecode-yellow hover:text-makecode-yellow ${
                tool.deprecated ? "italic opacity-60" : ""
              }`}
            >
              {tool.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
