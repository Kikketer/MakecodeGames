import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtImageMorph: ExtensionDoc = {
  owner: "UnicycleDumpTruck",
  repo: "pxt-image-morph",
  displayName: "Image Morph",
  packageSlug: "github:UnicycleDumpTruck/pxt-image-morph",
  description: "Create dissolving pixel-by-pixel transition animations when changing sprite images or background scenes.",
  tools: [
    {
      slug: "morph-image",
      title: "morph image",
      blockId: "spritemorphimage",
      blockString: "morph %sprite(mySprite) image to %img=screen_image_picker",
      group: "Sprites",
      weight: 7,
      problem: "You want your player or enemy to power up and transform into a new appearance with a dissolving pixel animation instead of instantly snapping to the new image.",
      whatItDoes: "Gradually transforms a sprite's current image into a new image by swapping random pixels over time until the full new graphic is visible.",
      parameters: [
        { name: "mySprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will transform into the new image." },
        { name: "new_image", type: "Image", default: "", meaning: "The new image the sprite will morph into." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
imagemorph.morph(mySprite, img\`.\`)`,
    },
    {
      slug: "morph-background-image",
      title: "morph background image",
      blockId: "backgroundmorphimage",
      blockString: "morph backgound image to %img=background_image_picker",
      group: "Screen",
      weight: 7,
      problem: "You want to shift to a new level, weather condition, or scene with a dramatic screen-dissolve transition instead of an abrupt background cut.",
      whatItDoes: "Smoothly transitions the current background into a new background image by randomly transferring pixels in batches until the transition finishes.",
      parameters: [
        { name: "myImage", type: "Image", default: "", meaning: "The new background image to morph into." },
      ],
      example: `scene.setBackgroundImage(img\`.\`)
imagemorph.morphBackground(img\`.\`)`,
    }
  ],
};
