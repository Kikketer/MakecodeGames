export interface GameMeta {
  cdnUrl: string;
  targetVersion: string;
}

/**
 * Extracts the `// meta=...` JSON comment that the compile-js step embeds at
 * the top of the generated `game.js`. Falls back to the provided defaults
 * when the comment is missing or unparseable.
 */
export function parseGameJsMeta(code: string, defaults: GameMeta): GameMeta {
  let parsed: Partial<GameMeta> | undefined;
  code.replace(/^\/\/\s*meta=([^\n]+)\n/m, (m, src) => {
    parsed = JSON.parse(src) as Partial<GameMeta>;
    return m;
  });
  return {
    cdnUrl: parsed?.cdnUrl ?? defaults.cdnUrl,
    targetVersion: parsed?.targetVersion ?? defaults.targetVersion,
  };
}
