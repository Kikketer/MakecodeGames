/**
 * Internal types for the extension documentation pipeline.
 * These represent the parsed state of a MakeCode Arcade extension
 * before AI documentation generation.
 */

/** A single parameter extracted from a block function signature. */
export interface ParsedParameter {
  name: string;
  type: string;
  default?: string;
  /** From `//% paramName.defl=...` — the MakeCode block default. */
  blockDefault?: string;
  /** From `//% paramName.shadow=...` — the block input type. */
  shadow?: string;
}

/** A block definition extracted from `//%` annotations + function signature. */
export interface ParsedBlock {
  /** The TypeScript function name, e.g. `distanceBetween`. */
  functionName: string;
  blockId?: string;
  blockString: string;
  group: string;
  weight: number;
  deprecated: boolean;
  /** JSDoc comment text above the function (without the /** *\/ markers). */
  jsDoc?: string;
  /** The full function body source (including the signature line). */
  body: string;
  parameters: ParsedParameter[];
  returnType?: string;
}

/** An enum extracted from the extension source (used for parameter types). */
export interface ParsedEnum {
  name: string;
  members: { name: string; blockLabel?: string; blockHidden?: boolean }[];
}

/** The fully parsed extension, ready for AI documentation generation. */
export interface ParsedExtension {
  owner: string;
  repo: string;
  /** From pxt.json `name`. */
  pxtName: string;
  /** From pxt.json `description` (often empty). */
  pxtDescription?: string;
  /** The namespace declared in the source (e.g. `spriteutils`). */
  namespace: string;
  /** The GitHub package spec, e.g. `github:jwunderl/arcade-sprite-util`. */
  packageSlug: string;
  /** All TypeScript source files in the extension (filename → content). */
  sourceFiles: Record<string, string>;
  blocks: ParsedBlock[];
  enums: ParsedEnum[];
  /** Markdown docs from the repo's docs/ folder, if any (filename → content). */
  docsFiles: Record<string, string>;
  /** The README.md content, if present. */
  readme?: string;
}
