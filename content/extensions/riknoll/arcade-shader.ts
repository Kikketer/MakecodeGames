import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeShader: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-shader",
  displayName: "Arcade Shader",
  packageSlug: "github:riknoll/arcade-shader",
  description: "Create shadows, darkness overlays, and light masks to tint or darken areas of your screen in MakeCode Arcade.",
  tools: [
    {
      slug: "create-rectangular-shader",
      title: "create rectangular shader",
      blockId: "shader_createRectangularShaderSprite",
      blockString: "create rectangular shader with width $width height $height shade $shadeLevel",
      group: "General",
      weight: 90,
      problem: "You want to create a dark room, shadow area, or night-time rectangular overlay in your game where everything underneath appears dimmed.",
      whatItDoes: "Creates a rectangular sprite of kind Shader that darkens whatever parts of the background, tilemap, or sprites are drawn underneath it. Shade level ranges from 1 (light shading) to 4 (pitch black).",
      parameters: [
        { name: "width", type: "number", default: "16", meaning: "The width of the shader rectangle in pixels." },
        { name: "height", type: "number", default: "16", meaning: "The height of the shader rectangle in pixels." },
        { name: "shadeLevel", type: "number", default: "", meaning: "The darkness level from 1 (slight shadow) to 4 (solid black)." },
      ],
      returns: { type: "Sprite", meaning: "The newly created rectangular shader sprite." },
      example: `let darkness = shader.createRectangularShaderSprite(80, 60, shader.ShadeLevel.Two)
darkness.setPosition(80, 60)`,
    },
    {
      slug: "create-image-shader",
      title: "create image shader",
      blockId: "shader_createImageShaderSprite",
      blockString: "create image shader with $image shade $shadeLevel",
      group: "General",
      weight: 100,
      problem: "You want a custom-shaped shadow or light vignette effect (such as a circular flashlight cone, cloud shadow, or irregular fog) to shade the screen.",
      whatItDoes: "Creates a shader sprite shaped like the provided image. Any non-transparent pixel in the image will darken the graphics underneath it based on the chosen shade level.",
      parameters: [
        { name: "image", type: "Image", default: "", meaning: "The image mask defining the shape of the shaded area." },
        { name: "shadeLevel", type: "number", default: "", meaning: "The darkness level from 1 (slight shadow) to 4 (solid black)." },
      ],
      returns: { type: "Sprite", meaning: "The newly created custom-shaped shader sprite." },
      example: `let cloudShadow = shader.createImageShaderSprite(img\`.\`, shader.ShadeLevel.One)
cloudShadow.setPosition(80, 60)`,
    },
    {
      slug: "shade-level",
      title: "shade level",
      blockId: "shader_shadelevel",
      blockString: "$level",
      group: "General",
      weight: 80,
      problem: "You need to select a preset darkness level from a dropdown when creating a shader.",
      whatItDoes: "Converts a ShadeLevel enum choice (One, Two, Three, or Four) into its corresponding numeric intensity value (1 to 4).",
      parameters: [
        { name: "level", type: "ShadeLevel", default: "", meaning: "The shade level preset (One, Two, Three, or Four)." },
      ],
      returns: { type: "number", meaning: "The numeric value of the chosen shade level (1-4)." },
      example: `let level = shader._shadeLevel(shader.ShadeLevel.Three)
let box = shader.createRectangularShaderSprite(32, 32, level)`,
    }
  ],
};
