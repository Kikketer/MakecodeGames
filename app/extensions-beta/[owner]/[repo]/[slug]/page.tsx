import type { Metadata } from "next";
import { existsSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import {
  readGeneratedExtension,
  readGeneratedTool,
} from "@/lib/extension-docs/generated-reader";
import { ToolDoc } from "@/app/extensions/components/ToolDoc";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>;
}): Promise<Metadata> {
  const { owner, repo, slug } = await params;
  const tool = await readGeneratedTool(owner, repo, slug);
  if (!tool) return {};

  return {
    title: `${tool.title} (Beta) in MakeCode Arcade`,
    description: tool.whatItDoes,
  };
}

export default async function BetaToolPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>;
}) {
  const { owner, repo, slug } = await params;
  const tool = await readGeneratedTool(owner, repo, slug);

  if (!tool) {
    notFound();
  }

  const extension = await readGeneratedExtension(owner, repo);
  if (!extension) {
    notFound();
  }

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
