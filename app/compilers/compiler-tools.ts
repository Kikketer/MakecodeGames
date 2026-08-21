export interface CompilerTool {
  id: string;
  title: string;
  description: string;
  href: string;
}

/**
 * The compile tools listed on the /compilers menu. Each one proxies a
 * MakeCode Arcade PNG export to the MakeCodeGamesIngest Chromebook server
 * and returns a downloadable artifact.
 */
export const COMPILER_TOOLS: CompilerTool[] = [
  {
    id: "desktop",
    title: "PNG to Desktop",
    description:
      "Convert a MakeCode Arcade PNG export into a standalone native executable archive (Game + libpxt.so / pxt.dll) for x86-64, ARM64, or Windows. Handy for running a game on a desktop Linux PC or a Raspberry Pi style arcade machine.",
    href: "/compilers/desktop",
  },
  {
    id: "elf",
    title: "PNG to 4-Player ELF",
    description:
      "Convert a MakeCode Arcade PNG export into a Raspberry Pi raw ELF binary with 4-player GPIO input support. Handy for building real multiplayer arcade cabinets that wire buttons and joysticks directly to a Raspberry Pi.",
    href: "/compilers/elf",
  },
  {
    id: "png-to-js",
    title: "PNG to JavaScript",
    description:
      "Convert a MakeCode Arcade PNG export into a standalone game.js for the MakeCode web iframe. Mostly for embedding in the MakeCode-provided web player.",
    href: "/compilers/png-to-js",
  },
];
