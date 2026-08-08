import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseBlocks, parseEnums, parseExtension } from "./parse-extension";

// A representative snippet of a MakeCode Arcade extension source file,
// matching the real //% annotation patterns from arcade-sprite-util.
const SAMPLE_SOURCE = `/**
 * Utility blocks for sprites
 */
//% weight=99 color="#4B7BEC" icon="\\uf2bd"
//% block="Sprite Utils"
//% groups='["Sprite", "General"]'
namespace spriteutils {
    export enum ImageTransform {
        //% block="flip horizontal"
        FlipHorizontal,
        //% block="flip vertical"
        FlipVertical,
        //% block="rotate 90 degrees clockwise"
        Rotate90CW
    }

    /**
     * Returns true if the given sprite does not exist,
     * or is destroyed, and false otherwise.
     */
    //% block="$sprite is destroyed"
    //% blockId=spriteutilextisdestroyed
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% weight=100
    //% group=Sprite
    export function isDestroyed(sprite: Sprite): boolean {
        return !sprite || !!(sprite.flags & sprites.Flag.Destroyed);
    }

    /**
     * Returns the distance between the center of two sprites in pixels.
     * If either sprite is undefined returns 0.
     */
    //% block="distance between $a and $b"
    //% blockId=spriteutilextdistbw
    //% a.shadow=variables_get
    //% a.defl=mySprite
    //% b.shadow=variables_get
    //% b.defl=myEnemy
    //% weight=90
    //% group=Sprite
    export function distanceBetween(a: Sprite | tiles.Location | util.Point, b: Sprite | tiles.Location | util.Point): number {
        if (!a || !b) return 0;
        return Math.sqrt(((a.x - b.x) ** 2) + ((a.y - b.y) ** 2));
    }

    //% blockId=spriteutilmoveto
    //% block="$sprite move to $location over $time ms||and pause $doPause"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% time.shadow=timePicker
    //% time.defl=100
    //% weight=55
    //% group=Sprite
    export function moveTo(sprite: Sprite, location: Sprite | tiles.Location | util.Point, time: number, doPause = false) {
        moveToAtSpeed(sprite, location, distanceBetween(sprite, location) / (time / 1000), doPause);
    }

    //% block="draw circle in $to at cx $cx cy $cy radius $r color $col"
    //% blockId=spriteutilextdrawcircle
    //% to.shadow=variables_get
    //% to.defl=myImage
    //% col.shadow=colorindexpicker
    //% col.defl=3
    //% cx.min=0 cx.max=160 cx.defl=80
    //% cy.min=0 cy.max=120 cy.defl=60
    //% r.min=0 r.max=40 r.defl=5
    //% weight=64
    //% group=General
    export function drawCircle(to: Image, cx: number, cy: number, r: number, col: number) {
        if (!to) return;
        to.drawCircle(cx, cy, r, col);
    }

    //% blockId=spriteutilpos
    //% block="x $x y $y"
    //% weight=1
    //% group=General
    //% deprecated
    export function pos(x: number, y: number): Position {
        return null;
    }

    export function nonBlockFunction(foo: string): void {
        // This should NOT be picked up as a block (no //% block= annotation)
    }
}`;

