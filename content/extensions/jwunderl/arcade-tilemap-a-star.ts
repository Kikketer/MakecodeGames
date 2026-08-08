import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeTilemapAStar: ExtensionDoc = {
  owner: "jwunderl",
  repo: "arcade-tilemap-a-star",
  displayName: "Tilemap A* Pathfinding",
  packageSlug: "github:jwunderl/arcade-tilemap-a-star",
  description: "Calculate shortest path routes on tilemaps around wall obstacles and make sprites navigate smoothly along paths.",
  tools: [
    {
      slug: "path",
      title: "path",
      blockString: "path from $start to $end||on tiles of $onTilesOf",
      group: "Path Following",
      weight: 10,
      problem: "You need an enemy or NPC to calculate a route through a maze or map around walls to reach a player or destination tile.",
      whatItDoes: "Finds the shortest path between a starting tile location and a destination tile location while avoiding walls. You can optionally restrict movement to only walk on specific tile images.",
      parameters: [
        { name: "start", type: "tiles.Location", default: "null", meaning: "The starting tile location." },
        { name: "end", type: "tiles.Location", default: "null", meaning: "The target tile location to reach." },
        { name: "onTilesOf", type: "Image", default: "null", meaning: "Optional tile image to restrict movement to (for example, only walking on path or dirt tiles)." },
      ],
      returns: { type: "tiles.Location[]", meaning: "An array of tile locations forming the path, or undefined if no valid path exists." },
      example: `let startTile = tiles.getTileLocation(0, 0)
let endTile = tiles.getTileLocation(9, 7)
let myPath = scene.aStar(startTile, endTile)`,
    },
    {
      slug: "follow-path",
      title: "follow path",
      blockString: "sprite $sprite follow path $path || speed %speed",
      group: "Path Following",
      weight: 9,
      problem: "You generated a path across your tilemap and want an enemy or character sprite to automatically move along it step-by-step.",
      whatItDoes: "Commands a sprite to follow an array of tile locations at a given speed. If the sprite is starting off the path or inside a wall, it will navigate to or join the path at the nearest tile.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will follow the path." },
        { name: "path", type: "tiles.Location[]", default: "locationTiles", meaning: "The list of tile locations to move through." },
        { name: "speed", type: "number", default: "50", meaning: "Movement speed in pixels per second." },
      ],
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = scene.aStar(tiles.getTileLocation(0, 0), tiles.getTileLocation(9, 7))
scene.followPath(myEnemy, myPath, 60)`,
    },
    {
      slug: "sprite-is-following-path",
      title: "sprite is following path",
      blockString: "sprite $sprite is following a path",
      group: "Path Following",
      weight: 8,
      problem: "You want to check whether an enemy is currently walking along a path before giving it a new command or attacking.",
      whatItDoes: "Checks if the specified sprite is actively navigating a path created with followPath.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is actively following a path; false otherwise." },
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
if (scene.spriteIsFollowingPath(myEnemy)) {
    myEnemy.sayText("Moving!")
}`,
    },
    {
      slug: "percent-sprite-path-completion",
      title: "percent sprite path completion",
      blockString: "percent sprite $sprite path completion",
      group: "Path Following",
      weight: 7,
      problem: "You want to display a progress bar or trigger game events when a patrol monster gets halfway through its route.",
      whatItDoes: "Returns an estimate between 0 and 100 showing what percentage of its current path the sprite has completed. Returns 100 if the sprite is not following a path.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose path progress you want to check." },
      ],
      returns: { type: "number", meaning: "A percentage value between 0 and 100." },
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
game.onUpdate(function () {
    let progress = scene.spritePercentPathCompleted(myEnemy)
})`,
    },
    {
      slug: "on-completes-path",
      title: "on completes path",
      blockString: "on $sprite of kind $kind completes path at $location",
      group: "Overlaps",
      weight: 100,
      problem: "You want something to happen in your tower defense game—like dealing damage to your base or despawning the sprite—when an enemy reaches the end of its path.",
      whatItDoes: "Runs custom code whenever any sprite of a given kind reaches the final tile location of its path.",
      parameters: [
        { name: "kind", type: "number", default: "SpriteKind.Enemy", meaning: "The category of sprite to listen for (such as SpriteKind.Enemy)." },
        { name: "handler", type: "function", default: "null", meaning: "The code block to run when the path finishes, receiving the sprite and its end location." },
      ],
      example: `scene.onPathCompletion(SpriteKind.Enemy, function (sprite, location) {
    sprite.destroy()
})`,
    }
  ],
};
