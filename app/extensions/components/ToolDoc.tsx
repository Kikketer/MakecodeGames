import Image from "next/image";
import type { ExtensionTool } from "@/content/extensions/types";
import { BlockRenderer } from "@/app/extensions/components/BlockRenderer";

export function ToolDoc({
  owner,
  repo,
  packageSlug,
  tool,
  hasImage,
}: {
  owner: string;
  repo: string;
  packageSlug: string;
  tool: ExtensionTool;
  hasImage: boolean;
}) {
  return (
    <article className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="font-sans text-3xl font-bold text-white">{tool.title}</h1>
        {tool.deprecated && (
          <p className="mt-1 font-sans text-sm font-bold text-makecode-orange">
            Deprecated — kept for older projects, avoid using this in new code.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Problem it solves</h2>
        <p className="font-sans text-white">{tool.problem}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">What this block does</h2>
        <p className="font-sans text-white">{tool.whatItDoes}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">The block</h2>
        {tool.blockId && (
          <p className="font-sans text-white">
            Block ID: <code className="font-mono text-makecode-cyan">{tool.blockId}</code>
          </p>
        )}
        {hasImage ? (
          <Image
            src={`/extensions/${owner}/${repo}/${tool.slug}.svg`}
            alt={`${tool.blockString} block`}
            width={674}
            height={316}
            unoptimized
            className="max-w-full border-2 border-makecode-white bg-white"
          />
        ) : (
          <BlockRenderer packageSlug={packageSlug} repo={repo} tool={tool} />
        )}
      </section>

      {tool.parameters.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-sans text-xl font-bold text-makecode-yellow">Parameters</h2>
          <div className="overflow-x-auto border-2 border-makecode-white">
            <table className="w-full border-collapse font-sans text-sm text-white">
              <thead>
                <tr className="bg-makecode-blue text-left">
                  <th className="border-2 border-makecode-white px-4 py-2">Name</th>
                  <th className="border-2 border-makecode-white px-4 py-2">Type</th>
                  <th className="border-2 border-makecode-white px-4 py-2">Default</th>
                  <th className="border-2 border-makecode-white px-4 py-2">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {tool.parameters.map((param) => (
                  <tr key={param.name} className="bg-makecode-dark">
                    <td className="border-2 border-makecode-white px-4 py-2 font-mono">{param.name}</td>
                    <td className="border-2 border-makecode-white px-4 py-2">{param.type}</td>
                    <td className="border-2 border-makecode-white px-4 py-2 font-mono">{param.default ?? "—"}</td>
                    <td className="border-2 border-makecode-white px-4 py-2">{param.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tool.returns && (
        <section className="flex flex-col gap-2">
          <h2 className="font-sans text-xl font-bold text-makecode-yellow">Returns</h2>
          <p className="font-sans text-white">
            <code className="bg-makecode-blue px-1 font-mono text-white">{tool.returns.type}</code> — {tool.returns.meaning}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Example</h2>
        <pre className="overflow-x-auto border-2 border-makecode-black bg-makecode-black p-4 font-mono text-sm text-makecode-green">
          {tool.example}
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Add the extension</h2>
        <p className="font-sans text-white">
          Add <code className="font-mono text-makecode-cyan">{packageSlug}</code> to your project, or open:{" "}
          <a
            href={`https://arcade.makecode.com/#import:${packageSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-makecode-yellow hover:underline"
          >
            Import {repo}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
