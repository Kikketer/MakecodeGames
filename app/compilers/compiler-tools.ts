export type CompilerIcon = "desktop" | "arm" | "windows" | "elf" | "png-to-js" | "repo-to-png";

export interface CompilerDoc {
  label: string;
  href: string;
}

export interface CompilerTool {
  id: string;
  icon: CompilerIcon;
  title: string;
  /** What the tool is intended for — the setup it targets. */
  description: string;
  /** What the tool produces. */
  output: string;
  href: string;
  docs: CompilerDoc[];
}

export const ARCADE_DOCS_URL = "https://cjweed.com/CreationStationArcade";

const arcadeDoc = (label: string, page: string): CompilerDoc => ({
  label,
  href: `${ARCADE_DOCS_URL}/${page}/`,
});

const NATIVE_DOCS = [
  arcadeDoc("Multi-Native Arcade (menu)", "multi-native-arcade"),
  arcadeDoc("Native Application Single-Game", "single-native-arcade"),
];

/**
 * The compile tools listed on the /compilers menu. Each one proxies a
 * MakeCode Arcade PNG export to the MakeCodeGamesIngest server and returns a
 * downloadable artifact.
 */
export const COMPILER_TOOLS: CompilerTool[] = [
  {
    id: "native-x86",
    icon: "desktop",
    title: "PNG to x86 Native",
    description:
      "For Native-flavor arcade cabinets on a 64-bit Intel/AMD Linux PC. On x86 hardware the Chromium setup (PNG to JS below) is usually the better choice — it runs games faster.",
    output: "Linux x86-64 .tar.gz (Game + libpxt.so).",
    href: "/compilers/native-x86",
    docs: NATIVE_DOCS,
  },
  {
    id: "native-arm",
    icon: "arm",
    title: "PNG to ARM Native (Raspberry Pi 3 or less)",
    description:
      "For Native-flavor arcade cabinets on a Raspberry Pi 3, Pi Zero 2 W, or similar low-powered 64-bit ARM board — including cabinets with GPIO-wired buttons. Needs a 64-bit OS.",
    output: "Linux ARM64 .tar.gz (Game + libpxt.so).",
    href: "/compilers/native-arm",
    docs: NATIVE_DOCS,
  },
  {
    id: "native-win",
    icon: "windows",
    title: "PNG to EXE (Windows)",
    description:
      "For playing or sharing a game on a regular Windows PC — just unzip and double-click. Not intended for arcade cabinets.",
    output: "Windows .zip (Game.exe + pxt.dll).",
    href: "/compilers/windows",
    docs: [],
  },
  {
    id: "elf",
    icon: "elf",
    title: "PNG to 4-Player ELF (Raspberry Pi 3 or less)",
    description:
      "For the ELF arcade flavors on a Raspberry Pi 3 or Pi Zero, with up to 4 players on GPIO-wired buttons (1-player games work too). Does not work on a Pi 5.",
    output: "Raw Raspberry Pi .elf binary.",
    href: "/compilers/elf",
    docs: [
      arcadeDoc("ELF Menu Arcade", "elf-menu"),
      arcadeDoc("Pi 3 / Pi Zero Single-Game ELF", "pi3-elf-kiosk"),
    ],
  },
  {
    id: "png-to-js",
    icon: "png-to-js",
    title: "PNG to JS for Chromium (x86, Raspberry Pi 5 or higher)",
    description:
      "For the Chromium arcade flavors on an x86 PC or a Raspberry Pi 5 — our recommended arcade setup. Also handy for embedding a game in the MakeCode web player or playing on a Mac.",
    output: "Standalone game.js for the MakeCode web player.",
    href: "/compilers/png-to-js",
    docs: [
      arcadeDoc("Chromium Kiosk (menu)", "chromium-kiosk"),
      arcadeDoc("Chromium Single-Game", "single-game-kiosk"),
    ],
  },
  {
    id: "repo-to-png",
    icon: "repo-to-png",
    title: "GitHub Repo to PNG",
    description:
      "Exception case: only needed when a game lives in a public GitHub repo and you can't export a PNG from the MakeCode editor. Feed the PNG into one of the compilers above.",
    output: "MakeCode Arcade project .png.",
    href: "/compilers/repo-to-png",
    docs: [],
  },
];
