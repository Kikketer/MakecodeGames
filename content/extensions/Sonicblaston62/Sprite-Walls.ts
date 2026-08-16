import type { ExtensionDoc } from "@/content/extensions/types";

export const spriteWalls: ExtensionDoc = {
  owner: "Sonicblaston62",
  repo: "Sprite-Walls",
  displayName: "Sprite Walls",
  packageSlug: "github:Sonicblaston62/Sprite-Walls",
  description: "Add solid wall collisions and pushable block physics between sprites or sprite kinds without needing tilemap walls.",
  tools: [
    {
      slug: "stop-when-colliding",
      title: "stop when colliding",
      blockString: "stop $spriteA when colliding with $spriteB",
      group: "Solid Collisions",
      weight: 0,
      problem: "You want an NPC, a heavy boulder, or an enemy to act like a solid wall so the player cannot walk straight through them.",
      whatItDoes: "Sets up continuous collision checking between two sprites or sprite kinds so that the first sprite stops completely upon hitting the second sprite, treating it like a solid obstacle.",
      parameters: [
        { name: "spriteA", type: "Sprite | number", default: "mySprite", meaning: "The moving sprite or SpriteKind that should be stopped." },
        { name: "spriteB", type: "Sprite | number", default: "myEnemy", meaning: "The obstacle sprite or SpriteKind acting as a solid wall." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
let guard = sprites.create(img\`.\`, SpriteKind.Enemy)
controller.moveSprite(player)
CollisionHandler.handleSolidCollision(player, guard)`,
    },
    {
      slug: "allow-to-push",
      title: "allow to push",
      blockString: "allow $spriteA to push $spriteB in $direction",
      group: "Pushable Collisions",
      weight: 80,
      problem: "You are building a puzzle game where the player needs to push crates, boulders, or blocks around the screen without passing through walls.",
      whatItDoes: "Allows one sprite or sprite kind to push another sprite when they collide. The pushed sprite will stop automatically if it runs into a wall tile or the edge of the map.",
      parameters: [
        { name: "spriteA", type: "Sprite | number", default: "mySprite", meaning: "The sprite or SpriteKind doing the pushing (like the player)." },
        { name: "spriteB", type: "Sprite | number", default: "myEnemy", meaning: "The sprite or SpriteKind being pushed (like a crate or rock)." },
        { name: "direction", type: "PushDirection", default: "CollisionHandler.PushDirection.Omnidirectional", meaning: "The direction the sprite can be pushed: X_Axis, Y_Axis, or Omnidirectional." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
let box = sprites.create(img\`.\`, SpriteKind.Food)
controller.moveSprite(player)
CollisionHandler.handlePushableCollision(player, box, CollisionHandler.PushDirection.Omnidirectional)`,
    }
  ],
};
