import { describe, it, expect } from "vitest";
import { applyIndexUpdate, generateExtensionFileSource, DEFAULT_INDEX_CONTENT } from "./write-doc";
import type { ExtensionDoc } from "@/content/extensions/types";

/** Build a minimal ExtensionDoc for testing. */
function makeDoc(owner: string, repo: string, overrides: Partial<ExtensionDoc> = {}): ExtensionDoc {
  return {
    owner,
    repo,
    displayName: "Test Extension",
    packageSlug: `github:${owner}/${repo}`,
    description: "A test extension.",
    tools: [
      {
        slug: "test-tool",
        title: "test tool",
        blockString: "test $x",
        group: "General",
        weight: 50,
        problem: "You need to test something.",
        whatItDoes: "Does a test thing.",
        parameters: [{ name: "x", type: "number", meaning: "the test value" }],
        example: "let x = 1",
      },
    ],
    ...overrides,
  };
}

describe("applyIndexUpdate", () => {
  it("adds an import and registers the extension in the array", () => {
    const content = DEFAULT_INDEX_CONTENT;
    const doc = makeDoc("jwunderl", "arcade-sprite-util");

    const updated = applyIndexUpdate(content, doc);

    expect(updated).toContain('import { arcadeSpriteUtil } from "@/content/extensions/jwunderl/arcade-sprite-util"');
    expect(updated).toContain("arcadeSpriteUtil");
    // The extensions array should now contain the export name
    expect(updated).toMatch(/extensions: ExtensionDoc\[\] = \[\s+arcadeSpriteUtil,?\s*\]/);
  });

  it("is idempotent — returns content unchanged if already imported", () => {
    const doc = makeDoc("jwunderl", "arcade-sprite-util");
    const once = applyIndexUpdate(DEFAULT_INDEX_CONTENT, doc);
    const twice = applyIndexUpdate(once, doc);
    expect(twice).toBe(once);
  });

  it("appends to an existing extensions array with other entries", () => {
    const existing = `import type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";
import { arcadeSpriteUtil } from "@/content/extensions/jwunderl/arcade-sprite-util";

export const extensions: ExtensionDoc[] = [
  arcadeSpriteUtil,
];

export function getExtension(owner: string, repo: string): ExtensionDoc | undefined {
  return extensions.find((extension) => extension.owner === owner && extension.repo === repo);
}
`;
    const doc = makeDoc("riknoll", "arcade-shader");
    const updated = applyIndexUpdate(existing, doc);

    expect(updated).toContain('import { arcadeShader } from "@/content/extensions/riknoll/arcade-shader"');
    expect(updated).toContain("arcadeSpriteUtil");
    expect(updated).toContain("arcadeShader");
  });

  it("handles repo names with multiple hyphens", () => {
    const doc = makeDoc("The-Code-Zone", "Raycasting-pxt-extension");
    const updated = applyIndexUpdate(DEFAULT_INDEX_CONTENT, doc);

    expect(updated).toContain(
      'import { raycastingPxtExtension } from "@/content/extensions/The-Code-Zone/Raycasting-pxt-extension"',
    );
  });
});

describe("generateExtensionFileSource", () => {
  it("generates valid TypeScript with the correct export name", () => {
    const doc = makeDoc("jwunderl", "arcade-sprite-util");
    const source = generateExtensionFileSource(doc);

    expect(source).toContain('import type { ExtensionDoc } from "@/content/extensions/types"');
    expect(source).toContain("export const arcadeSpriteUtil: ExtensionDoc = {");
    expect(source).toContain('"jwunderl"');
    expect(source).toContain('"arcade-sprite-util"');
  });

  it("includes all tool fields", () => {
    const doc = makeDoc("test", "test-repo");
    const source = generateExtensionFileSource(doc);

    expect(source).toContain("slug:");
    expect(source).toContain("title:");
    expect(source).toContain("blockString:");
    expect(source).toContain("problem:");
    expect(source).toContain("whatItDoes:");
    expect(source).toContain("parameters:");
    expect(source).toContain("example:");
  });

  it("uses template literals for multi-line examples", () => {
    const doc = makeDoc("test", "test-repo", {
      tools: [
        {
          slug: "multi",
          title: "multi",
          blockString: "multi $x",
          group: "General",
          weight: 50,
          problem: "test",
          whatItDoes: "test",
          parameters: [],
          example: "let x = 1\nlet y = 2",
        },
      ],
    });
    const source = generateExtensionFileSource(doc);
    // Multi-line example should use backtick template literal
    expect(source).toContain("example: `let x = 1\nlet y = 2`");
  });

  it("uses JSON string for single-line examples", () => {
    const doc = makeDoc("test", "test-repo", {
      tools: [
        {
          slug: "single",
          title: "single",
          blockString: "single $x",
          group: "General",
          weight: 50,
          problem: "test",
          whatItDoes: "test",
          parameters: [],
          example: "let x = 1",
        },
      ],
    });
    const source = generateExtensionFileSource(doc);
    expect(source).toContain('example: "let x = 1"');
  });
});
