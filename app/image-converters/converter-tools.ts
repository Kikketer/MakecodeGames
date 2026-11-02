export interface ConverterTool {
  id: string;
  title: string;
  description: string;
  href: string;
}

/**
 * The image conversion tools listed on the /image-converters menu. Each one
 * runs entirely in the browser — no uploads, no server work.
 */
export const CONVERTER_TOOLS: ConverterTool[] = [
  {
    id: "png-to-img",
    title: "PNG to MakeCode Image",
    description:
      "Convert a PNG into MakeCode Arcade img literals and .jres entries while preserving indexed colors. Use the default 16-color palette, paste a pxt.json palette, or embed your palette in the top row of pixels. Can also slice a sprite sheet into an animation image array.",
    href: "/image-converters/png-to-img",
  },
  {
    id: "img-to-png",
    title: "img to PNG",
    description:
      "Paste a MakeCode Arcade img`…` literal and download it as a PNG. Choose the default 16-color palette or paste a pxt.json palette, with a live pixel preview.",
    href: "/image-converters/img-to-png",
  },
  {
    id: "img-to-jres",
    title: "img to .jres",
    description:
      "Convert a MakeCode Arcade img`…` literal into a .jres entry (image/x-mkcd-f4, base64) for images.g.jres, with a live pixel preview.",
    href: "/image-converters/img-to-jres",
  },
  {
    id: "jres-to-img",
    title: ".jres to img",
    description:
      "Decode a base64 .jres image data string back into a MakeCode Arcade img`…` literal you can paste into TypeScript, with a live pixel preview.",
    href: "/image-converters/jres-to-img",
  },
];