describe("parseBlocks", () => {
  it("extracts all blocks with //% block= annotations", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    expect(blocks).toHaveLength(5);
    expect(blocks.map((b) => b.functionName)).toEqual([
      "isDestroyed",
      "distanceBetween",
      "moveTo",
      "drawCircle",
      "pos",
    ]);
  });

  it("does not pick up functions without //% block=", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    expect(blocks.find((b) => b.functionName === "nonBlockFunction")).toBeUndefined();
  });

  it("parses block strings with spaces in quotes", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const dist = blocks.find((b) => b.functionName === "distanceBetween")!;
    expect(dist.blockString).toBe("distance between $a and $b");
  });

  it("parses block strings with || optional params", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const moveTo = blocks.find((b) => b.functionName === "moveTo")!;
    expect(moveTo.blockString).toBe("$sprite move to $location over $time ms||and pause $doPause");
  });

  it("extracts blockId, weight, and group", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const isDestroyed = blocks.find((b) => b.functionName === "isDestroyed")!;
    expect(isDestroyed.blockId).toBe("spriteutilextisdestroyed");
    expect(isDestroyed.weight).toBe(100);
    expect(isDestroyed.group).toBe("Sprite");
  });

  it("detects deprecated flag", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const pos = blocks.find((b) => b.functionName === "pos")!;
    expect(pos.deprecated).toBe(true);
    const isDestroyed = blocks.find((b) => b.functionName === "isDestroyed")!;
    expect(isDestroyed.deprecated).toBe(false);
  });

  it("extracts JSDoc comments", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const isDestroyed = blocks.find((b) => b.functionName === "isDestroyed")!;
    expect(isDestroyed.jsDoc).toContain("Returns true if the given sprite does not exist");
    expect(isDestroyed.jsDoc).not.toContain("/**");
    expect(isDestroyed.jsDoc).not.toContain("*/");
  });

  it("parses parameters with types, defaults, and block defaults", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const dist = blocks.find((b) => b.functionName === "distanceBetween")!;
    expect(dist.parameters).toHaveLength(2);
    expect(dist.parameters[0]).toEqual({
      name: "a",
      type: "Sprite | tiles.Location | util.Point",
      blockDefault: "mySprite",
      shadow: "variables_get",
    });
  });

  it("infers type from default value when no explicit type", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const moveTo = blocks.find((b) => b.functionName === "moveTo")!;
    const doPause = moveTo.parameters.find((p) => p.name === "doPause")!;
    expect(doPause.type).toBe("boolean");
    expect(doPause.default).toBe("false");
  });

  it("parses space-separated annotations on one line", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const drawCircle = blocks.find((b) => b.functionName === "drawCircle")!;
    const cx = drawCircle.parameters.find((p) => p.name === "cx")!;
    // cx.min=0 cx.max=160 cx.defl=80 are on one line
    // The .defl should be captured as blockDefault
    expect(cx.blockDefault).toBe("80");
  });

  it("extracts return types", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const isDestroyed = blocks.find((b) => b.functionName === "isDestroyed")!;
    expect(isDestroyed.returnType).toBe("boolean");
    const dist = blocks.find((b) => b.functionName === "distanceBetween")!;
    expect(dist.returnType).toBe("number");
  });

  it("captures the function body", () => {
    const blocks = parseBlocks(SAMPLE_SOURCE);
    const isDestroyed = blocks.find((b) => b.functionName === "isDestroyed")!;
    expect(isDestroyed.body).toContain("export function isDestroyed");
    expect(isDestroyed.body).toContain("return !sprite");
    expect(isDestroyed.body).toContain("}");
  });
});

describe("parseEnums", () => {
  it("extracts enum names and members", () => {
    const enums = parseEnums(SAMPLE_SOURCE);
    expect(enums).toHaveLength(1);
    expect(enums[0].name).toBe("ImageTransform");
    expect(enums[0].members).toHaveLength(3);
    expect(enums[0].members[0]).toEqual({
      name: "FlipHorizontal",
      blockLabel: "flip horizontal",
      blockHidden: false,
    });
  });

  it("extracts block labels for enum members", () => {
    const enums = parseEnums(SAMPLE_SOURCE);
    const labels = enums[0].members.map((m) => m.blockLabel);
    expect(labels).toEqual(["flip horizontal", "flip vertical", "rotate 90 degrees clockwise"]);
  });
});

// --- Tests for parseExtension with useApi: true (GitHub Contents API path) ---

const PXT_JSON = JSON.stringify({
  name: "test-extension",
  description: "A test extension",
  files: ["main.ts"],
});

function mockFetchResponses(responses: { status: number; body: unknown }[]) {
  let idx = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const resp = responses[idx] ?? responses[responses.length - 1];
    idx++;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
      text: async () => (typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body)),
    } as Response;
  });
}

function encodeBase64(content: string): string {
  return Buffer.from(content).toString("base64");
}

beforeEach(() => {
  process.env.GITHUB_TOKEN = "fake-token";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GITHUB_TOKEN;
});

