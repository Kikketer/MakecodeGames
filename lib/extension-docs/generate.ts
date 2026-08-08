/**
 * Documentation generator: uses Gemini to produce student-friendly
 * documentation for MakeCode Arcade extensions, with a reviewer loop
 * that iterates until quality criteria are met.
 */

import { generateJson, type GeminiContent } from "./gemini";
import type { ParsedExtension, ParsedBlock } from "./types";
import type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";

/** Maximum reviewer loop iterations before accepting the best attempt. */
const MAX_REVIEW_ITERATIONS = 3;

/**
 * The AI-generated documentation for a single block, before it's
 * matched to the final ExtensionTool shape.
 */
interface AIGeneratedTool {
  functionName: string;
  slug: string;
  title: string;
  problem: string;
  whatItDoes: string;
  parameters: { name: string; type: string; default?: string; meaning: string }[];
  returns?: { type: string; meaning: string };
  example: string;
}

interface AIGeneratedDoc {
  displayName: string;
  description: string;
  tools: AIGeneratedTool[];
}

interface ReviewFeedback {
  approved: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Build the system prompt that instructs Gemini how to generate docs.
 * Includes the target audience, output format, and quality criteria.
 */
function buildSystemPrompt(): string {
  return `You are a technical writer creating documentation for MakeCode Arcade extensions, targeted at middle school and high school students (ages 11-18).

## Your task
Analyze the source code and block definitions of a MakeCode Arcade extension, then generate clear, student-friendly documentation.

## Audience
- Students ages 11-18 who are learning to make games
- They know basic MakeCode Arcade blocks (sprites, controller, tiles)
- They may not know advanced programming concepts
- Use real-world game examples they can relate to (enemies, power-ups, health bars, jumping)

## For each tool/block, you must produce:
1. **functionName**: The TypeScript function name exactly as given in the block definition (e.g. "distanceBetween", "isDestroyed"). This is critical for matching.
2. **slug**: A URL-safe kebab-case slug (e.g. "distance-between", "is-destroyed"). Strip $param placeholders and trailing connector words like "and", "to", "from" from the block string to derive it.
3. **title**: A short, human-friendly name (e.g. "distance between", "is destroyed"). Strip $param placeholders and trailing connector words. Do NOT include trailing "and", "to", "from", etc.
4. **problem**: A 1-2 sentence real-world scenario where a student would need this tool. Start with "You..." and describe a concrete game situation. This is the most important field — it must be relatable and specific, not abstract.
5. **whatItDoes**: A clear 1-3 sentence explanation of what the tool does, in plain language. Mention important caveats (e.g. "only works for sprites without acceleration").
6. **parameters**: For each parameter, give name, type, default (if any), and a short meaning. The meaning should help a student understand what to put there.
7. **returns**: If the function returns a value, give the type and what it means.
8. **example**: A short, copy-pasteable MakeCode TypeScript snippet that shows the tool in use. Keep it minimal — just the essential setup and the tool call. For sprite images, use the shorthand \`img\\\`.\`\` (backtick-dot-backtick). Use the extension's namespace (e.g. \`spriteutils\`) for all tool calls. Do NOT escape backticks in the example — use them directly.

## Quality criteria
- The "problem" must describe a concrete game situation, not an abstract programming concept
- Language must be understandable by a 13-year-old
- Examples must be minimal and directly show the tool, not a full game
- All parameters from the function signature must be documented
- Return types must be documented if the function returns a value
- Deprecated tools should still be documented, with a note in "whatItDoes"

## Output format
Return a JSON object with:
- displayName: A friendly name for the extension (e.g. "Sprite Utils")
- description: A 1-2 sentence summary of what the extension does
- tools: Array of tool documentation objects`;
}

/**
 * Build the user prompt with the parsed extension data.
 * Includes the full source code for deep understanding.
 */
function buildUserPrompt(parsed: ParsedExtension): string {
  const blockSummaries = parsed.blocks.map((b) => {
    const params = b.parameters
      .map((p) => `${p.name}: ${p.type}${p.blockDefault ? ` (default: ${p.blockDefault})` : ""}`)
      .join(", ");
    return `### ${b.functionName}
- Block: "${b.blockString}"
- Block ID: ${b.blockId ?? "N/A"}
- Group: ${b.group} (weight: ${b.weight})${b.deprecated ? " [DEPRECATED]" : ""}
- Parameters: ${params || "none"}
- Returns: ${b.returnType ?? "void"}
${b.jsDoc ? `- JSDoc: ${b.jsDoc}` : ""}
${b.body ? `- Implementation:\n\`\`\`typescript\n${b.body}\n\`\`\`` : ""}`;
  }).join("\n\n");

  const enumSummaries = parsed.enums.map((e) => {
    const members = e.members
      .filter((m) => !m.blockHidden)
      .map((m) => `  - ${m.name}${m.blockLabel ? ` ("${m.blockLabel}")` : ""}`)
      .join("\n");
    return `### enum ${e.name}\n${members}`;
  }).join("\n\n");

