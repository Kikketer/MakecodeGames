import type { ExtensionDoc } from "@/content/extensions/types";

export const spriteWalls: ExtensionDoc = {
  owner: "Sonicblaston62",
  repo: "Sprite-Walls",
  displayName: "Sprite Walls",
  packageSlug: "github:Sonicblaston62/Sprite-Walls",
  description: "Make sprites act like solid walls or pushable blocks without relying on tilemap walls.",
  tools: [
    {
      slug: "stop-when-colliding",
      title: "stop when colliding",
      blockString: "stop $spriteA when colliding with $spriteB",
      group: "Solid Collisions",
      weight: 0,
      problem: "You want an NPC, a closed door sprite, or a boss to act like a solid wall so the player cannot walk straight through them.",
      whatItDoes: "Sets up continuous collision checks that stop sprite A whenever it bumps into sprite B, preventing it from passing through. You can pass specific sprites or entire SpriteKinds.",
      parameters: [
        { name: "spriteA", type: "Sprite | number", default: "mySprite", meaning: "The sprite or SpriteKind that should be stopped." },
        { name: "spriteB", type: "Sprite | number", default: "undefined", meaning: "The sprite or SpriteKind acting as a solid wall." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
let wallSprite = sprites.create(img\`.\`, SpriteKind.Enemy)
controller.moveSprite(player)
CollisionHandler.handleSolidCollision(player, wallSprite)`,
    },
    {
      slug: "allow-to-push",
      title: "allow to push",
      blockString: "allow $spriteA to push $spriteB in $direction",
      group: "Pushable Collisions",
      weight: 80,
      problem: "You are creating a puzzle game where the player needs to push heavy crates, ice blocks, or boulders around the map.",
      whatItDoes: "Allows sprite A to push sprite B in the specified direction (X-axis, Y-axis, or all directions). If the pushed sprite hits a tilemap wall or the edge of the screen, it stops pushing automatically.",
      parameters: [
        { name: "spriteA", type: "Sprite | number", default: "mySprite", meaning: "The sprite or SpriteKind doing the pushing (like the player)." },
        { name: "spriteB", type: "Sprite | number", default: "undefined", meaning: "The sprite or SpriteKind that gets pushed (like a crate)." },
        { name: "direction", type: "PushDirection", default: "CollisionHandler.PushDirection.Omnidirectional", meaning: "The axes along which pushing is allowed (X_Axis, Y_Axis, or Omnidirectional)." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
let box = sprites.create(img\`.\`, SpriteKind.Food)
controller.moveSprite(player)
CollisionHandler.handlePushableCollision(player, box, CollisionHandler.PushDirection.Omnidirectional)`,
    }
  ],
};
