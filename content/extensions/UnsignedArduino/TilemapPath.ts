import type { ExtensionDoc } from "@/content/extensions/types";

export const tilemappath: ExtensionDoc = {
  owner: "UnsignedArduino",
  repo: "TilemapPath",
  displayName: "Tilemap Path",
  packageSlug: "github:UnsignedArduino/TilemapPath",
  description: "Create multi-point waypoint paths on tilemaps for sprites to follow with built-in obstacle avoidance.",
  tools: [
    {
      slug: "create-path",
      title: "create path",
      blockString: "create path $path",
      group: "General",
      weight: 100,
      problem: "You want an enemy guard, delivery drone, or NPC to walk through a specific sequence of checkpoints across your tilemap level.",
      whatItDoes: "Creates a new path object from a list of tile locations. It automatically calculates the best route between each checkpoint using pathfinding so sprites avoid walls.",
      parameters: [
        { name: "path", type: "tiles.Location[]", default: "null", meaning: "The list of tile locations to visit in order." },
      ],
      returns: { type: "TilemapPath", meaning: "A new TilemapPath object containing the planned route." },
      example: `let loc1 = tiles.getTileLocation(2, 2)
let loc2 = tiles.getTileLocation(8, 2)
let myPath = TilemapPath.create_path([loc1, loc2])`,
    },
    {
      slug: "set-path",
      title: "set path",
      blockString: "$tmpath set path to $path",
      group: "General",
      weight: 98,
      problem: "You want to update an existing patrol route with a new set of destinations without needing to create a brand new path variable.",
      whatItDoes: "Replaces the list of tile locations in an existing path object and recalculates the routes between them.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The path object you want to update." },
        { name: "path", type: "tiles.Location[]", default: "null", meaning: "The new list of tile locations to visit in order." },
      ],
      example: `let myPath = TilemapPath.create_path([tiles.getTileLocation(1, 1)])
TilemapPath.set_path(myPath, [tiles.getTileLocation(3, 3), tiles.getTileLocation(6, 6)])`,
    },
    {
      slug: "get-path",
      title: "get path",
      blockString: "$tmpath get path",
      group: "General",
      weight: 99,
      problem: "You want to check the waypoints stored inside a path, such as to spawn collectible coins at each checkpoint location.",
      whatItDoes: "Returns the original array of tile locations that make up the path.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The path object to inspect." },
      ],
      returns: { type: "tiles.Location[]", meaning: "The list of tile locations stored in the path." },
      example: `let myPath = TilemapPath.create_path([tiles.getTileLocation(2, 2), tiles.getTileLocation(5, 5)])
let points = TilemapPath.get_path(myPath)`,
    },
    {
      slug: "follow-path",
      title: "follow path",
      blockString: "sprite $sprite follow path $path || at speed $speed",
      group: "General",
      weight: 90,
      problem: "You want a sprite to automatically travel along a planned path from checkpoint to checkpoint, navigating around walls along the way.",
      whatItDoes: "Guides a sprite through each tile location in the path at the specified speed. Note that this function pauses code execution in its current thread until the sprite arrives at the final location or stops.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will move along the path." },
        { name: "path", type: "TilemapPath", default: "path", meaning: "The path object for the sprite to follow." },
        { name: "speed", type: "number", default: "100", meaning: "How fast the sprite moves in pixels per second." },
      ],
      example: `let guard = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = TilemapPath.create_path([tiles.getTileLocation(2, 2), tiles.getTileLocation(8, 2)])
TilemapPath.follow_path(guard, myPath, 60)`,
    },
    {
      slug: "is-sprite-following-path",
      title: "is sprite following path",
      blockString: "is $sprite following path",
      group: "General",
      weight: 80,
      problem: "You want to check if an enemy is actively moving on a patrol before giving them a new command or changing their animation state.",
      whatItDoes: "Checks whether a sprite is currently in the middle of navigating along a tilemap path.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is actively following a path, false otherwise." },
      example: `let guard = sprites.create(img\`.\`, SpriteKind.Enemy)
if (TilemapPath.is_sprite_following_path(guard)) {
    guard.sayText("On patrol!")
}`,
    },
    {
      slug: "stop-follow-path",
      title: "stop following path",
      blockString: "sprite $sprite stop following path",
      group: "General",
      weight: 70,
      problem: "You want an enemy guard to instantly abandon their patrol route when they spot the player or get hit.",
      whatItDoes: "Interrupts the path following for a sprite, stopping their movement and canceling the rest of the route.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that should stop following its path." },
      ],
      example: `let guard = sprites.create(img\`.\`, SpriteKind.Enemy)
TilemapPath.stop_follow_path(guard)`,
    },
    {
      slug: "on-sprite-finishes-path",
      title: "on sprite finishes tilemap path",
      blockString: "on sprite $sprite finishes tilemap path",
      group: "General",
      weight: 60,
      problem: "You want something to happen when a character reaches the end of their route, such as opening a door, triggering dialogue, or reversing a patrol.",
      whatItDoes: "Registers an event handler that runs automatically whenever any sprite finishes traveling to the final point of its path.",
      parameters: [
        { name: "handler", type: "(sprite: Sprite) => void", default: "null", meaning: "The code to run when a sprite finishes its path, with the arriving sprite provided as an argument." },
      ],
      example: `TilemapPath.on_sprite_finishes_path(function (sprite) {
    sprite.sayText("Destination reached!")
})`,
    }
  ],
};