  // Include docs markdown files as additional context
  const docsContext = Object.entries(parsed.docsFiles)
    .map(([filename, content]) => {
      // Truncate long docs
      const truncated = content.length > 2000 ? content.slice(0, 2000) + "\n...(truncated)" : content;
      return `#### ${filename}\n${truncated}`;
    })
    .join("\n\n");

  return `## Extension: ${parsed.owner}/${parsed.repo}
- Package: ${parsed.packageSlug}
- Namespace: ${parsed.namespace}
- pxt.json name: ${parsed.pxtName}
${parsed.pxtDescription ? `- pxt.json description: ${parsed.pxtDescription}` : ""}

## Block definitions (${parsed.blocks.length} blocks)

${blockSummaries}

## Enums (used by parameter types)

${enumSummaries || "(none)"}

${docsContext ? `## Existing markdown docs from the repo\n\n${docsContext}` : ""}

## Full source code context

The following source files are included for deep code understanding:

${Object.entries(parsed.sourceFiles)
  .filter(([filename]) => !filename.startsWith("test"))
  .map(([filename, content]) => `### ${filename}\n\`\`\`typescript\n${content}\n\`\`\``)
  .join("\n\n")}

Generate documentation for all ${parsed.blocks.length} blocks in this extension.`;
}

/**
 * Build a few-shot example from the existing arcade-sprite-util documentation.
 * This shows Gemini the exact quality and style we expect.
 */
function buildFewShotExample(): { user: string; model: string } {
  const exampleUser = `## Extension: jwunderl/arcade-sprite-util
- Namespace: spriteutils

## Block definitions (2 example blocks)

### distanceBetween
- Block: "distance between $a and $b"
- Block ID: spriteutilextdistbw
- Group: Sprite (weight: 90)
- Parameters: a: Sprite | tiles.Location | util.Point (default: mySprite), b: Sprite | tiles.Location | util.Point (default: myEnemy)
- Returns: number
- JSDoc: Returns the distance between the center of two sprites in pixels. If either sprite is undefined returns 0.
- Implementation:
\`\`\`typescript
export function distanceBetween(a: Sprite | tiles.Location | util.Point, b: Sprite | tiles.Location | util.Point): number {
    if (!a || !b) return 0;
    return Math.sqrt(((a.x - b.x) ** 2) + ((a.y - b.y) ** 2));
}
\`\`\`

### isDestroyed
- Block: "$sprite is destroyed"
- Block ID: spriteutilextisdestroyed
- Group: Sprite (weight: 100)
- Parameters: sprite: Sprite (default: mySprite)
- Returns: boolean
- JSDoc: Returns true if the given sprite does not exist, or is destroyed, and false otherwise.
- Implementation:
\`\`\`typescript
export function isDestroyed(sprite: Sprite): boolean {
    return !sprite || !!(sprite.flags & sprites.Flag.Destroyed);
}
\`\`\``;

