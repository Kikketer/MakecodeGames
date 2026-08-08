import { notFound } from "next/navigation";
import { readGeneratedExtension, sortedGeneratedTools } from "@/lib/extension-docs/generated-reader";
import { ExtensionSidebar } from "@/app/extensions/components/ExtensionSidebar";

export const dynamic = "force-dynamic";

export default async function BetaExtensionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const extension = await readGeneratedExtension(owner, repo);

  if (!extension) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <div>
        <h2 className="font-sans text-2xl font-bold text-white">{extension.displayName}</h2>
        <p className="font-sans text-white">{extension.description}</p>
        <p className="mt-1 font-sans text-xs font-bold text-makecode-orange">
          AI-GENERATED BETA — for comparison only
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-start">
        <ExtensionSidebar
          owner={owner}
          repo={repo}
          tools={sortedGeneratedTools(extension)}
          basePath={`/extensions-beta/${owner}/${repo}`}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </main>
  );
}
