export interface ExtensionToolParameter {
  name: string;
  type: string;
  default?: string;
  meaning: string;
}

export interface ExtensionTool {
  /** URL-safe slug, also used for the rendered SVG filename. */
  slug: string;
  /** Human-friendly name shown in the sidebar and page heading, e.g. "distance between". */
  title: string;
  blockId?: string;
  /** The literal `//% block=` string, used both for display and for rendering the block image. */
  blockString: string;
  group: string;
  weight: number;
  deprecated?: boolean;
  problem: string;
  whatItDoes: string;
  parameters: ExtensionToolParameter[];
  returns?: {
    type: string;
    meaning: string;
  };
  /** A short, copy-pasteable MakeCode `blocks` snippet, also used to render the block image. */
  example: string;
}

export interface ExtensionDoc {
  owner: string;
  repo: string;
  displayName: string;
  packageSlug: string;
  description: string;
  tools: ExtensionTool[];
}
