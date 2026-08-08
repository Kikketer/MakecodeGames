import type { ExtensionDoc } from "@/content/extensions/types";

export const tilemappath: ExtensionDoc = {
  owner: "UnsignedArduino",
  repo: "TilemapPath",
  displayName: "Tilemap Path",
  packageSlug: "github:UnsignedArduino/TilemapPath",
  description: "Allows sprites to follow multi-step tilemap routes with obstacle-avoiding pathfinding.",
  tools: [
    {
      slug: "create-path",
      title: "create path",
      blockString: "create path $path",
      group: "General",
      weight: 100,
      problem: "You want an enemy guard or NPC to patrol along a specific list of tile locations in your game level.",
      whatItDoes: "Creates a new TilemapPath object from an array of tilemap locations. It pre-calculates the obstacle-avoiding pathfinding routes between each tile waypoint in order.",
      parameters: [
        { name: "path", type: "tiles.Location[]", default: "null", meaning: "An array of tilemap locations to visit in order." },
      ],
      returns: { type: "TilemapPath", meaning: "The newly created path object." },
      example: "let myPath = TilemapPath.create_path([tiles.getTileLocation(0, 0), tiles.getTileLocation(5, 5)])",
    },
    {
      slug: "set-path",
      title: "set path",
      blockString: "$tmpath set path to $path",
      group: "General",
      weight: 98,
      problem: "You want to change a guard's patrol route after an alarm sounds or when entering a new stage.",
      whatItDoes: "Updates an existing TilemapPath with a new list of tile locations and recalculates the routes between them.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The TilemapPath to modify." },
        { name: "path", type: "tiles.Location[]", default: "null", meaning: "The new array of tile locations for the path." },
      ],
      example: `let myPath = TilemapPath.create_path([])
TilemapPath.set_path(myPath, [tiles.getTileLocation(1, 1), tiles.getTileLocation(4, 4)])`,
    },
    {
      slug: "get-path",
      title: "get path",
      blockString: "$tmpath get path",
      group: "General",
      weight: 99,
      problem: "You need to check which tile locations a path is currently using to verify its waypoints.",
      whatItDoes: "Returns the original list of tile locations that make up the specified TilemapPath.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The TilemapPath to get locations from." },
      ],
      returns: { type: "tiles.Location[]", meaning: "The list of tile locations stored in the path object." },
      example: `let myPath = TilemapPath.create_path([tiles.getTileLocation(2, 2)])
let waypoints = TilemapPath.get_path(myPath)`,
    },
    {
      slug: "follow-path",
      title: "follow path",
      blockString: "sprite $sprite follow path $path || at speed $speed",
      group: "General",
      weight: 90,
      problem: "You want a sprite to automatically move through a sequence of tile locations while walking around wall tiles.",
      whatItDoes: "Makes a sprite walk along each waypoint in a TilemapPath at the specified speed. Note that calling this function pauses execution in the current code thread until the sprite reaches the final waypoint or is stopped.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will follow the path." },
        { name: "path", type: "TilemapPath", default: "path", meaning: "The TilemapPath to follow." },
        { name: "speed", type: "number", default: "100", meaning: "How fast the sprite moves in pixels per second." },
      ],
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let myPath = TilemapPath.create_path([tiles.getTileLocation(1, 1), tiles.getTileLocation(5, 5)])
TilemapPath.follow_path(myEnemy, myPath, 80)`,
    },
    {
      slug: "is-sprite-following-path",
      title: "is sprite following path",
      blockString: "is $sprite following path",
      group: "General",
      weight: 80,
      problem: "You want to check if a patrol guard is currently moving along its path before sending it a new order.",
      whatItDoes: "Checks whether a sprite is currently in the middle of walking a TilemapPath.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is currently following a path, false otherwise." },
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
if (TilemapPath.is_sprite_following_path(myEnemy)) {
    console.log("Enemy is moving!")
}`,
    },
    {
      slug: "stop-follow-path",
      title: "stop following path",
      blockString: "sprite $sprite stop following path",
      group: "General",
      weight: 70,
      problem: "You want a patrolling enemy to stop in its tracks immediately when it spots the player.",
      whatItDoes: "Stops the sprite from following its TilemapPath and cancels its pathfinding movement.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that should stop following its path." },
      ],
      example: `let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)
TilemapPath.stop_follow_path(myEnemy)`,
    },
    {
      slug: "on-sprite-finishes-path",
      title: "on sprite finishes tilemap path",
      blockString: "on sprite $sprite finishes tilemap path",
      group: "General",
      weight: 60,
      problem: "You want an event to happen—like opening a door, changing level, or playing a sound—when an NPC reaches the end of its path.",
      whatItDoes: "Registers a handler event that triggers whenever any sprite reaches the final destination of a TilemapPath.",
      parameters: [
        { name: "handler", type: "(sprite: Sprite) => void", default: "null", meaning: "The callback function to run when a sprite finishes its path." },
      ],
      example: `TilemapPath.on_sprite_finishes_path(function (sprite) {
    sprite.sayText("Reached the end!")
})`,
    }
  ],
};