  const exampleModel = JSON.stringify({
    displayName: "Sprite Utils",
    description: "A grab-bag of sprite math and rendering helpers for MakeCode Arcade: distances, angles, movement, timers, and simple drawing.",
    tools: [
      {
        functionName: "distanceBetween",
        slug: "distance-between",
        title: "distance between",
        problem: "You need to know how far away an enemy, power-up, or another sprite is from the player before doing something—playing a sound, firing a projectile, or ending the game.",
        whatItDoes: "Returns the distance in pixels between the centers of two sprites, points, or tile locations. If either sprite is missing or destroyed, it returns 0.",
        parameters: [
          { name: "a", type: "Sprite / Location / Point", default: "mySprite", meaning: "First point to measure from" },
          { name: "b", type: "Sprite / Location / Point", default: "myEnemy", meaning: "Second point to measure to" },
        ],
        returns: { type: "number", meaning: "The distance in pixels." },
        example: "let mySprite = sprites.create(img`.\`, SpriteKind.Player)\nlet myEnemy = sprites.create(img`.\`, SpriteKind.Enemy)\nlet distance = spriteutils.distanceBetween(mySprite, myEnemy)\nconsole.log(distance)",
      },
      {
        functionName: "isDestroyed",
        slug: "is-destroyed",
        title: "is destroyed",
        problem: "You saved a reference to a sprite (like an enemy or a bullet), but later code might run after that sprite has already been destroyed, and touching a destroyed sprite can crash your game.",
        whatItDoes: "Checks whether a sprite no longer exists or has already been destroyed, so you can safely skip code that would otherwise touch it.",
        parameters: [
          { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
        ],
        returns: { type: "boolean", meaning: "true if the sprite is missing or destroyed." },
        example: "let mySprite = sprites.create(img`.\`, SpriteKind.Player)\nlet myEnemy = sprites.create(img`.\`, SpriteKind.Enemy)\nif (spriteutils.isDestroyed(myEnemy)) {\n    console.log(\"enemy is gone\")\n}",
      },
    ],
  }, null, 2);

  return { user: exampleUser, model: exampleModel };
}

/**
 * Generate documentation for a parsed extension using Gemini,
 * with a reviewer loop that iterates until quality criteria are met.
 */
export async function generateDocumentation(
  parsed: ParsedExtension,
  options: { maxIterations?: number; onProgress?: (msg: string) => void } = {},
): Promise<{ doc: ExtensionDoc; iterations: number; finalScore: number }> {
  const maxIterations = options.maxIterations ?? MAX_REVIEW_ITERATIONS;
  const log = options.onProgress ?? ((msg: string) => console.log(msg));

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(parsed);
  const fewShot = buildFewShotExample();

  // Generation request with few-shot example
  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [{ text: fewShot.user }],
    },
    {
      role: "model",
      parts: [{ text: fewShot.model }],
    },
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  let bestDoc: AIGeneratedDoc | undefined;
  let bestScore = 0;
  let lastFeedback: ReviewFeedback | undefined;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    log(`[generate] iteration ${iteration + 1}/${maxIterations}`);

    // Build the generation contents, including reviewer feedback if available
    const genContents = [...contents];
    if (lastFeedback && bestDoc) {
      genContents.push({
        role: "model",
        parts: [{ text: JSON.stringify(bestDoc, null, 2) }],
      });
      genContents.push({
        role: "user",
        parts: [{
          text: `The previous documentation attempt received these review notes (score: ${lastFeedback.score}/10):

Issues:
${lastFeedback.issues.map((i) => `- ${i}`).join("\n")}

Suggestions:
${lastFeedback.suggestions.map((s) => `- ${s}`).join("\n")}

Please regenerate the full documentation addressing these issues. Return the same JSON format.`,
        }],
      });
    }

    // Generate documentation
    const generated = await generateJson<AIGeneratedDoc>({
      contents: genContents,
      systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: iteration === 0 ? 0.8 : 0.6 },
    });

    bestDoc = generated;
    log(`[generate] got ${generated.tools.length} tools`);

    // Run reviewer
    log(`[review] reviewing iteration ${iteration + 1}`);
    const review = await reviewDocumentation(parsed, generated);
    log(`[review] score: ${review.score}/10, approved: ${review.approved}`);

    if (review.score > bestScore) {
      bestScore = review.score;
      bestDoc = generated;
    }

    if (review.approved) {
      log(`[review] approved on iteration ${iteration + 1}`);
      break;
    }

    lastFeedback = review;
  }

  if (!bestDoc) throw new Error("Documentation generation failed — no output produced");

  // Convert AI output to the final ExtensionDoc shape,
  // merging in the parsed block metadata (blockId, blockString, group, weight, deprecated)
  const tools: ExtensionTool[] = parsed.blocks.map((block) => {
    // Match by functionName (primary), then by slug, then by title
    const aiTool = bestDoc!.tools.find((t) => t.functionName === block.functionName)
      ?? bestDoc!.tools.find((t) => t.slug === slugify(block))
      ?? bestDoc!.tools.find((t) => t.title.toLowerCase() === blockTitle(block).toLowerCase());

    if (!aiTool) {
      // Fallback: generate a minimal entry from parsed data
      return toolFromParsed(block, parsed.namespace);
    }

    return {
      slug: aiTool.slug || slugify(block),
      title: aiTool.title || blockTitle(block),
      blockId: block.blockId,
      blockString: block.blockString,
      group: block.group,
      weight: block.weight,
      deprecated: block.deprecated || undefined,
      problem: aiTool.problem,
      whatItDoes: aiTool.whatItDoes,
      parameters: aiTool.parameters,
      returns: aiTool.returns,
      example: aiTool.example,
    };
  });

  const doc: ExtensionDoc = {
    owner: parsed.owner,
    repo: parsed.repo,
    displayName: bestDoc.displayName || parsed.pxtName,
    packageSlug: parsed.packageSlug,
    description: bestDoc.description || parsed.pxtDescription || "",
    tools,
  };

  return { doc, iterations: maxIterations, finalScore: bestScore };
}

