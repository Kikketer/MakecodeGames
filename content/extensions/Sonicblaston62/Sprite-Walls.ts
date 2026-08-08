import type { ExtensionDoc } from "@/content/extensions/types";

export const spriteWalls: ExtensionDoc = {
  owner: "Sonicblaston62",
  repo: "Sprite-Walls",
  displayName: "Sprite Walls",
  packageSlug: "github:Sonicblaston62/Sprite-Walls",
  description: "Add solid wall collisions between sprites or sprite kinds, and make pushable objects like puzzle boxes that stop when hitting walls.",
  tools: [
    {
      slug: "stop-when-colliding",
      title: "stop when colliding",
      blockString: "stop $spriteA when colliding with $spriteB",
      group: "Solid Collisions",
      weight: 0,
      problem: "You want your player to stop moving when hitting an obstacle sprite like a boulder or fence instead of walking right through it.",
      whatItDoes: "Makes spriteA stop moving when it touches spriteB, treating spriteB like a solid barrier. You can pass in a single sprite or an entire sprite kind (such as SpriteKind.Enemy).",
      parameters: [
        { name: "spriteA", type: "Sprite / number", default: "mySprite", meaning: "The sprite or sprite kind that should be stopped." },
        { name: "spriteB", type: "Sprite / number", meaning: "The sprite or sprite kind that acts as a solid wall." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
let wall = sprites.create(img\`.\`, SpriteKind.Food)
CollisionHandler.handleSolidCollision(mySprite, wall)`,
    },
    {
      slug: "allow-to-push",
      title: "allow to push",
      blockString: "allow $spriteA to push $spriteB in $direction",
      group: "Pushable Collisions",
      weight: 80,
      problem: "You want the player to push crates or blocks around in a sokoban-style puzzle game without pushing them through walls or off the screen.",
      whatItDoes: "Allows spriteA to push spriteB when they touch, automatically stopping spriteB if it hits a wall tile or the edge of the tilemap. You can limit pushing to strictly horizontal, vertical, or all directions.",
      parameters: [
        { name: "spriteA", type: "Sprite / number", default: "mySprite", meaning: "The sprite or sprite kind that does the pushing." },
        { name: "spriteB", type: "Sprite / number", meaning: "The sprite or sprite kind that gets pushed." },
        { name: "direction", type: "PushDirection", default: "CollisionHandler.PushDirection.Omnidirectional", meaning: "The direction pushing is allowed: X_Axis, Y_Axis, or Omnidirectional." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
let crate = sprites.create(img\`.\`, SpriteKind.Enemy)
CollisionHandler.handlePushableCollision(mySprite, crate, CollisionHandler.PushDirection.Omnidirectional)`,
    }
  ],
};
