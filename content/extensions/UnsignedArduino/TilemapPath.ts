import type { ExtensionDoc } from "@/content/extensions/types";

export const tilemappath: ExtensionDoc = {
  owner: "UnsignedArduino",
  repo: "TilemapPath",
  displayName: "Tilemap Path",
  packageSlug: "github:UnsignedArduino/TilemapPath",
  description: "Allows sprites to navigate complex multi-point paths across a tilemap with obstacle-avoiding pathfinding.",
  tools: [
    {
      slug: "create-path",
      title: "create path",
      blockString: "create path $path",
      group: "General",
      weight: 100,
      problem: "You want to set up a patrol route or delivery course for an NPC or enemy to travel across multiple waypoints on your tilemap.",
      whatItDoes: "Creates a new TilemapPath object containing a list of tile locations. It pre-calculates the obstacle-free route between each point on the tilemap.",
      parameters: [
        { name: "path", type: "tiles.Location[]", default: "null", meaning: "A list of tile locations to visit in order." },
      ],
      returns: { type: "TilemapPath", meaning: "A new path object ready for sprites to follow." },
      example: `let path = TilemapPath.create_path([
    tiles.getTileLocation(1, 1),
    tiles.getTileLocation(5, 1),
    tiles.getTileLocation(5, 5)
])`,
    },
    {
      slug: "set-path",
      title: "set path",
      blockString: "$tmpath set path to $path",
      group: "General",
      weight: 98,
      problem: "You already have a path variable for a guard, but you need to change its patrol route when an alarm goes off or a new level starts.",
      whatItDoes: "Replaces the list of tile locations in an existing TilemapPath object and recalculates the route between the new locations.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The TilemapPath object to update." },
        { name: "path", type: "tiles.Location[]", default: "null", meaning: "The new list of tile locations to visit in order." },
      ],
      example: `let path = TilemapPath.create_path([tiles.getTileLocation(1, 1)])
TilemapPath.set_path(path, [
    tiles.getTileLocation(2, 2),
    tiles.getTileLocation(8, 2)
])`,
    },
    {
      slug: "get-path",
      title: "get path",
      blockString: "$tmpath get path",
      group: "General",
      weight: 99,
      problem: "You need to see which tile locations are saved inside a path object, like checking how many waypoints it has left or placing markers on them.",
      whatItDoes: "Returns the original array of tile locations that were used to create or set the TilemapPath.",
      parameters: [
        { name: "tmpath", type: "TilemapPath", default: "path", meaning: "The TilemapPath object to read locations from." },
      ],
      returns: { type: "tiles.Location[]", meaning: "An array of tile locations stored in the path." },
      example: `let path = TilemapPath.create_path([tiles.getTileLocation(1, 1), tiles.getTileLocation(4, 4)])
let locations = TilemapPath.get_path(path)`,
    },
    {
      slug: "follow-path",
      title: "follow path",
      blockString: "sprite $sprite follow path $path || at speed $speed",
      group: "General",
      weight: 90,
      problem: "You have an enemy guard or moving platform and want it to walk through a series of checkpoints around walls and obstacles.",
      whatItDoes: "Makes a sprite travel to each waypoint in the path one after another using pathfinding to steer around walls. This pauses the current code flow until the sprite reaches the final destination or is told to stop.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will follow the path." },
        { name: "path", type: "TilemapPath", default: "path", meaning: "The TilemapPath object to follow." },
        { name: "speed", type: "number", default: "100", meaning: "The speed in pixels per second at which the sprite moves." },
      ],
      example: `let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
let path = TilemapPath.create_path([tiles.getTileLocation(2, 2), tiles.getTileLocation(8, 2)])
TilemapPath.follow_path(enemy, path, 50)`,
    },
    {
      slug: "is-sprite-following-path",
      title: "is sprite following path",
      blockString: "is $sprite following path",
      group: "General",
      weight: 80,
      problem: "You want to check if an enemy is currently walking its route so you only give it a new order when it has stopped moving.",
      whatItDoes: "Checks whether a specific sprite is currently in the middle of moving along a TilemapPath.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is currently following a path, false otherwise." },
      example: `let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
if (TilemapPath.is_sprite_following_path(enemy)) {
    enemy.sayText("On patrol!")
}`,
    },
    {
      slug: "stop-following-path",
      title: "stop following path",
      blockString: "sprite $sprite stop following path",
      group: "General",
      weight: 70,
      problem: "A patrolling enemy spots the player, and you need to cancel its patrol route immediately so it can chase the player instead.",
      whatItDoes: "Immediately stops a sprite from following its current TilemapPath and cancels its movement.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that should stop following its path." },
      ],
      example: `let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
TilemapPath.stop_follow_path(enemy)`,
    },
    {
      slug: "on-sprite-finishes-tilemap-path",
      title: "on sprite finishes tilemap path",
      blockString: "on sprite $sprite finishes tilemap path",
      group: "General",
      weight: 60,
      problem: "You want an NPC to start talking, open a gate, or reverse its movement as soon as it arrives at the last waypoint of its route.",
      whatItDoes: "Runs an event handler whenever any sprite successfully finishes traveling along its entire TilemapPath.",
      parameters: [
        { name: "handler", type: "(sprite: Sprite) => void", default: "null", meaning: "The code to run when a sprite finishes its path, with the completed sprite passed in." },
      ],
      example: `TilemapPath.on_sprite_finishes_path(function (sprite) {
    sprite.sayText("Destination reached!")
})`,
    }
  ],
};
