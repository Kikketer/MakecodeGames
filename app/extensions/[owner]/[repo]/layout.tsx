import Link from "next/link";
import { notFound } from "next/navigation";
import { getExtension, sortedTools } from "@/content/extensions";
import { ExtensionSidebar } from "@/app/extensions/components/ExtensionSidebar";

export default async function ExtensionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const extension = getExtension(owner, repo);

  if (!extension) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <div>
        <Link
          href="/extensions"
          className="font-sans text-sm font-bold text-makecode-cyan hover:underline"
        >
          &larr; Back to extensions
        </Link>
        <h2 className="mt-2 font-sans text-2xl font-bold text-white">{extension.displayName}</h2>
        <p className="font-sans text-white">{extension.description}</p>
      </div>
      <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-start">
        <ExtensionSidebar owner={owner} repo={repo} tools={sortedTools(extension)} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </main>
  );
}
