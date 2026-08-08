import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtArcadeVectorMath: ExtensionDoc = {
  owner: "robo-technical-group",
  repo: "pxt-arcade-vector-math",
  displayName: "Vector Math",
  packageSlug: "github:robo-technical-group/pxt-arcade-vector-math",
  description: "Create and manage 2D vectors to calculate distances, angles, and directional forces between objects in your games.",
  tools: [
    {
      slug: "create-vector",
      title: "create vector",
      blockId: "vectormath_create_vector",
      blockString: "create vector with magnitude %mag and direction %dir",
      group: "General",
      weight: 0,
      problem: "You want to launch a projectile or move a game character with both a specific speed and direction (angle) without calculating X and Y speeds manually.",
      whatItDoes: "Creates a new Vector object using a magnitude (size or speed) and a direction (angle in degrees). You can use this object to easily read X and Y movement components.",
      parameters: [
        { name: "mag", type: "number", default: "0", meaning: "The size or speed of the vector (magnitude)." },
        { name: "dir", type: "number", default: "0", meaning: "The angle of direction in degrees (0 degrees points right, 90 points down)." },
      ],
      returns: { type: "Vector", meaning: "A new Vector object containing the specified magnitude and angle." },
      example: `let myVector = vectorMath.createVector(100, 45)
console.log("X speed: " + myVector.x)`,
    },
    {
      slug: "create-vector-from-sprites",
      title: "create vector from sprites",
      blockId: "vectormath_create_vector_from_sprites",
      blockString: "create vector from sprite %spriteFrom to sprite %spriteTo",
      group: "General",
      weight: 0,
      problem: "You want an enemy turret to aim straight at the player, but you need both the aiming angle and the exact distance to know if the player is in range.",
      whatItDoes: "Calculates the straight-line distance and angle pointing from a starting sprite toward a target sprite, returning the result as a Vector object.",
      parameters: [
        { name: "spriteFrom", type: "Sprite", meaning: "The starting sprite where the vector begins." },
        { name: "spriteTo", type: "Sprite", meaning: "The target sprite where the vector points toward." },
      ],
      returns: { type: "Vector", meaning: "A Vector whose magnitude is the distance between the sprites and whose direction points from the starting sprite to the target sprite." },
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let aimVector = vectorMath.createVectorFromSprites(enemy, player)
console.log("Aim direction: " + aimVector.dir)`,
    }
  ],
};