/** Generate a slug from a parsed block (kebab-case from block string or function name). */
function slugify(block: ParsedBlock): string {
  // Try to derive from block string: "distance between $a and $b" → "distance-between"
  const fromBlock = cleanBlockLabel(block.blockString);
  if (fromBlock) {
    return fromBlock
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Fallback: camelCase function name → kebab-case
  return block.functionName
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

/** Generate a human-friendly title from a parsed block. */
function blockTitle(block: ParsedBlock): string {
  const fromBlock = cleanBlockLabel(block.blockString);
  if (fromBlock) return fromBlock;
  return block.functionName;
}

/**
 * Clean a block string for use as a title or slug:
 * - Remove $param placeholders
 * - Remove optional params after ||
 * - Strip trailing connector words (and, to, from, with, of, in, at, over, on)
 * - Clean up extra whitespace
 */
function cleanBlockLabel(blockString: string): string {
  return blockString
    .replace(/\|\|.*$/g, "") // Remove optional params after ||
    .replace(/\$\w+/g, "") // Remove $param placeholders
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    // Strip trailing connector words
    .replace(/\s+(and|to|from|with|of|in|at|over|on|every|pixels|ms)$/i, "")
    .replace(/\s+(and|to|from|with|of|in|at|over|on|every|pixels|ms)$/i, "") // twice for "and pause" etc
    .trim();
}

/** Build a minimal ExtensionTool from parsed data (fallback when AI doesn't produce output). */
function toolFromParsed(block: ParsedBlock, namespace: string): ExtensionTool {
  const slug = slugify(block);
  const title = blockTitle(block);
  const exampleParams = block.parameters
    .map((p) => p.blockDefault ?? p.default ?? `0`)
    .join(", ");
  const example = `let mySprite = sprites.create(img\\\`.\${SpriteKind.Player)\n${namespace}.${block.functionName}(${exampleParams})`;

  return {
    slug,
    title,
    blockId: block.blockId,
    blockString: block.blockString,
    group: block.group,
    weight: block.weight,
    deprecated: block.deprecated || undefined,
    problem: block.jsDoc ?? "(documentation pending)",
    whatItDoes: block.jsDoc ?? "(documentation pending)",
    parameters: block.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      default: p.blockDefault ?? p.default,
      meaning: p.name,
    })),
    returns: block.returnType && block.returnType !== "void"
      ? { type: block.returnType, meaning: "(documentation pending)" }
      : undefined,
    example,
  };
}

/**
 * Review generated documentation using a separate Gemini call.
 * Checks quality criteria and returns structured feedback.
 */
async function reviewDocumentation(
  parsed: ParsedExtension,
  doc: AIGeneratedDoc,
): Promise<ReviewFeedback> {
  const reviewPrompt = `You are reviewing documentation for a MakeCode Arcade extension, targeted at students ages 11-18.

## The extension
- Name: ${parsed.owner}/${parsed.repo}
- Namespace: ${parsed.namespace}
- Number of blocks: ${parsed.blocks.length}

## Block definitions being documented
${parsed.blocks.map((b) => `- ${b.functionName}: "${b.blockString}" (params: ${b.parameters.map((p) => `${p.name}: ${p.type}`).join(", ")}, returns: ${b.returnType ?? "void"})`).join("\n")}

## Generated documentation to review
\`\`\`json
${JSON.stringify(doc, null, 2)}
\`\`\`

## Review criteria (score 1-10)
1. **Completeness**: Are all ${parsed.blocks.length} blocks documented? Are all parameters covered?
2. **Problem statements**: Does each tool have a concrete, relatable "problem" that a student would understand? (Not abstract programming concepts)
3. **Reading level**: Is the language appropriate for ages 11-18? Not too technical, not too childish?
4. **Examples**: Are examples minimal, copy-pasteable, and show the tool in use?
5. **Accuracy**: Do the descriptions match what the code actually does?

Score the documentation 1-10. A score of 8 or higher means approved.
Return JSON with:
- approved: boolean (true if score >= 8)
- score: number (1-10)
- issues: array of specific problems found
- suggestions: array of specific improvements to make`;

  const result = await generateJson<ReviewFeedback>({
    contents: [{ role: "user", parts: [{ text: reviewPrompt }] }],
    generationConfig: { temperature: 0.3 },
  });

  return result;
}
