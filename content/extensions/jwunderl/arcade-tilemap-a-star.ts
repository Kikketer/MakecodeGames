import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeTilemapAStar: ExtensionDoc = {
  owner: "jwunderl",
  repo: "arcade-tilemap-a-star",
  displayName: "Tilemap A* Pathfinding",
  packageSlug: "github:jwunderl/arcade-tilemap-a-star",
  description: "Smart pathfinding for tilemaps that lets sprites calculate routes around walls and follow paths automatically.",
  tools: [
    {
      slug: "path",
      title: "path",
      blockString: "path from $start to $end||on tiles of $onTilesOf",
      group: "Path Following",
      weight: 10,
      problem: "You want an enemy or NPC to find a route through a maze or around obstacles to reach a target without getting stuck on walls.",
      whatItDoes: "Calculates the shortest path between two tile locations on the tilemap while avoiding walls. You can optionally restrict movement so the path only uses a specific tile type (such as roads or grass). Returns a list of tile locations, or undefined if no valid path exists.",
      parameters: [
        { name: "start", type: "tiles.Location", default: "null", meaning: "The starting tile location." },
        { name: "end", type: "tiles.Location", default: "null", meaning: "The destination tile location." },
        { name: "onTilesOf", type: "Image", default: "null", meaning: "(Optional) A specific tile image to restrict movement to, such as a road or dirt tile." },
      ],
      returns: { type: "tiles.Location[]", meaning: "An array of tile locations forming the path from start to end, or undefined if no path exists." },
      example: "let myPath = scene.aStar(tiles.getTileLocation(0, 0), tiles.getTileLocation(9, 7))",
    },
    {
      slug: "sprite-follow-path",
      title: "sprite follow path",
      blockString: "sprite $sprite follow path $path || speed %speed",
      group: "Path Following",
      weight: 9,
      problem: "You generated a path using pathfinding and now you want an enemy or companion sprite to smoothly walk along that route.",
      whatItDoes: "Makes a sprite move through an array of tile locations one by one at a specified speed. If the sprite starts inside a wall or slightly off the path, it navigates or teleports to the nearest path tile before continuing.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that should follow the path." },
        { name: "path", type: "tiles.Location[]", default: "locationTiles", meaning: "The list of tile locations the sprite will move through." },
        { name: "speed", type: "number", default: "50", meaning: "The movement speed in pixels per second." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = scene.aStar(tiles.getTileLocation(0, 0), tiles.getTileLocation(9, 7))
scene.followPath(mySprite, myPath, 50)`,
    },
    {
      slug: "sprite-is-following-a-path",
      title: "sprite is following a path",
      blockString: "sprite $sprite is following a path",
      group: "Path Following",
      weight: 8,
      problem: "You want to check if an enemy is currently walking along a patrol route before giving it a new destination or triggering an idle animation.",
      whatItDoes: "Checks whether the given sprite is currently actively following a path.",
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
      slug: "percent-sprite-path-completion",
      title: "percent sprite path completion",
      blockString: "percent sprite $sprite path completion",
      group: "Path Following",
      weight: 7,
      problem: "You are building a tower defense game or racing game and need to know how far along the track an enemy or racer has traveled.",
      whatItDoes: "Returns an estimated completion percentage between 0 and 100 for the sprite's current path. If the sprite is not currently following a path, this returns 100.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check path progress for." },
      ],
      returns: { type: "number", meaning: "A percentage from 0 to 100 showing how much of the path has been traversed." },
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
let progress = scene.spritePercentPathCompleted(mySprite)
mySprite.sayText(progress + "%")`,
    },
    {
      slug: "on-sprite-of-kind-completes-path",
      title: "on sprite of kind completes path",
      blockString: "on $sprite of kind $kind completes path at $location",
      group: "Overlaps",
      weight: 100,
      problem: "You want an enemy in a tower defense game to deal damage to your base when it reaches the exit, or make an NPC talk once it arrives at its destination.",
      whatItDoes: "Runs a block of code whenever any sprite of a specific kind reaches the final tile of its path. It gives you access to the sprite that finished and the tile location where it stopped.",
      parameters: [
        { name: "kind", type: "number", default: "SpriteKind.Enemy", meaning: "The kind of sprite to listen for (e.g. SpriteKind.Enemy or SpriteKind.Player)." },
        { name: "handler", type: "(sprite: Sprite, location: tiles.Location) => void", default: "null", meaning: "The code to run when the path finishes, receiving the completed sprite and its final location." },
      ],
      example: `scene.onPathCompletion(SpriteKind.Enemy, function (sprite, location) {
    sprite.destroy()
    info.changeLifeBy(-1)
})`,
    }
  ],
};
