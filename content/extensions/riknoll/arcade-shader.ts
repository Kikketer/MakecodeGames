import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeShader: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-shader",
  displayName: "Arcade Shader",
  packageSlug: "github:riknoll/arcade-shader",
  description: "Create shading overlays and shadow effects that darken and tint graphics on the screen.",
  tools: [
    {
      slug: "create-rectangular-shader",
      title: "create rectangular shader",
      blockId: "shader_createRectangularShaderSprite",
      blockString: "create rectangular shader with width $width height $height shade $shadeLevel",
      group: "General",
      weight: 90,
      problem: "You want to create a dark room, shadow zone, or night effect over a rectangular area of your game screen.",
      whatItDoes: "Creates a rectangular shader sprite that darkens and tints whatever game graphics are drawn underneath it based on the selected shade level.",
      parameters: [
        { name: "width", type: "number", default: "16", meaning: "The width of the shader area in pixels." },
        { name: "height", type: "number", default: "16", meaning: "The height of the shader area in pixels." },
        { name: "shadeLevel", type: "number", meaning: "The shade level setting (1 for light shading, 4 for complete pitch black)." },
      ],
      returns: { type: "Sprite", meaning: "A rectangular shader sprite placed in the game world." },
      example: "let darkZone = shader.createRectangularShaderSprite(80, 60, shader._shadeLevel(shader.ShadeLevel.Two))",
    },
    {
      slug: "create-image-shader",
      title: "create image shader",
      blockId: "shader_createImageShaderSprite",
      blockString: "create image shader with $image shade $shadeLevel",
      group: "General",
      weight: 100,
      problem: "You want to create a custom-shaped shadow, flashlight beam, or cloud mask that darkens only specific parts of the screen.",
      whatItDoes: "Creates a shader sprite using a custom image design where non-transparent pixels apply a shading overlay to the game graphics underneath.",
      parameters: [
        { name: "image", type: "Image", meaning: "The image that defines the shape and pattern of the shaded region." },
        { name: "shadeLevel", type: "number", meaning: "The intensity of the shade effect (1 for light shade, up to 4 for blackness)." },
      ],
      returns: { type: "Sprite", meaning: "A custom-shaped shader sprite." },
      example: `let shadowSprite = shader.createImageShaderSprite(img\`
    . . 1 1 1 1 . .
    . 1 1 1 1 1 1 .
    1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1
    . 1 1 1 1 1 1 .
    . . 1 1 1 1 . .
\`, shader._shadeLevel(shader.ShadeLevel.One))`,
    },
    {
      slug: "shade-level",
      title: "shade level",
      blockId: "shader_shadelevel",
      blockString: "$level",
      group: "General",
      weight: 80,
      problem: "You need to choose a shade intensity level option to feed into a shader block.",
      whatItDoes: "Returns the numeric shade value associated with a ShadeLevel enum choice.",
      parameters: [
        { name: "level", type: "ShadeLevel", meaning: "The desired shade intensity (One, Two, Three, or Four)." },
      ],
      returns: { type: "number", meaning: "The numeric shade level value." },
      example: "let levelValue = shader._shadeLevel(shader.ShadeLevel.Three)",
    }
  ],
};
