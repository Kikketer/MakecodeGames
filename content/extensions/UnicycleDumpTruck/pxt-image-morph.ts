import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtImageMorph: ExtensionDoc = {
  owner: "UnicycleDumpTruck",
  repo: "pxt-image-morph",
  displayName: "Image Morph",
  packageSlug: "github:UnicycleDumpTruck/pxt-image-morph",
  description: "Create cool pixel-dissolve morphing transitions between sprite images or background scenes in MakeCode Arcade.",
  tools: [
    {
      slug: "morph-image",
      title: "morph image",
      blockId: "spritemorphimage",
      blockString: "morph %sprite(mySprite) image to %img=screen_image_picker",
      group: "Sprites",
      weight: 7,
      problem: "You want a sprite to transform into a new form—like a player leveling up, powering up into a beast, or an enemy evolving—with a smooth pixel-by-pixel dissolving effect instead of instantly switching images.",
      whatItDoes: "Morphs a sprite's current visual into a new image by randomly transferring pixels over time. It automatically adjusts the sprite's size and position so both images line up during the transition.",
      parameters: [
        { name: "mySprite", type: "Sprite", default: "mySprite", meaning: "The sprite you want to transform." },
        { name: "new_image", type: "Image", default: "", meaning: "The target image to morph into." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
imagemorph.morph(mySprite, img\`.\`)`,
    },
    {
      slug: "morph-background",
      title: "morph background image",
      blockId: "backgroundmorphimage",
      blockString: "morph backgound image to %img=background_image_picker",
      group: "Screen",
      weight: 7,
      problem: "You are transitioning between game areas—like entering a boss arena or moving from daytime to nighttime—and want the scenery to dissolve smoothly into a new backdrop.",
      whatItDoes: "Morphs the game's current background image into a new image by randomly replacing pixels until the new background is fully revealed.",
      parameters: [
        { name: "myImage", type: "Image", default: "", meaning: "The new background image to morph into." },
      ],
      example: `scene.setBackgroundImage(img\`.\`)
imagemorph.morphBackground(img\`.\`)`,
    }
  ],
};
