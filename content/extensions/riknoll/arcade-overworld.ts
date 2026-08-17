import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeOverworld: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-overworld",
  displayName: "Arcade Overworld",
  packageSlug: "github:riknoll/arcade-overworld",
  description: "Create connected Zelda-style room grids and seamless multi-screen adventure worlds with smooth transitions and auto-scrolling.",
  tools: [
    {
      slug: "set-overworld-16",
      title: "set overworld 16",
      blockId: "overworld_setOverworld16",
      blockString: "set overworld $maps",
      group: "Create",
      weight: 100,
      problem: "You want to build a large adventure game with a 2D grid of 16x16 tilemaps so the player can explore different rooms and areas.",
      whatItDoes: "Sets the 2D grid of 16x16 tilemaps that make up your game's overworld. You still need to load an initial map using loadMap to display it on screen.",
      parameters: [
        { name: "maps", type: "tiles.TileMapData[][]", meaning: "A 2D array (rows and columns) of 16x16 tilemaps." },
      ],
      example: `let world = [
    [tilemap\`level1\`, tilemap\`level2\`]
]
overworld.setOverworld16(world)
overworld.loadMap(0, 0)`,
    },
    {
      slug: "set-overworld-8",
      title: "set overworld 8",
      blockId: "overworld_setOverworld8",
      blockString: "set overworld $maps",
      group: "Create",
      weight: 90,
      problem: "You are making a retro-style game using smaller 8x8 pixel tiles and want to arrange multiple tilemaps into an explorable grid.",
      whatItDoes: "Sets the 2D grid of 8x8 tilemaps that make up your overworld. Use loadMap afterwards to start the game on a specific tilemap.",
      parameters: [
        { name: "maps", type: "tiles.TileMapData[][]", meaning: "A 2D array of 8x8 tilemaps arranged in rows and columns." },
      ],
      example: `let world = [
    [tilemap\`level1\`, tilemap\`level2\`]
]
overworld.setOverworld8(world)
overworld.loadMap(0, 0)`,
    },
    {
      slug: "set-player-sprite",
      title: "set player sprite",
      blockId: "overworld_setPlayerSprite",
      blockString: "set player sprite $sprite",
      group: "Create",
      weight: 80,
      problem: "You want the game to automatically switch to the next room when your hero walks off the edge of the current screen.",
      whatItDoes: "Designates which sprite is the player. When this sprite reaches the boundary of the current tilemap, the extension automatically loads the neighboring map.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The player sprite whose movement triggers map transitions." },
      ],
      example: `let hero = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(hero)
overworld.setPlayerSprite(hero)`,
    },
    {
      slug: "current-location",
      title: "overworld location",
      blockId: "overworld_currentLocation",
      blockString: "overworld location $property",
      group: "Load",
      weight: 100,
      problem: "You want to show a mini-map coordinate or trigger a boss fight only when the player enters room (2, 3) on the world grid.",
      whatItDoes: "Returns the current column or row index of the active tilemap in the overworld grid.",
      parameters: [
        { name: "property", type: "LocationProperty", meaning: "Choose Column or Row to get that coordinate." },
      ],
      returns: { type: "number", meaning: "The 0-indexed column or row number of the current room." },
      example: `let col = overworld.currentLocation(overworld.LocationProperty.Column)
let row = overworld.currentLocation(overworld.LocationProperty.Row)
game.splash("Room: " + col + ", " + row)`,
    },
    {
      slug: "load-map",
      title: "load overworld map",
      blockId: "overworld_loadMap",
      blockString: "load overworld map at col $column row $row",
      group: "Load",
      weight: 90,
      problem: "You want to teleport the player directly to a secret dungeon room or start the game at a specific grid coordinate.",
      whatItDoes: "Loads the tilemap at the specified column and row coordinates in the overworld grid. Does nothing if continuous mode is enabled or if no map exists at that coordinate.",
      parameters: [
        { name: "column", type: "number", meaning: "The column index in the overworld grid (starts at 0)." },
        { name: "row", type: "number", meaning: "The row index in the overworld grid (starts at 0)." },
      ],
      example: "overworld.loadMap(0, 0)",
    },
    {
      slug: "load-map-in-direction",
      title: "load overworld map in direction",
      blockId: "overworld_loadMapInDirection",
      blockString: "load overworld map in direction $direction",
      group: "Load",
      weight: 80,
      problem: "You want the player to step through a teleporter or press a switch that moves them directly to the room to the right.",
      whatItDoes: "Loads the adjacent tilemap in the specified collision direction (Top, Right, Bottom, or Left) relative to the current room.",
      parameters: [
        { name: "direction", type: "CollisionDirection", meaning: "The direction to move on the grid (Top, Right, Bottom, or Left)." },
      ],
      example: `controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    overworld.loadMapInDirection(CollisionDirection.Right)
})`,
    },
    {
      slug: "get-map-at",
      title: "get overworld map at",
      blockId: "overworld_getMapAt",
      blockString: "get overworld map at col $column row $row",
      group: "Load",
      weight: 70,
      problem: "You want to inspect or modify the tilemap data of another room before the player actually travels there.",
      whatItDoes: "Returns the tilemap data located at the given column and row in the overworld grid, or undefined if the slot is empty.",
      parameters: [
        { name: "column", type: "number", meaning: "The column index of the target tilemap." },
        { name: "row", type: "number", meaning: "The row index of the target tilemap." },
      ],
      returns: { type: "tiles.TileMapData", meaning: "The tilemap data at that coordinate, or undefined." },
      example: `let targetMap = overworld.getMapAt(1, 0)
if (targetMap) {
    game.splash("Map found!")
}`,
    },
    {
      slug: "get-map-in-direction",
      title: "get overworld map in direction",
      blockId: "overworld_getMapInDirection",
      blockString: "get overworld map in direction $direction",
      group: "Load",
      weight: 60,
      problem: "You want to check the layout of the adjacent room before unlocking a door to make sure a room actually exists there.",
      whatItDoes: "Returns the tilemap data of the neighbor room in the specified direction from the current room.",
      parameters: [
        { name: "direction", type: "CollisionDirection", meaning: "The direction of the adjacent room (Top, Right, Bottom, or Left)." },
      ],
      returns: { type: "tiles.TileMapData", meaning: "The adjacent tilemap data, or undefined if outside the grid." },
      example: `let northMap = overworld.getMapInDirection(CollisionDirection.Top)
if (northMap) {
    game.splash("Path north is open!")
}`,
    },
    {
      slug: "map-exists-at",
      title: "overworld map exists at",
      blockId: "overworld_mapExistsAt",
      blockString: "overworld map exists at col $column row $row",
      group: "Load",
      weight: 50,
      problem: "You have an uneven map layout with blank areas and want to make sure a room exists at (col, row) before trying to load it.",
      whatItDoes: "Returns true if a valid tilemap is assigned to the given column and row coordinates in the grid, and false otherwise.",
      parameters: [
        { name: "column", type: "number", meaning: "The column coordinate to check." },
        { name: "row", type: "number", meaning: "The row coordinate to check." },
      ],
      returns: { type: "boolean", meaning: "true if a tilemap exists at that coordinate; otherwise false." },
      example: `if (overworld.mapExistsAt(2, 1)) {
    overworld.loadMap(2, 1)
}`,
    },
    {
      slug: "map-exists-in-direction",
      title: "overworld map exists in direction",
      blockId: "overworld_mapExistsInDirection",
      blockString: "overworld map exists in direction $direction",
      group: "Load",
      weight: 40,
      problem: "You want to show a warning on the screen when the player is walking toward the edge of the world where no more rooms exist.",
      whatItDoes: "Returns true if an adjacent tilemap exists in the given direction from the current room, or false if the player has reached the outer boundary.",
      parameters: [
        { name: "direction", type: "CollisionDirection", meaning: "The direction to check (Top, Right, Bottom, or Left)." },
      ],
      returns: { type: "boolean", meaning: "true if a map exists in that direction; otherwise false." },
      example: `if (!overworld.mapExistsInDirection(CollisionDirection.Right)) {
    game.splash("End of the world!")
}`,
    },
    {
      slug: "on-map-loaded",
      title: "on map loaded",
      blockId: "overworld_onMapLoaded",
      blockString: "on map loaded at $overworldColumn $overworldRow $map",
      group: "Load",
      weight: 30,
      problem: "You want to spawn monsters, place treasure chests, and clear old enemies every time the player enters a new room.",
      whatItDoes: "Runs an event handler whenever a new tilemap is loaded, providing the new grid column, row, and tilemap data.",
      parameters: [
        { name: "handler", type: "(overworldColumn: number, overworldRow: number, map: tiles.TileMapData) => void", meaning: "The callback function to run with overworldColumn, overworldRow, and map parameters." },
      ],
      example: `overworld.onMapLoaded(function (col, row, map) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Enemy)
    let enemy = sprites.create(img\`.\`, SpriteKind.Enemy)
    tiles.placeOnRandomTile(enemy, sprites.dungeon.floorLight0)
})`,
    },
    {
      slug: "set-animation-type",
      title: "overworld set animation type",
      blockId: "overworld_setAnimationType",
      blockString: "overworld set animation type $animationType",
      group: "Animation",
      weight: 100,
      problem: "You want screen transitions to feel smooth with a classic screen push or a fade effect when walking into another room.",
      whatItDoes: "Sets the transition animation style used when moving between rooms (None, Scroll, FadeToWhite, FadeToBlack, or FadeToColor).",
      parameters: [
        { name: "animationType", type: "AnimationType", meaning: "The animation style: None, Scroll, FadeToWhite, FadeToBlack, or FadeToColor." },
      ],
      example: "overworld.setAnimationType(overworld.AnimationType.Scroll)",
    },
    {
      slug: "set-animation-duration",
      title: "overworld set animation duration",
      blockId: "overworld_setAnimationDuration",
      blockString: "overworld set animation duration $duration",
      group: "Animation",
      weight: 90,
      problem: "Your screen transition animations feel too fast or too slow for the pacing of your game.",
      whatItDoes: "Sets how long the room transition animation takes in milliseconds. Only works when animation type is not None.",
      parameters: [
        { name: "duration", type: "number", meaning: "Animation duration in milliseconds (e.g. 500 for half a second)." },
      ],
      example: `overworld.setAnimationType(overworld.AnimationType.Scroll)
overworld.setAnimationDuration(500)`,
    },
    {
      slug: "set-animation-timing-function",
      title: "overworld set animation timing function",
      blockId: "overworld_setAnimationTimingFunction",
      blockString: "overworld set animation timing function $func",
      group: "Animation",
      weight: 80,
      problem: "You want the room scrolling animation to start slow and speed up smoothly instead of moving at a flat, constant speed.",
      whatItDoes: "Sets the easing curve used for transitions (such as Linear, EaseIn, EaseOut, or EaseInOut) to give animations a natural feel.",
      parameters: [
        { name: "func", type: "TimingFunction", meaning: "The easing function to use (e.g. Linear, EaseInOut, EaseInExponential)." },
      ],
      example: "overworld.setAnimationTimingFunction(overworld.TimingFunction.EaseInOut)",
    },
    {
      slug: "set-animation-fade-color",
      title: "overworld set animation custom fade color",
      blockId: "overworld_setAnimationFadeColor",
      blockString: "overworld set animation custom fade color $color",
      group: "Animation",
      weight: 70,
      problem: "You want screen transitions to fade through a spooky crimson red or magical purple when entering a dungeon.",
      whatItDoes: "Sets the custom color used when the animation type is set to FadeToColor. Accepts a hex color string like '#ff0000'.",
      parameters: [
        { name: "color", type: "string", default: "#000000", meaning: "Hex color code string (e.g. '#ff0000' for red)." },
      ],
      example: `overworld.setAnimationType(overworld.AnimationType.FadeToColor)
overworld.setAnimationFadeColor("#ff0055")`,
    },
    {
      slug: "set-scroll-animation-z-index",
      title: "overworld set scroll animation z",
      blockId: "overworld_setScrollAnimationZIndex",
      blockString: "overworld set scroll animation z $z",
      group: "Animation",
      weight: 70,
      problem: "Your custom UI elements or dialog boxes are getting swept away by the scroll animation when changing rooms.",
      whatItDoes: "Sets the Z-index depth at which the scrolling transition renders. Sprites with a higher Z-index will remain visible on top without scrolling.",
      parameters: [
        { name: "z", type: "number", default: "99", meaning: "The Z depth layer for the scroll transition (default is 99)." },
      ],
      example: "overworld.setScrollAnimationZIndex(50)",
    },
    {
      slug: "set-map-transitions-enabled",
      title: "set overworld transitions enabled",
      blockId: "overworld_setMapTransitionsEnabled",
      blockString: "set overworld transitions enabled $enabled",
      group: "Options",
      weight: 100,
      problem: "You want to lock the player inside a boss room during combat so they cannot run away to another screen.",
      whatItDoes: "Enables or disables automatic map transitions. When set to false, moving to the edge of the tilemap will not switch rooms.",
      parameters: [
        { name: "enabled", type: "boolean", meaning: "true to allow map switching, false to lock the player in the current map." },
      ],
      example: "overworld.setMapTransitionsEnabled(false)",
    },
    {
      slug: "set-map-transition-radius",
      title: "set overworld transition radius",
      blockId: "overworld_setMapTransitionRadius",
      blockString: "set overworld transition radius $radius",
      group: "Options",
      weight: 90,
      problem: "The screen switches rooms too early before your character even reaches the edge of the display.",
      whatItDoes: "Sets how close in pixels the player sprite needs to be to the tilemap edge (while moving toward it) before triggering a room switch.",
      parameters: [
        { name: "radius", type: "number", meaning: "Distance in pixels from the map edge that triggers a transition (minimum 1)." },
      ],
      example: "overworld.setMapTransitionRadius(8)",
    },
    {
      slug: "set-walls-block-transitions",
      title: "set walls block map transitions",
      blockId: "overworld_setWallsBlockTransitions",
      blockString: "set walls block map transitions $blockEnabled",
      group: "Options",
      weight: 80,
      problem: "You want to prevent the player from walking into a neighboring room if that room's entry edge is blocked by solid wall tiles.",
      whatItDoes: "When enabled, stops map transitions from happening unless the player sprite can actually fit in the destination room without overlapping walls.",
      parameters: [
        { name: "blockEnabled", type: "boolean", meaning: "true to block transitions into walls; false to allow automatic repositioning." },
      ],
      example: "overworld.setWallsBlockTransitions(true)",
    },
    {
      slug: "set-continuous-mode-enabled",
      title: "set continuous mode enabled",
      blockId: "overworld_setContinuousModeEnabled",
      blockString: "set continuous mode enabled $enabled",
      group: "Options",
      weight: 70,
      problem: "You want to stitch all of your tilemaps into one giant seamless scrolling open world instead of separate rooms.",
      whatItDoes: "Merges all tilemaps in the overworld grid into one huge continuous tilemap. All tilemaps must have identical dimensions and tile scale.",
      parameters: [
        { name: "enabled", type: "boolean", meaning: "true to merge maps into one continuous world; false for room-by-room transitions." },
      ],
      example: "overworld.setContinuousModeEnabled(true)",
    },
    {
      slug: "create-map-16",
      title: "create map 16",
      blockId: "overworld_createMap16",
      blockString: "$row0 $row1 $row2|| $row3 $row4 $row5",
      group: "Shadows",
      weight: 0,
      problem: "You want to visually build a 2D overworld grid using rows of 16x16 tilemaps in block mode.",
      whatItDoes: "Combines multiple map rows of 16x16 tilemaps into a full 2D overworld grid array.",
      parameters: [
        { name: "row0", type: "tiles.TileMapData[]", meaning: "First row of tilemaps." },
        { name: "row1", type: "tiles.TileMapData[]", meaning: "Second row of tilemaps." },
        { name: "row2", type: "tiles.TileMapData[]", meaning: "Third row of tilemaps." },
        { name: "row3", type: "tiles.TileMapData[]", meaning: "Optional fourth row of tilemaps." },
        { name: "row4", type: "tiles.TileMapData[]", meaning: "Optional fifth row of tilemaps." },
        { name: "row5", type: "tiles.TileMapData[]", meaning: "Optional sixth row of tilemaps." },
      ],
      returns: { type: "tiles.TileMapData[][]", meaning: "A 2D array of tilemaps ready for setOverworld16." },
      example: `let worldGrid = overworld.createMap16(
    overworld.mapRow16(tilemap\`level1\`, tilemap\`level2\`),
    overworld.mapRow16(tilemap\`level3\`, tilemap\`level4\`)
)
overworld.setOverworld16(worldGrid)`,
    },
    {
      slug: "create-map-8",
      title: "create map 8",
      blockId: "overworld_createMap8",
      blockString: "$row0 $row1 $row2|| $row3 $row4 $row5",
      group: "Shadows",
      weight: 0,
      problem: "You want to combine multiple rows of 8x8 tilemaps into a structured grid for an 8-bit style game.",
      whatItDoes: "Combines multiple map rows of 8x8 tilemaps into a full 2D overworld grid array.",
      parameters: [
        { name: "row0", type: "tiles.TileMapData[]", meaning: "First row of 8x8 tilemaps." },
        { name: "row1", type: "tiles.TileMapData[]", meaning: "Second row of 8x8 tilemaps." },
        { name: "row2", type: "tiles.TileMapData[]", meaning: "Third row of 8x8 tilemaps." },
        { name: "row3", type: "tiles.TileMapData[]", meaning: "Optional fourth row of 8x8 tilemaps." },
        { name: "row4", type: "tiles.TileMapData[]", meaning: "Optional fifth row of 8x8 tilemaps." },
        { name: "row5", type: "tiles.TileMapData[]", meaning: "Optional sixth row of 8x8 tilemaps." },
      ],
      returns: { type: "tiles.TileMapData[][]", meaning: "A 2D array of tilemaps ready for setOverworld8." },
      example: `let worldGrid = overworld.createMap8(
    overworld.mapRow8(tilemap\`level1\`, tilemap\`level2\`)
)
overworld.setOverworld8(worldGrid)`,
    },
    {
      slug: "map-row-16",
      title: "map row 16",
      blockId: "overworld_mapRow16",
      blockString: "$map0 $map1 $map2|| $map3 $map4 $map5",
      group: "Shadows",
      weight: 0,
      problem: "You need to group several individual 16x16 tilemaps horizontally into a single row before assembling your world.",
      whatItDoes: "Takes up to 6 individual 16x16 tilemaps and bundles them into an array representing one row of the overworld grid.",
      parameters: [
        { name: "map0", type: "tiles.TileMapData", meaning: "Tilemap at column 0 in this row." },
        { name: "map1", type: "tiles.TileMapData", meaning: "Tilemap at column 1 in this row." },
        { name: "map2", type: "tiles.TileMapData", meaning: "Tilemap at column 2 in this row." },
        { name: "map3", type: "tiles.TileMapData", meaning: "Optional tilemap at column 3." },
        { name: "map4", type: "tiles.TileMapData", meaning: "Optional tilemap at column 4." },
        { name: "map5", type: "tiles.TileMapData", meaning: "Optional tilemap at column 5." },
      ],
      returns: { type: "tiles.TileMapData[]", meaning: "An array of tilemaps representing a single row." },
      example: "let row = overworld.mapRow16(tilemap`level1`, tilemap`level2`)",
    },
    {
      slug: "map-row-8",
      title: "map row 8",
      blockId: "overworld_mapRow8",
      blockString: "$map0 $map1 $map2|| $map3 $map4 $map5",
      group: "Shadows",
      weight: 0,
      problem: "You need to group several 8x8 tilemaps horizontally side-by-side into a single row for your 8-bit overworld.",
      whatItDoes: "Takes up to 6 individual 8x8 tilemaps and bundles them into an array representing one row of the overworld grid.",
      parameters: [
        { name: "map0", type: "tiles.TileMapData", meaning: "Tilemap at column 0 in this row." },
        { name: "map1", type: "tiles.TileMapData", meaning: "Tilemap at column 1 in this row." },
        { name: "map2", type: "tiles.TileMapData", meaning: "Tilemap at column 2 in this row." },
        { name: "map3", type: "tiles.TileMapData", meaning: "Optional tilemap at column 3." },
        { name: "map4", type: "tiles.TileMapData", meaning: "Optional tilemap at column 4." },
        { name: "map5", type: "tiles.TileMapData", meaning: "Optional tilemap at column 5." },
      ],
      returns: { type: "tiles.TileMapData[]", meaning: "An array of 8x8 tilemaps representing a single row." },
      example: "let row = overworld.mapRow8(tilemap`level1`, tilemap`level2`)",
    },
    {
      slug: "tilemap-8",
      title: "tilemap 8",
      blockId: "overworld_tilemap8",
      blockString: "8 $tilemap",
      group: "Tilemaps",
      weight: 49,
      problem: "You need an 8x8 tilemap block inside your overworld row builder.",
      whatItDoes: "Shadow block helper that opens the tilemap editor configured for 8x8 tiles and returns the tilemap data.",
      parameters: [
        { name: "tilemap", type: "tiles.TileMapData", meaning: "The 8x8 tilemap asset created in the editor." },
      ],
      returns: { type: "tiles.TileMapData", meaning: "The tilemap data." },
      example: "let map = overworld.tilemap8(tilemap`level1`)",
    },
    {
      slug: "tilemap-16",
      title: "tilemap 16",
      blockId: "overworld_tilemap16",
      blockString: "16 $tilemap",
      group: "Tilemaps",
      weight: 49,
      problem: "You need a standard 16x16 tilemap block inside your overworld row builder.",
      whatItDoes: "Shadow block helper that opens the tilemap editor configured for 16x16 tiles and returns the tilemap data.",
      parameters: [
        { name: "tilemap", type: "tiles.TileMapData", meaning: "The 16x16 tilemap asset created in the editor." },
      ],
      returns: { type: "tiles.TileMapData", meaning: "The tilemap data." },
      example: "let map = overworld.tilemap16(tilemap`level1`)",
    }
  ],
};
