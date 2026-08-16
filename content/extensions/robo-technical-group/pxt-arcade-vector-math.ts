import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtArcadeVectorMath: ExtensionDoc = {
  owner: "robo-technical-group",
  repo: "pxt-arcade-vector-math",
  displayName: "Vector Math",
  packageSlug: "github:robo-technical-group/pxt-arcade-vector-math",
  description: "Create and calculate 2D vectors to handle angles, magnitudes, and directional motion between sprites in MakeCode Arcade.",
  tools: [
    {
      slug: "create-vector-with-magnitude-and-direction",
      title: "create vector with magnitude and direction",
      blockId: "vectormath_create_vector",
      blockString: "create vector with magnitude %mag and direction %dir",
      group: "General",
      weight: 0,
      problem: "You want to launch a projectile at a specific speed and angle across the screen, but need to convert that speed and angle into horizontal and vertical velocity.",
      whatItDoes: "Creates a new vector from a given length (magnitude) and angle in degrees (direction). The resulting vector automatically calculates its x and y components.",
      parameters: [
        { name: "mag", type: "number", default: "0", meaning: "The magnitude (length or speed) of the vector." },
        { name: "dir", type: "number", default: "0", meaning: "The direction angle in degrees (0 points right, 90 points down)." },
      ],
      returns: { type: "Vector", meaning: "A Vector object with magnitude, direction, x, and y components." },
      example: `let bulletVector = vectorMath.createVector(100, 45)
let projectile = sprites.create(img\`.\`, SpriteKind.Projectile)
projectile.vx = bulletVector.x
projectile.vy = bulletVector.y`,
    },
    {
      slug: "create-vector-from-sprite-to-sprite",
      title: "create vector from sprite to sprite",
      blockId: "vectormath_create_vector_from_sprites",
      blockString: "create vector from sprite %spriteFrom to sprite %spriteTo",
      group: "General",
      weight: 0,
      problem: "You want an enemy or homing missile to calculate both the exact distance and direction needed to aim toward the player.",
      whatItDoes: "Creates a vector pointing from the first sprite directly to the second sprite. The vector's magnitude is the straight-line distance between them, and its direction is the angle in degrees pointing toward the target.",
      parameters: [
        { name: "spriteFrom", type: "Sprite", default: "", meaning: "The starting sprite to measure from (such as an enemy)." },
        { name: "spriteTo", type: "Sprite", default: "", meaning: "The target sprite to measure toward (such as the player)." },
      ],
      returns: { type: "Vector", meaning: "A Vector representing the distance and direction pointing from spriteFrom to spriteTo." },
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let attackVec = vectorMath.createVectorFromSprites(enemy, player)
console.log(attackVec.mag)`,
    }
  ],
};
