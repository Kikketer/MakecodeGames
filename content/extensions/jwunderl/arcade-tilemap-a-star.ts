import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeTilemapAStar: ExtensionDoc = {
  owner: "jwunderl",
  repo: "arcade-tilemap-a-star",
  displayName: "Tilemap A* Pathfinding",
  packageSlug: "github:jwunderl/arcade-tilemap-a-star",
  description: "Find pathable routes through tilemaps avoiding walls, and make sprites follow tile paths automatically.",
  tools: [
    {
      slug: "a-star",
      title: "path from start to end",
      blockString: "path from $start to $end||on tiles of $onTilesOf",
      group: "Path Following",
      weight: 10,
      problem: "You want an enemy, guard, or companion NPC to navigate through a maze or tilemap around walls to reach a target location.",
      whatItDoes: "Calculates the shortest route of tile locations from a starting tile to an ending tile while avoiding wall obstacles. You can optionally restrict movement to a specific tile type, such as staying on roads or pathways.",
      parameters: [
        { name: "start", type: "tiles.Location", meaning: "The starting tile location on the tilemap." },
        { name: "end", type: "tiles.Location", meaning: "The destination tile location on the tilemap." },
        { name: "onTilesOf", type: "Image", default: "null", meaning: "Optional tile image to restrict path movement to (for example, only walking on path tiles)." },
      ],
      returns: { type: "tiles.Location[]", meaning: "An array of tile locations forming the path, or undefined if no path is found." },
      example: `let start = tiles.getTileLocation(0, 0)
let end = tiles.getTileLocation(9, 7)
let myPath = scene.aStar(start, end)`,
    },
    {
      slug: "follow-path",
      title: "follow path",
      blockString: "sprite $sprite follow path $path || speed %speed",
      group: "Path Following",
      weight: 9,
      problem: "You calculated a path across your tilemap and need a sprite to automatically walk along that route step-by-step.",
      whatItDoes: "Commands a sprite to move along a sequence of tile locations at a given speed in pixels per second. If the path is empty or speed is zero, the sprite stops moving.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will walk along the path." },
        { name: "path", type: "tiles.Location[]", default: "locationTiles", meaning: "The array of tile locations for the sprite to follow." },
        { name: "speed", type: "number", default: "50", meaning: "The speed at which the sprite moves along the path in pixels per second." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = scene.aStar(tiles.getTileLocation(0, 0), tiles.getTileLocation(5, 5))
scene.followPath(mySprite, myPath, 50)`,
    },
    {
      slug: "sprite-is-following-path",
      title: "sprite is following path",
      blockString: "sprite $sprite is following a path",
      group: "Path Following",
      weight: 8,
      problem: "You need to check if an enemy or patrolling character is currently moving along a path before giving it a new command.",
      whatItDoes: "Checks whether the given sprite is actively following a path assigned by the follow path block.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is currently following a path, false otherwise." },
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
if (scene.spriteIsFollowingPath(mySprite)) {
    mySprite.sayText("On my way!")
}`,
    },
    {
      slug: "sprite-percent-path-completed",
      title: "percent sprite path completion",
      blockString: "percent sprite $sprite path completion",
      group: "Path Following",
      weight: 7,
      problem: "You want to display a progress bar or trigger an event when a racing car or enemy gets halfway along its route.",
      whatItDoes: "Calculates an estimate from 0 to 100 representing the percentage of its assigned path that the sprite has completed.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose progress you want to measure." },
      ],
      returns: { type: "number", meaning: "A percentage value between 0 and 100." },
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
game.onUpdate(function () {
    let progress = scene.spritePercentPathCompleted(mySprite)
    mySprite.sayText(progress + "%")
})`,
    },
    {
      slug: "on-path-completion",
      title: "on completes path at",
      blockString: "on $sprite of kind $kind completes path at $location",
      group: "Overlaps",
      weight: 100,
      problem: "You want something to happen—such as destroying an enemy, dealing damage to a base, or triggering victory—when a sprite finishes walking its path.",
      whatItDoes: "Runs a custom code block whenever any sprite of the specified kind reaches the final tile location of its path.",
      parameters: [
        { name: "kind", type: "number", meaning: "The sprite kind to watch for (for example, SpriteKind.Enemy)." },
        { name: "handler", type: "function(sprite: Sprite, location: tiles.Location)", meaning: "The callback function to run when the path is completed, providing the sprite and its destination tile." },
      ],
      example: `scene.onPathCompletion(SpriteKind.Enemy, function (sprite, location) {
    sprite.destroy()
})`,
    }
  ],
};
