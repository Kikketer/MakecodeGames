import type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";
import { tilemappath } from "@/content/extensions/UnsignedArduino/TilemapPath";
import { arcadeSpriteUtil } from "@/content/extensions/jwunderl/arcade-sprite-util";

export const extensions: ExtensionDoc[] = [
  arcadeSpriteUtil,
  tilemappath,
];

export function getExtension(owner: string, repo: string): ExtensionDoc | undefined {
  return extensions.find((extension) => extension.owner === owner && extension.repo === repo);
}

export function getTool(owner: string, repo: string, slug: string): ExtensionTool | undefined {
  return getExtension(owner, repo)?.tools.find((tool) => tool.slug === slug);
}

export function sortedTools(extension: ExtensionDoc): ExtensionTool[] {
  return [...extension.tools].sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return b.weight - a.weight;
  });
}

export type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";
