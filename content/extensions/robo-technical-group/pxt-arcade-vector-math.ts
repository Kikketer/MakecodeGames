import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtArcadeVectorMath: ExtensionDoc = {
  owner: "robo-technical-group",
  repo: "pxt-arcade-vector-math",
  displayName: "Vector Math",
  packageSlug: "github:robo-technical-group/pxt-arcade-vector-math",
  description: "Create and calculate 2D vectors to handle angles, distances, and directional velocity for sprites in MakeCode Arcade.",
  tools: [
    {
      slug: "create-vector",
      title: "create vector",
      blockId: "vectormath_create_vector",
      blockString: "create vector with magnitude %mag and direction %dir",
      group: "General",
      weight: 0,
      problem: "You want to launch a fireball or move a spaceship at a specific speed in a chosen angle (such as 50 speed at a 45-degree angle), but you need the separate X and Y speeds to set its velocity.",
      whatItDoes: "Creates a new vector with a given length (magnitude) and angle (direction in degrees). The vector automatically calculates its X and Y components so you can easily apply them to sprite velocities.",
      parameters: [
        { name: "mag", type: "number", default: "0", meaning: "The length or speed of the vector (magnitude)." },
        { name: "dir", type: "number", default: "0", meaning: "The direction of the vector in degrees (0 is right, 90 is down)." },
      ],
      returns: { type: "Vector", meaning: "A new Vector object containing the magnitude, direction, and Cartesian (x, y) coordinates." },
      example: `let bulletVector = vectorMath.createVector(100, 45)
let projectile = sprites.create(img\`.\`, SpriteKind.Projectile)
projectile.vx = bulletVector.x
projectile.vy = bulletVector.y`,
    },
    {
      slug: "create-vector-from-sprites",
      title: "create vector from sprites",
      blockId: "vectormath_create_vector_from_sprites",
      blockString: "create vector from sprite %spriteFrom to sprite %spriteTo",
      group: "General",
      weight: 0,
      problem: "You have an enemy boss that needs to aim and shoot a missile directly at the player, but you don't know the exact angle or distance between them.",
      whatItDoes: "Creates a vector pointing from the first sprite directly to the second sprite. The magnitude is set to the distance in pixels between them, and the direction is the angle in degrees pointing at the target.",
      parameters: [
        { name: "spriteFrom", type: "Sprite", default: "null", meaning: "The starting sprite where the vector begins." },
        { name: "spriteTo", type: "Sprite", default: "null", meaning: "The target sprite where the vector points." },
      ],
      returns: { type: "Vector", meaning: "A Vector object pointing from the source sprite toward the target sprite, with magnitude equal to the distance between them." },
      example: `let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let player = sprites.create(img\`.\`, SpriteKind.Player)
let aim = vectorMath.createVectorFromSprites(enemy, player)
let bullet = sprites.createProjectileFromSprite(img\`.\`, enemy, aim.x, aim.y)`,
    }
  ],
};
