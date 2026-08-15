import type { Metadata } from "next";
import { existsSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import { extensions, getTool } from "@/content/extensions";
import { ToolDoc } from "@/app/extensions/components/ToolDoc";

export function generateStaticParams() {
  return extensions.flatMap((extension) =>
    extension.tools.map((tool) => ({
      owner: extension.owner,
      repo: extension.repo,
      slug: tool.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>;
}): Promise<Metadata> {
  const { owner, repo, slug } = await params;
  const tool = getTool(owner, repo, slug);
  if (!tool) return {};

  return {
    title: `${tool.title} in MakeCode Arcade`,
    description: tool.whatItDoes,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>;
}) {
  const { owner, repo, slug } = await params;
  const tool = getTool(owner, repo, slug);

  if (!tool) {
    notFound();
  }

  const extension = extensions.find((e) => e.owner === owner && e.repo === repo)!;
  const hasImage = existsSync(join(process.cwd(), "public", "extensions", owner, repo, `${slug}.svg`));

  return (
    <ToolDoc
      owner={owner}
      repo={repo}
      packageSlug={extension.packageSlug}
      tool={tool}
      hasImage={hasImage}
    />
  );
}
