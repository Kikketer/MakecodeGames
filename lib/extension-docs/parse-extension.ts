import { readFile, readdir, stat, rm, mkdir } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { ParsedBlock, ParsedEnum, ParsedExtension, ParsedParameter } from "./types";

const execAsync = promisify(exec);

/** Clone a GitHub repo (shallow) into a temp directory and return the path. */
export async function cloneRepo(owner: string, repo: string, targetDir: string): Promise<void> {
  const url = `https://github.com/${owner}/${repo}.git`;
  await mkdir(targetDir, { recursive: true });
  await execAsync(`git clone --depth 1 ${url} ${targetDir}`, {
    timeout: 60_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

/** Read and parse pxt.json from a cloned repo. */
export async function readPxtJson(repoDir: string): Promise<{
  name: string;
  description?: string;
  files: string[];
  testFiles?: string[];
}> {
  const raw = await readFile(join(repoDir, "pxt.json"), "utf-8");
  return JSON.parse(raw);
}

/**
 * Tokenize a `//%` annotation content string, respecting double-quoted values
 * that may contain spaces. For example:
 *   block="distance between $a and $b" weight=90 group=Sprite
 * becomes:
 *   ["block=distance between $a and $b", "weight=90", "group=Sprite"]
 */
function tokenizeAnnotations(content: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < content.length) {
    // Skip whitespace
    while (i < content.length && /\s/.test(content[i])) i++;
    if (i >= content.length) break;

    // Read a token until we hit whitespace, but if we encounter a `=`
    // followed by a `"`, read until the closing `"` (consuming the whole
    // quoted value as part of this token).
    const start = i;
    while (i < content.length && !/\s/.test(content[i])) {
      if (content[i] === "=" && i + 1 < content.length && content[i + 1] === '"') {
        // Consume the quoted string
        i += 2; // skip ="
        while (i < content.length && content[i] !== '"') i++;
        if (i < content.length) i++; // skip closing "
        break;
      }
      i++;
    }
    tokens.push(content.slice(start, i));
  }
  return tokens;
}

/**
 * Parse `//%` annotation lines that precede a function declaration.
 * Returns a map of key → value, plus flags for bare annotations like `deprecated`.
 */
function parseAnnotations(lines: string[], endIndex: number): Record<string, string> {
  const annotations: Record<string, string> = {};
  // Walk backwards from endIndex collecting consecutive //% lines
  for (let i = endIndex; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith("//%")) break;

    // Strip the "//%" prefix and any leading whitespace
    const content = trimmed.replace(/^\/\/%/, "").trim();
    if (!content) continue;

    // Annotations can be space-separated on one line:
    //   //% cx.min=0 cx.max=160 cx.defl=80
    // or a single key=value, or a bare flag like `deprecated`.
    // Values may be quoted strings containing spaces:
    //   //% block="distance between $a and $b"
    // Tokenize respecting double-quoted strings.
    const tokens = tokenizeAnnotations(content);
    for (const token of tokens) {
      const eqIdx = token.indexOf("=");
      if (eqIdx === -1) {
        // Bare flag — store as "true"
        annotations[token] = "true";
      } else {
        const key = token.slice(0, eqIdx);
        let value = token.slice(eqIdx + 1);
        // Strip surrounding quotes
        value = value.replace(/^["']|["']$/g, "");
        annotations[key] = value;
      }
    }
  }
  return annotations;
}

/** Extract JSDoc comment text from lines preceding a function (skipping //% lines). */
function extractJsDoc(lines: string[], endIndex: number): string | undefined {
  // Walk backwards past //% lines to find the JSDoc
  let i = endIndex;
  while (i >= 0 && lines[i].trim().startsWith("//%")) i--;

  // Check for a JSDoc block ending with */
  if (i < 0 || !lines[i].includes("*/")) return undefined;

  // Collect lines backwards until we find /**
  const docLines: string[] = [];
  for (; i >= 0; i--) {
    docLines.unshift(lines[i]);
    if (lines[i].includes("/**")) break;
  }

  // Clean up JSDoc markers
  return docLines
    .join("\n")
    .replace(/\/\*\*|\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trimEnd())
    .join("\n")
    .trim();
}

/** Parse a TypeScript function signature to extract parameters and return type. */
function parseFunctionSignature(sigLine: string): {
  parameters: ParsedParameter[];
  returnType?: string;
} {
  // Match: export function name(params): returnType {
  // or:    export function name(params) {
  const openParen = sigLine.indexOf("(");
  if (openParen === -1) return { parameters: [] };

  // Find matching close paren (handle nested parens for callback types)
  let depth = 0;
  let closeParen = -1;
  for (let i = openParen; i < sigLine.length; i++) {
    if (sigLine[i] === "(") depth++;
    else if (sigLine[i] === ")") {
      depth--;
      if (depth === 0) {
        closeParen = i;
        break;
      }
    }
  }
  if (closeParen === -1) return { parameters: [] };

  const paramsStr = sigLine.slice(openParen + 1, closeParen).trim();
  const afterParams = sigLine.slice(closeParen + 1).trim();

  // Extract return type if present: ": returnType {"
  let returnType: string | undefined;
  const colonIdx = afterParams.indexOf(":");
  if (colonIdx !== -1) {
    const braceIdx = afterParams.indexOf("{");
    returnType = afterParams.slice(colonIdx + 1, braceIdx !== -1 ? braceIdx : undefined).trim();
  }

  if (!paramsStr) return { parameters: [], returnType };

  // Split parameters by comma, respecting nested parens (for callback types)
  const params: ParsedParameter[] = [];
  let current = "";
  let parenDepth = 0;
  for (const char of paramsStr) {
    if (char === "(" || char === "<") parenDepth++;
    else if (char === ")" || char === ">") parenDepth--;
    if (char === "," && parenDepth === 0) {
      params.push(parseSingleParam(current.trim()));
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) params.push(parseSingleParam(current.trim()));

  return { parameters: params, returnType };
}

function parseSingleParam(paramStr: string): ParsedParameter {
  // Handle optional marker: `callback?: ...`
  let name = "";
  let rest = paramStr;

  // Name is everything up to the first ? or :
  const nameMatch = rest.match(/^(\w+)\??\s*:\s*(.*)/);
  if (nameMatch) {
    name = nameMatch[1];
    rest = nameMatch[2];
  } else {
    // No type annotation — might be `name = default` or just `name`
    const eqMatch = rest.match(/^(\w+)\??\s*=\s*(.*)/);
    if (eqMatch) {
      name = eqMatch[1];
      // The rest is the default value; type will be inferred
      rest = "";
      const defaultValue = eqMatch[2].trim();

      // Infer type from default value
      let inferredType = "";
      if (defaultValue === "true" || defaultValue === "false") inferredType = "boolean";
      else if (/^-?\d+(\.\d+)?$/.test(defaultValue)) inferredType = "number";
      else if (defaultValue.startsWith('"') || defaultValue.startsWith("'")) inferredType = "string";

      return { name, type: inferredType, default: defaultValue };
    } else {
      // Just a name with no type or default
      name = rest.replace(/\?$/, "").trim();
      rest = "";
    }
  }

  // Check for default value: `type = default`
  let type = rest;
  let defaultValue: string | undefined;
  const eqIdx = rest.indexOf("=");
  if (eqIdx !== -1) {
    type = rest.slice(0, eqIdx).trim();
    defaultValue = rest.slice(eqIdx + 1).trim();
  }

  return { name, type: type.trim(), default: defaultValue };
}

/**
 * Parse all block definitions from a TypeScript source file.
 * A block is any `export function` preceded by `//% block=` annotations.
 */
export function parseBlocks(source: string): ParsedBlock[] {
  const lines = source.split("\n");
  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match export function declarations
    const funcMatch = line.match(/^\s*export\s+function\s+(\w+)\s*\(/);
    if (!funcMatch) continue;

    const functionName = funcMatch[1];

    // Find the start of the function body (the opening brace)
    // The signature may span multiple lines, so collect until we find `{`
    let braceLine = i;
    let sigBuilder = line;
    let braceCount = 0;
    let foundBrace = false;
    for (; braceLine < lines.length; braceLine++) {
      for (const ch of lines[braceLine]) {
        if (ch === "{") {
          braceCount++;
          foundBrace = true;
        } else if (ch === "}") {
          braceCount--;
        }
      }
      if (foundBrace && braceCount > 0) {
        sigBuilder = lines.slice(i, braceLine + 1).join("\n");
        break;
      }
    }

    // Collect annotations from lines before the function
    const annotations = parseAnnotations(lines, i - 1);

    // Only treat as a block if it has a `block` annotation
    if (!annotations["block"]) continue;

    // Extract the full function body (from the export line to the closing brace)
    let bodyEnd = braceLine;
    let depth = 0;
    for (let j = braceLine; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      if (depth === 0) {
        bodyEnd = j;
        break;
      }
    }
    const body = lines.slice(i, bodyEnd + 1).join("\n");

    // Parse parameters and return type from the signature
    const { parameters, returnType } = parseFunctionSignature(sigBuilder);

    // Merge block-level defaults/shadows from annotations into parameters
    for (const param of parameters) {
      const deflKey = `${param.name}.defl`;
      const shadowKey = `${param.name}.shadow`;
      if (annotations[deflKey]) param.blockDefault = annotations[deflKey];
      if (annotations[shadowKey]) param.shadow = annotations[shadowKey];
    }

    const jsDoc = extractJsDoc(lines, i - 1);

    blocks.push({
      functionName,
      blockId: annotations["blockId"],
      blockString: annotations["block"],
      group: annotations["group"] ?? "General",
      weight: annotations["weight"] ? parseInt(annotations["weight"], 10) : 0,
      deprecated: Boolean(annotations["deprecated"]),
      jsDoc,
      body,
      parameters,
      returnType,
    });
  }

  return blocks;
}

/** Parse all enum definitions from a TypeScript source file. */
export function parseEnums(source: string): ParsedEnum[] {
  const lines = source.split("\n");
  const enums: ParsedEnum[] = [];

  for (let i = 0; i < lines.length; i++) {
    const enumMatch = lines[i].match(/^\s*export\s+enum\s+(\w+)\s*\{/);
    if (!enumMatch) continue;

    const name = enumMatch[1];
    const members: ParsedEnum["members"] = [];

    // Collect members until closing brace
    for (let j = i + 1; j < lines.length; j++) {
      const trimmed = lines[j].trim();
      if (trimmed === "}") break;

      // Member: `Name,` or `Name = value,` or `Name` (last member, no comma)
      // with optional //% block="..." on the same line or preceding line
      const memberMatch = trimmed.match(/^(\w+)\s*[=,]?/);
      if (!memberMatch) continue;

      const memberName = memberMatch[1];
      // Skip if the "member" is actually the closing brace or other non-member
      if (memberName === "}") continue;
      let blockLabel: string | undefined;
      let blockHidden = false;

      // Check for //% annotations on the same line or preceding line
      const checkLine = trimmed;
      const blockMatch = checkLine.match(/\/\/%\s*block="([^"]+)"/);
      if (blockMatch) blockLabel = blockMatch[1];
      if (checkLine.includes("blockHidden")) blockHidden = true;

      // Also check the line above
      if (!blockLabel && j > 0) {
        const prevLine = lines[j - 1].trim();
        const prevBlockMatch = prevLine.match(/\/\/%\s*block="([^"]+)"/);
        if (prevBlockMatch) blockLabel = prevBlockMatch[1];
        if (prevLine.includes("blockHidden")) blockHidden = true;
      }

      members.push({ name: memberName, blockLabel, blockHidden });
    }

    enums.push({ name, members });
  }

  return enums;
}

/** Extract the namespace name from a TypeScript source file. */
function extractNamespace(source: string): string | undefined {
  const match = source.match(/^\s*namespace\s+(\w+)\s*\{/m);
  return match?.[1];
}

/** Read all .ts files listed in pxt.json (plus any .ts files in the root). */
async function readSourceFiles(
  repoDir: string,
  pxtFiles: string[],
): Promise<Record<string, string>> {
  const sourceFiles: Record<string, string> = {};

  // Read files from pxt.json that are .ts
  for (const file of pxtFiles) {
    if (!file.endsWith(".ts")) continue;
    try {
      sourceFiles[file] = await readFile(join(repoDir, file), "utf-8");
    } catch {
      // File listed in pxt.json might not exist
    }
  }

  // Also scan root for any .ts files not in pxt.json
  const entries = await readdir(repoDir);
  for (const entry of entries) {
    if (!entry.endsWith(".ts")) continue;
    if (sourceFiles[entry]) continue;
    try {
      sourceFiles[entry] = await readFile(join(repoDir, entry), "utf-8");
    } catch {
      // skip
    }
  }

  return sourceFiles;
}

/** Read markdown docs from the docs/ folder, if it exists. */
async function readDocsFiles(repoDir: string): Promise<Record<string, string>> {
  const docsFiles: Record<string, string> = {};
  const docsDir = join(repoDir, "docs");
  try {
    await stat(docsDir);
    const entries = await readdir(docsDir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      docsFiles[entry] = await readFile(join(docsDir, entry), "utf-8");
    }
  } catch {
    // no docs/ folder
  }
  return docsFiles;
}

/**
 * Full extension parse: clone, read pxt.json, extract blocks and enums.
 * If `repoDir` is provided, skip cloning and parse from that directory.
 */
export async function parseExtension(
  owner: string,
  repo: string,
  options: { repoDir?: string; cloneDir?: string } = {},
): Promise<ParsedExtension> {
  let repoDir = options.repoDir;
  const shouldCleanup = !repoDir;

  if (!repoDir) {
    repoDir = options.cloneDir ?? `/tmp/extension-${owner}-${repo}`;
    await rm(repoDir, { recursive: true, force: true });
    await cloneRepo(owner, repo, repoDir);
  }

  try {
    const pxt = await readPxtJson(repoDir);
    const sourceFiles = await readSourceFiles(repoDir, pxt.files);
    const docsFiles = await readDocsFiles(repoDir);

    let readme: string | undefined;
    try {
      readme = await readFile(join(repoDir, "README.md"), "utf-8");
    } catch {
      // no README
    }

    // Parse blocks and enums from all source files
    const allBlocks: ParsedBlock[] = [];
    const allEnums: ParsedEnum[] = [];
    let namespace: string | undefined;

    for (const [filename, source] of Object.entries(sourceFiles)) {
      // Skip test files
      if (filename === "test.ts" || filename.startsWith("test-")) continue;

      const blocks = parseBlocks(source);
      allBlocks.push(...blocks);

      const enums = parseEnums(source);
      allEnums.push(...enums);

      if (!namespace) namespace = extractNamespace(source);
    }

    return {
      owner,
      repo,
      pxtName: pxt.name,
      pxtDescription: pxt.description,
      namespace: namespace ?? "extension",
      packageSlug: `github:${owner}/${repo}`,
      sourceFiles,
      blocks: allBlocks,
      enums: allEnums,
      docsFiles,
      readme,
    };
  } finally {
    if (shouldCleanup && repoDir) {
      await rm(repoDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