describe("parseExtension with useApi", () => {
  it("fetches source via GitHub Contents API and parses blocks", async () => {
    mockFetchResponses([
      // getDefaultBranchSha: repo info
      { status: 200, body: { default_branch: "main" } },
      // getDefaultBranchSha: ref
      { status: 200, body: { object: { sha: "headsha" } } },
      // readFileFromRepo: pxt.json
      { status: 200, body: { content: encodeBase64(PXT_JSON), encoding: "base64" } },
      // readFileFromRepo: main.ts (from pxt.json files list)
      { status: 200, body: { content: encodeBase64(SAMPLE_SOURCE), encoding: "base64" } },
      // listRepoDirectory: root scan
      {
        status: 200,
        body: [
          { name: "main.ts", path: "main.ts", type: "file" },
          { name: "pxt.json", path: "pxt.json", type: "file" },
        ],
      },
      // listRepoDirectory: docs/ (404 — no docs folder)
      { status: 404, body: { message: "Not Found" } },
      // readFileFromRepo: README.md (404)
      { status: 404, body: { message: "Not Found" } },
    ]);

    const result = await parseExtension("testowner", "testrepo", { useApi: true });

    expect(result.owner).toBe("testowner");
    expect(result.repo).toBe("testrepo");
    expect(result.pxtName).toBe("test-extension");
    expect(result.pxtDescription).toBe("A test extension");
    expect(result.namespace).toBe("spriteutils");
    expect(result.blocks).toHaveLength(5);
    expect(result.enums).toHaveLength(1);
    expect(result.sourceFiles["main.ts"]).toBeDefined();
    expect(result.readme).toBeUndefined();
    expect(Object.keys(result.docsFiles)).toHaveLength(0);
  });

  it("fetches docs and README when they exist", async () => {
    mockFetchResponses([
      // getDefaultBranchSha: repo info
      { status: 200, body: { default_branch: "main" } },
      // getDefaultBranchSha: ref
      { status: 200, body: { object: { sha: "headsha" } } },
      // readFileFromRepo: pxt.json
      { status: 200, body: { content: encodeBase64(PXT_JSON), encoding: "base64" } },
      // readFileFromRepo: main.ts
      { status: 200, body: { content: encodeBase64(SAMPLE_SOURCE), encoding: "base64" } },
      // listRepoDirectory: root scan
      {
        status: 200,
        body: [
          { name: "main.ts", path: "main.ts", type: "file" },
        ],
      },
      // listRepoDirectory: docs/
      {
        status: 200,
        body: [
          { name: "usage.md", path: "docs/usage.md", type: "file" },
        ],
      },
      // readFileFromRepo: docs/usage.md
      { status: 200, body: { content: encodeBase64("# Usage\n\nHow to use"), encoding: "base64" } },
      // readFileFromRepo: README.md
      { status: 200, body: { content: encodeBase64("# Test Extension"), encoding: "base64" } },
    ]);

    const result = await parseExtension("testowner", "testrepo", { useApi: true });

    expect(result.readme).toBe("# Test Extension");
    expect(result.docsFiles["usage.md"]).toBe("# Usage\n\nHow to use");
  });

  it("throws if pxt.json is not found", async () => {
    mockFetchResponses([
      // getDefaultBranchSha: repo info
      { status: 200, body: { default_branch: "main" } },
      // getDefaultBranchSha: ref
      { status: 200, body: { object: { sha: "headsha" } } },
      // readFileFromRepo: pxt.json (404)
      { status: 404, body: { message: "Not Found" } },
    ]);

    await expect(parseExtension("testowner", "testrepo", { useApi: true })).rejects.toThrow(
      "pxt.json not found in testowner/testrepo",
    );
  });

  it("picks up .ts files from root scan that are not in pxt.json files list", async () => {
    const pxtWithOneFile = JSON.stringify({
      name: "test-ext",
      files: ["main.ts"],
    });
    const EXTRA_SOURCE = `namespace extra {
      //% block="extra block"
      //% blockId=extrablock
      export function extraBlock(): void {}
    }`;

    mockFetchResponses([
      // getDefaultBranchSha: repo info
      { status: 200, body: { default_branch: "main" } },
      // getDefaultBranchSha: ref
      { status: 200, body: { object: { sha: "headsha" } } },
      // readFileFromRepo: pxt.json
      { status: 200, body: { content: encodeBase64(pxtWithOneFile), encoding: "base64" } },
      // readFileFromRepo: main.ts (from pxt.json)
      { status: 200, body: { content: encodeBase64(SAMPLE_SOURCE), encoding: "base64" } },
      // listRepoDirectory: root scan — finds extra.ts not in pxt.json
      {
        status: 200,
        body: [
          { name: "main.ts", path: "main.ts", type: "file" },
          { name: "extra.ts", path: "extra.ts", type: "file" },
        ],
      },
      // readFileFromRepo: extra.ts (root scan finds it)
      { status: 200, body: { content: encodeBase64(EXTRA_SOURCE), encoding: "base64" } },
      // listRepoDirectory: docs/ (404)
      { status: 404, body: { message: "Not Found" } },
      // readFileFromRepo: README.md (404)
      { status: 404, body: { message: "Not Found" } },
    ]);

    const result = await parseExtension("testowner", "testrepo", { useApi: true });

    expect(result.sourceFiles["main.ts"]).toBeDefined();
    expect(result.sourceFiles["extra.ts"]).toBeDefined();
    // 5 blocks from SAMPLE_SOURCE + 1 from EXTRA_SOURCE
    expect(result.blocks).toHaveLength(6);
  });
});
