import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeShader: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-shader",
  displayName: "Shader",
  packageSlug: "github:riknoll/arcade-shader",
  description: "Add dark shadows, night effects, and lighting overlays to your MakeCode Arcade games using shader sprites.",
  tools: [
    {
      slug: "create-rectangular-shader-sprite",
      title: "create rectangular shader sprite",
      blockId: "shader_createRectangularShaderSprite",
      blockString: "create rectangular shader with width $width height $height shade $shadeLevel",
      group: "General",
      weight: 90,
      problem: "You want to create a dark room, a shaded area on the map, or a night effect over a square area of your game screen.",
      whatItDoes: "Creates a rectangular sprite that darkens or alters the colors of whatever graphics are rendered underneath it on screen.",
      parameters: [
        { name: "width", type: "number", default: "16", meaning: "The width of the shader rectangle in pixels." },
        { name: "height", type: "number", default: "16", meaning: "The height of the shader rectangle in pixels." },
        { name: "shadeLevel", type: "number", meaning: "The darkness level for the shader, from level 1 (lightest) to level 4 (darkest)." },
      ],
      returns: { type: "Sprite", meaning: "The newly created shader sprite." },
      example: "let darkZone = shader.createRectangularShaderSprite(80, 60, shader.ShadeLevel.Two)",
    },
    {
      slug: "create-image-shader-sprite",
      title: "create image shader sprite",
      blockId: "shader_createImageShaderSprite",
      blockString: "create image shader with $image shade $shadeLevel",
      group: "General",
      weight: 100,
      problem: "You want a custom-shaped shadow, like a circular flashlight beam, a cloud shadow, or a tree canopy shadow, that darkens the screen underneath it.",
      whatItDoes: "Creates a shader sprite using an image mask. Any colored pixel in the image will darken the game screen underneath it according to the chosen shade level.",
      parameters: [
        { name: "image", type: "Image", meaning: "The custom image mask to define the shadow shape." },
        { name: "shadeLevel", type: "number", meaning: "The darkness level for the shader, from level 1 (lightest) to level 4 (darkest)." },
      ],
      returns: { type: "Sprite", meaning: "The newly created image shader sprite." },
      example: `let cloudShadow = shader.createImageShaderSprite(img\`
    . . f f f f . .
    . f f f f f f .
    f f f f f f f f
    f f f f f f f f
    . f f f f f f .
    . . f f f f . .
\`, shader.ShadeLevel.One)`,
    },
    {
      slug: "shade-level",
      title: "shade level",
      blockId: "shader_shadelevel",
      blockString: "$level",
      group: "General",
      weight: 80,
      problem: "You need to select how strong or dark a shader effect should be when creating a shader sprite.",
      whatItDoes: "Converts a named shade level option (one, two, three, or four) into a numerical darkness level for shader blocks.",
      parameters: [
        { name: "level", type: "ShadeLevel", meaning: "The shade level option to pick (One = light, Four = pitch black)." },
      ],
      returns: { type: "number", meaning: "The numeric value corresponding to the chosen shade level." },
      example: "let darkness = shader._shadeLevel(shader.ShadeLevel.Three)",
    }
  ],
};
