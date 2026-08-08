import type { ExtensionDoc } from "@/content/extensions/types";

export const spriteWalls: ExtensionDoc = {
  owner: "Sonicblaston62",
  repo: "Sprite-Walls",
  displayName: "Sprite Walls",
  packageSlug: "github:Sonicblaston62/Sprite-Walls",
  description: "Add solid wall obstacles and pushable blocks like crates or boulders between sprites without using tilemap walls.",
  tools: [
    {
      slug: "stop-when-colliding",
      title: "stop when colliding",
      blockString: "stop $spriteA when colliding with $spriteB",
      group: "Solid Collisions",
      weight: 0,
      problem: "You want a sprite, enemy, or obstacle to act like a solid wall that your player cannot walk through, even if you are not using tilemap wall tiles.",
      whatItDoes: "Prevents spriteA from moving through spriteB by pushing spriteA back and stopping its speed whenever the two overlap. You can pass an individual sprite or an entire sprite kind.",
      parameters: [
        { name: "spriteA", type: "Sprite / number", default: "mySprite", meaning: "The moving sprite or sprite kind that should be stopped." },
        { name: "spriteB", type: "Sprite / number", meaning: "The obstacle sprite or sprite kind acting as a solid wall." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
let wall = sprites.create(img\`.\`, SpriteKind.Enemy)
CollisionHandler.handleSolidCollision(mySprite, wall)`,
    },
    {
      slug: "allow-to-push",
      title: "allow to push",
      blockString: "allow $spriteA to push $spriteB in $direction",
      group: "Pushable Collisions",
      weight: 80,
      problem: "You want your player to push boxes, crates, or boulders around the screen in a puzzle game, but prevent them from being pushed through walls.",
      whatItDoes: "Allows spriteA to push spriteB when they bump into each other. If spriteB hits a tilemap wall or boundary, it stops moving and blocks spriteA.",
      parameters: [
        { name: "spriteA", type: "Sprite / number", default: "mySprite", meaning: "The sprite or sprite kind that is doing the pushing." },
        { name: "spriteB", type: "Sprite / number", meaning: "The block sprite or sprite kind that gets pushed." },
        { name: "direction", type: "PushDirection", default: "CollisionHandler.PushDirection.Omnidirectional", meaning: "The allowed push direction: X_Axis (horizontal), Y_Axis (vertical), or Omnidirectional (all directions)." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
let box = sprites.create(img\`.\`, SpriteKind.Food)
CollisionHandler.handlePushableCollision(mySprite, box, CollisionHandler.PushDirection.Omnidirectional)`,
    }
  ],
};
