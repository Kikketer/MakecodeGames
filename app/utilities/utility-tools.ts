export interface UtilityTool {
  id: string;
  title: string;
  description: string;
  href: string;
}

/**
 * The image-converter utilities listed on the /utilities menu. Each one wraps
 * the shared image-converter component with a different default tab and
 * metadata, mirroring the /compilers pattern.
 *
 * PNG → img and PNG → .jres share a single route (`/utilities/png-to-img`)
 * because the underlying tool emits both outputs from one PNG upload.
 */
export const UTILITY_TOOLS: UtilityTool[] = [
  {
    id: "png-to-img",
    title: "PNG → img + .jres",
    description:
      "Convert a PNG into a MakeCode Arcade img literal and a matching .jres entry for use in Visual Studio Code. Supports top-row, pxt.json, and default palettes, plus sprite-sheet slicing.",
    href: "/utilities/png-to-img",
  },
  {
    id: "jres-to-img",
    title: ".jres → img",
    description:
      "Decode a MakeCode Arcade .jres base64 data string back into an img literal so you can inspect or reuse the image in blocks code.",
    href: "/utilities/jres-to-img",
  },
];
