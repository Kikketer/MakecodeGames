import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeTilemapAStar: ExtensionDoc = {
  owner: "jwunderl",
  repo: "arcade-tilemap-a-star",
  displayName: "Tilemap A* Pathfinding",
  packageSlug: "github:jwunderl/arcade-tilemap-a-star",
  description: "Find paths around walls and navigate sprites through tilemaps using A* pathfinding.",
  tools: [
    {
      slug: "path-from-to",
      title: "path from to",
      blockString: "path from $start to $end||on tiles of $onTilesOf",
      group: "Path Following",
      weight: 10,
      problem: "You want an enemy or NPC to navigate around walls and obstacles in a maze to reach the player's position.",
      whatItDoes: "Calculates the shortest walkable path between two tile locations on your tilemap using the A* search algorithm. You can optionally restrict pathfinding to only walk across a specific type of tile.",
      parameters: [
        { name: "start", type: "tiles.Location", default: "none", meaning: "The tile location where the path starts." },
        { name: "end", type: "tiles.Location", default: "none", meaning: "The destination tile location." },
        { name: "onTilesOf", type: "Image", default: "null", meaning: "An optional tile image to restrict movement to (for example, only walking on road tiles)." },
      ],
      returns: { type: "tiles.Location[]", meaning: "An array of tile locations forming the path from start to end, or undefined if no path exists." },
      example: `let startLoc = tiles.getTileLocation(0, 0)
let endLoc = tiles.getTileLocation(9, 7)
let myPath = scene.aStar(startLoc, endLoc)`,
    },
    {
      slug: "sprite-follow-path",
      title: "sprite follow path",
      blockString: "sprite $sprite follow path $path || speed %speed",
      group: "Path Following",
      weight: 9,
      problem: "You calculated a path across your tilemap and want an enemy or guide character to smoothly walk along each step of that path.",
      whatItDoes: "Makes a sprite automatically travel along a list of tile locations at a given speed. If the sprite is not currently on the path, it finds a way onto the path first.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will follow the path." },
        { name: "path", type: "tiles.Location[]", default: "locationTiles", meaning: "The array of tile locations for the sprite to follow." },
        { name: "speed", type: "number", default: "50", meaning: "The speed in pixels per second at which the sprite should move." },
      ],
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = scene.aStar(tiles.getTileLocation(0, 0), tiles.getTileLocation(5, 5))
scene.followPath(myEnemy, myPath, 60)`,
    },
    {
      slug: "sprite-is-following-a-path",
      title: "sprite is following a path",
      blockString: "sprite $sprite is following a path",
      group: "Path Following",
      weight: 8,
      problem: "You want to check if a patrol guard is still walking along their route before assigning them a new task or triggering an alert.",
      whatItDoes: "Checks whether a given sprite is currently moving along a path.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is currently following a path, false otherwise." },
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
if (scene.spriteIsFollowingPath(myEnemy)) {
    myEnemy.sayText("On my way!")
}`,
    },
    {
      slug: "percent-sprite-path-completion",
      title: "percent sprite path completion",
      blockString: "percent sprite $sprite path completion",
      group: "Path Following",
      weight: 7,
      problem: "You are making a tower defense or racing game and need to know how close an enemy or runner is to reaching the finish line.",
      whatItDoes: "Returns an estimated completion percentage from 0 to 100 based on how many tiles of the path the sprite has traversed. Returns 100 if the sprite is not currently following a path.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose progress you want to measure." },
      ],
      returns: { type: "number", meaning: "The path progress as a percentage between 0 and 100." },
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let progress = scene.spritePercentPathCompleted(myEnemy)
console.log(progress)`,
    },
    {
      slug: "on-sprite-of-kind-completes-path",
      title: "on sprite of kind completes path",
      blockString: "on $sprite of kind $kind completes path at $location",
      group: "Overlaps",
      weight: 100,
      problem: "You want something to happen the moment an enemy reaches the end of its path, like taking away player life or starting a boss battle.",
      whatItDoes: "Runs a block of code whenever any sprite of a specific kind reaches the final tile of its path.",
      parameters: [
        { name: "kind", type: "number", default: "SpriteKind.Enemy", meaning: "The sprite kind to watch for path completion." },
        { name: "handler", type: "(sprite: Sprite, location: tiles.Location) => void", default: "none", meaning: "The code to run when a matching sprite reaches the end of its path, receiving the sprite and end location." },
      ],
      example: `scene.onPathCompletion(SpriteKind.Enemy, function (sprite, location) {
    info.changeLifeBy(-1)
    sprite.destroy()
})`,
    }
  ],
};
