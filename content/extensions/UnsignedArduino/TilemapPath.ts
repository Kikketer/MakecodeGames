import type { ExtensionDoc } from "@/content/extensions/types";

export const tilemappath: ExtensionDoc = {
  owner: "UnsignedArduino",
  repo: "TilemapPath",
  displayName: "Tilemap Path",
  packageSlug: "github:UnsignedArduino/TilemapPath",
  description: "Create and manage multi-point routes on a tilemap for sprites to follow smoothly with built-in pathfinding.",
  tools: [
    {
      slug: "create-path",
      title: "create path",
      blockString: "create path $path",
      group: "General",
      weight: 100,
      problem: "You want guard enemies, NPCs, or cutscene characters to walk through a specific list of tile locations in your level.",
      whatItDoes: "Creates a new TilemapPath object from a list of tilemap locations. It automatically calculates the pathfinding routes needed to travel between each waypoint.",
      parameters: [
        { name: "path", type: "tiles.Location[]", default: "", meaning: "An array of tilemap locations that the path should visit in order." },
      ],
      returns: { type: "TilemapPath", meaning: "A new TilemapPath object ready to be assigned to a variable." },
      example: "let myPath = TilemapPath.create_path([tiles.getTileLocation(2, 2), tiles.getTileLocation(8, 2), tiles.getTileLocation(8, 8)])",
    },
    {
      slug: "set-path",
      title: "set path",
      blockString: "$tmpath set path to $path",
      group: "General",
      weight: 98,
      problem: "You need to update a path variable with a brand new set of tile waypoints during gameplay, such as when an enemy changes patrol routes.",
      whatItDoes: "Replaces the existing list of tilemap locations inside a path object and recalculates the pathfinding routes between them.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The TilemapPath object to update." },
        { name: "path", type: "tiles.Location[]", default: "", meaning: "The new array of tilemap locations for this path." },
      ],
      example: `let myPath = TilemapPath.create_path([tiles.getTileLocation(1, 1)])
TilemapPath.set_path(myPath, [tiles.getTileLocation(1, 1), tiles.getTileLocation(5, 5)])`,
    },
    {
      slug: "get-path",
      title: "get path",
      blockString: "$tmpath get path",
      group: "General",
      weight: 99,
      problem: "You want to inspect or copy the list of tile waypoints stored inside a path object.",
      whatItDoes: "Returns the array of tilemap locations originally used to create or set the path.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The TilemapPath object to read." },
      ],
      returns: { type: "tiles.Location[]", meaning: "The array of tilemap locations stored in the path." },
      example: `let myPath = TilemapPath.create_path([tiles.getTileLocation(2, 2), tiles.getTileLocation(5, 5)])
let waypoints = TilemapPath.get_path(myPath)`,
    },
    {
      slug: "follow-path",
      title: "follow path",
      blockString: "sprite $sprite follow path $path || at speed $speed",
      group: "General",
      weight: 90,
      problem: "You want a sprite to automatically move along a set of tile waypoints, steering around walls and obstacles along the way.",
      whatItDoes: "Makes a sprite follow all waypoints in a TilemapPath at the specified speed. Note that this function pauses code execution in the current code thread until the sprite reaches the final waypoint or is stopped.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will walk along the path." },
        { name: "path", type: "TilemapPath", default: "path", meaning: "The path object for the sprite to follow." },
        { name: "speed", type: "number", default: 100, meaning: "The movement speed of the sprite in pixels per second." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = TilemapPath.create_path([tiles.getTileLocation(2, 2), tiles.getTileLocation(6, 2)])
control.runInParallel(function () {
    TilemapPath.follow_path(mySprite, myPath, 80)
})`,
    },
    {
      slug: "is-sprite-following-path",
      title: "is sprite following path",
      blockString: "is $sprite following path",
      group: "General",
      weight: 80,
      problem: "You want to check if an enemy sprite is actively moving along a path before giving it a new command.",
      whatItDoes: "Checks if a sprite is currently in the middle of navigating a TilemapPath.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "True if the sprite is currently following a path, false otherwise." },
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
if (TilemapPath.is_sprite_following_path(mySprite)) {
    console.log("Sprite is on its way!")
}`,
    },
    {
      slug: "stop-follow-path",
      title: "stop follow path",
      blockString: "sprite $sprite stop following path",
      group: "General",
      weight: 70,
      problem: "You want a patrolling enemy to immediately halt its movement along a path when it spots the player or gets hit.",
      whatItDoes: "Cancels path navigation for the specified sprite and stops its movement.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that should stop following its path." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Enemy)
TilemapPath.stop_follow_path(mySprite)`,
    },
    {
      slug: "on-sprite-finishes-path",
      title: "on sprite finishes tilemap path",
      blockString: "on sprite $sprite finishes tilemap path",
      group: "General",
      weight: 60,
      problem: "You want something to happen, like playing a sound effect or spawning a item, as soon as a sprite reaches the destination at the end of its path.",
      whatItDoes: "Registers an event handler function that triggers whenever any sprite finishes navigating through all waypoints in a TilemapPath.",
      parameters: [
        { name: "handler", type: "(sprite: Sprite) => void", default: "", meaning: "The block of code to run when a sprite completes its path. Receives the sprite that finished as an argument." },
      ],
      example: `TilemapPath.on_sprite_finishes_path(function (sprite) {
    sprite.sayText("Arrived!")
})`,
    }
  ],
};
