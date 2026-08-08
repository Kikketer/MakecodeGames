import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtImageMorph: ExtensionDoc = {
  owner: "UnicycleDumpTruck",
  repo: "pxt-image-morph",
  displayName: "Image Morph",
  packageSlug: "github:UnicycleDumpTruck/pxt-image-morph",
  description: "Create pixel-dissolve transition effects when changing sprite costumes or scene backgrounds.",
  tools: [
    {
      slug: "morph",
      title: "morph",
      blockId: "spritemorphimage",
      blockString: "morph %sprite(mySprite) image to %img=screen_image_picker",
      group: "Sprites",
      weight: 7,
      problem: "You want a player or monster sprite to smoothly transform into a new shape or powered-up form using a dissolve effect instead of instantly snapping to a new picture.",
      whatItDoes: "Transitions a sprite's image into a new target image by randomly swapping pixels over time. It temporarily expands the sprite frame if the new picture is larger so the image doesn't get cropped.",
      parameters: [
        { name: "mySprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose picture you want to transform." },
        { name: "new_image", type: "Image", meaning: "The target image to morph into." },
      ],
      example: `let hero = sprites.create(img\`
    . . f f . .
    . f 5 5 f .
    . f 5 5 f .
    . . f f . .
\`, SpriteKind.Player)

imagemorph.morph(hero, img\`
    . . b b . .
    . b 9 9 b .
    . b 9 9 b .
    . . b b . .
\`)`,
    },
    {
      slug: "morph-background",
      title: "morph background",
      blockId: "backgroundmorphimage",
      blockString: "morph backgound image to %img=background_image_picker",
      group: "Screen",
      weight: 7,
      problem: "You want to transition to a new level background image using a pixel dissolve effect when entering a new stage or starting a boss fight.",
      whatItDoes: "Transitions the current game screen background image into a new image by randomly replacing pixels until the target background is completely revealed.",
      parameters: [
        { name: "myImage", type: "Image", meaning: "The new background image to morph the screen into." },
      ],
      example: `scene.setBackgroundImage(img\`
    7 7
    7 7
\`)

imagemorph.morphBackground(img\`
    2 2
    2 2
\`)`,
    }
  ],
};
