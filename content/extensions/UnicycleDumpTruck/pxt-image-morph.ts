import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtImageMorph: ExtensionDoc = {
  owner: "UnicycleDumpTruck",
  repo: "pxt-image-morph",
  displayName: "Image Morph",
  packageSlug: "github:UnicycleDumpTruck/pxt-image-morph",
  description: "Smoothly transition sprite graphics and background scenes pixel-by-pixel with animated dissolve effects.",
  tools: [
    {
      slug: "morph",
      title: "morph",
      blockId: "spritemorphimage",
      blockString: "morph %sprite(mySprite) image to %img=screen_image_picker",
      group: "Sprites",
      weight: 7,
      problem: "You want your player character to evolve, transform, or power up into a cool new form with a dissolving visual effect instead of instantly switching images.",
      whatItDoes: "Gradually transforms a sprite's current artwork into a new target image by randomly swapping pixels over time until the new image is completely revealed.",
      parameters: [
        { name: "mySprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose image will morph." },
        { name: "new_image", type: "Image", meaning: "The new image to morph the sprite into." },
      ],
      example: `let mySprite = sprites.create(img\`
    . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . .
    . . . . . . 2 2 . . . . . . . .
    . . . . . 2 2 2 2 . . . . . . .
    . . . . . 2 2 2 2 . . . . . . .
    . . . . . . 2 2 . . . . . . . .
    . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . .
\`, SpriteKind.Player)

imagemorph.morph(mySprite, img\`
    . . . . . . . . . . . . . . . .
    . . . . . . 5 5 . . . . . . . .
    . . . . . 5 5 5 5 . . . . . . .
    . . . . 5 5 5 5 5 5 . . . . . .
    . . . . 5 5 5 5 5 5 . . . . . .
    . . . . . 5 5 5 5 . . . . . . .
    . . . . . . 5 5 . . . . . . . .
    . . . . . . . . . . . . . . . .
\`)`,
    },
    {
      slug: "morph-background",
      title: "morph background",
      blockId: "backgroundmorphimage",
      blockString: "morph backgound image to %img=background_image_picker",
      group: "Screen",
      weight: 7,
      problem: "You want to change your game's background when entering a new stage, like switching from daytime to nighttime or entering a dark dungeon, with a smooth dissolve animation.",
      whatItDoes: "Gradually morphs the current screen background into a new image by transferring pixels randomly until the full new background is displayed.",
      parameters: [
        { name: "myImage", type: "Image", meaning: "The new background artwork to dissolve into." },
      ],
      example: `scene.setBackgroundImage(img\`
    7 7 7 7 7 7 7 7
    7 7 7 7 7 7 7 7
    7 7 7 7 7 7 7 7
    7 7 7 7 7 7 7 7
\`)

imagemorph.morphBackground(img\`
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
\`)`,
    }
  ],
};
