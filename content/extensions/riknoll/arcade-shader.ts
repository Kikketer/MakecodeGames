import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeShader: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-shader",
  displayName: "Arcade Shader",
  packageSlug: "github:riknoll/arcade-shader",
  description: "Add dynamic lighting, shadows, and darkness effects to your games using rectangular or custom-image shader sprites.",
  tools: [
    {
      slug: "create-rectangular-shader",
      title: "create rectangular shader",
      blockId: "shader_createRectangularShaderSprite",
      blockString: "create rectangular shader with width $width height $height shade $shadeLevel",
      group: "General",
      weight: 90,
      problem: "You want to create a dark room, a shadowy zone, or a night-time effect over a box-shaped area of your screen.",
      whatItDoes: "Creates a rectangular shader sprite that darkens any tiles and sprites beneath it according to the chosen shade level. Because it is a normal sprite, you can move it, change its velocity, or attach it to the player.",
      parameters: [
        { name: "width", type: "number", default: "16", meaning: "The width of the shader rectangle in pixels." },
        { name: "height", type: "number", default: "16", meaning: "The height of the shader rectangle in pixels." },
        { name: "shadeLevel", type: "number", default: "none", meaning: "The level of darkness from 1 (light shadow) to 4 (pitch black)." },
      ],
      returns: { type: "Sprite", meaning: "The newly created rectangular shader sprite." },
      example: `let darkZone = shader.createRectangularShaderSprite(80, 60, shader.ShadeLevel.Two)
darkZone.setPosition(80, 60)`,
    },
    {
      slug: "create-image-shader",
      title: "create image shader",
      blockId: "shader_createImageShaderSprite",
      blockString: "create image shader with $image shade $shadeLevel",
      group: "General",
      weight: 100,
      problem: "You want a custom-shaped shadow or darkness mask, like a circular flashlight beam, cloud shadow, or creepy monster silhouette.",
      whatItDoes: "Creates a shader sprite using a custom image. Anywhere the image has non-transparent pixels, it darkens the screen underneath using the selected shade level.",
      parameters: [
        { name: "image", type: "Image", default: "none", meaning: "The image mask whose non-transparent pixels will cast the shadow." },
        { name: "shadeLevel", type: "number", default: "none", meaning: "The level of darkness from 1 (light shadow) to 4 (pitch black)." },
      ],
      returns: { type: "Sprite", meaning: "The newly created image shader sprite." },
      example: `let circleMask = img\`
    . . 1 1 1 1 . .
    . 1 1 1 1 1 1 .
    1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1
    . 1 1 1 1 1 1 .
    . . 1 1 1 1 . .
\`
let shadow = shader.createImageShaderSprite(circleMask, shader.ShadeLevel.Three)
shadow.setPosition(80, 60)`,
    },
    {
      slug: "shade-level",
      title: "shade level",
      blockId: "shader_shadelevel",
      blockString: "$level",
      group: "General",
      weight: 80,
      problem: "You want to select how dark a shader sprite should be using a dropdown value in block code.",
      whatItDoes: "Converts a ShadeLevel option (One, Two, Three, or Four) into its corresponding number value to pass into shader creation functions.",
      parameters: [
        { name: "level", type: "ShadeLevel", default: "none", meaning: "The darkness preset (One for lightest tint, Four for full black)." },
      ],
      returns: { type: "number", meaning: "The numeric shade level (1 to 4)." },
      example: `let darkness = shader._shadeLevel(shader.ShadeLevel.Four)
let shadow = shader.createRectangularShaderSprite(40, 40, darkness)`,
    }
  ],
};
