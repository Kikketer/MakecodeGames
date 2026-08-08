"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ExtensionTool } from "@/content/extensions/types";

export function ExtensionSidebar({
  owner,
  repo,
  tools,
  basePath: basePathProp,
}: {
  owner: string;
  repo: string;
  tools: ExtensionTool[];
  basePath?: string;
}) {
  const pathname = usePathname();
  const basePath = basePathProp ?? `/extensions/${owner}/${repo}`;

  const groups = new Map<string, ExtensionTool[]>();
  for (const tool of tools) {
    const group = groups.get(tool.group) ?? [];
    group.push(tool);
    groups.set(tool.group, group);
  }

  return (
    <nav
      aria-label="Extension tools"
      className="flex w-full shrink-0 flex-col gap-4 border-4 border-makecode-yellow bg-makecode-blue p-4 md:w-64"
    >
      <Link
        href={basePath}
        className={`font-sans text-sm font-bold uppercase tracking-wide ${
          pathname === basePath ? "text-makecode-yellow" : "text-white hover:text-makecode-yellow"
        }`}
      >
        Overview
      </Link>
      {Array.from(groups.entries()).map(([group, groupTools]) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="font-sans text-xs font-bold uppercase tracking-wide text-makecode-cyan">{group}</p>
          <ul className="flex flex-col">
            {groupTools.map((tool) => {
              const href = `${basePath}/${tool.slug}`;
              const active = pathname === href;
              return (
                <li key={tool.slug}>
                  <Link
                    href={href}
                    className={`block border-l-4 px-2 py-1 font-sans text-sm transition ${
                      active
                        ? "border-makecode-yellow bg-makecode-dark font-bold text-makecode-yellow"
                        : "border-transparent text-white hover:border-makecode-cyan hover:text-makecode-cyan"
                    } ${tool.deprecated ? "italic opacity-60" : ""}`}
                  >
                    {tool.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
