import type { ExtensionDoc } from "@/content/extensions/types";

const spriteSetup = `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
let myEnemy = sprites.create(img\`.\`, SpriteKind.Enemy)`;

export const arcadeSpriteUtil: ExtensionDoc = {
  owner: "jwunderl",
  repo: "arcade-sprite-util",
  displayName: "Sprite Utils",
  packageSlug: "github:jwunderl/arcade-sprite-util",
  description:
    "A grab-bag of sprite math and rendering helpers for MakeCode Arcade: distances, angles, movement, timers, and simple drawing.",
  tools: [
    {
      slug: "is-destroyed",
      title: "is destroyed",
      blockId: "spriteutilextisdestroyed",
      blockString: "$sprite is destroyed",
      group: "Sprite",
      weight: 100,
      problem:
        "You saved a reference to a sprite (like an enemy or a bullet), but later code might run after that sprite has already been destroyed, and touching a destroyed sprite can crash your game.",
      whatItDoes:
        "Checks whether a sprite no longer exists or has already been destroyed, so you can safely skip code that would otherwise touch it.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check." },
      ],
      returns: { type: "boolean", meaning: "true if the sprite is missing or destroyed." },
      example: `${spriteSetup}
if (spriteutils.isDestroyed(myEnemy)) {
    console.log("enemy is gone")
}`,
    },
    {
      slug: "distance-between",
      title: "distance between",
      blockId: "spriteutilextdistbw",
      blockString: "distance between $a and $b",
      group: "Sprite",
      weight: 90,
      problem:
        "You need to know how far away an enemy, power-up, or another sprite is from the player before doing something—playing a sound, firing a projectile, or ending the game.",
      whatItDoes:
        "Returns the distance in pixels between the centers of two sprites, points, or tile locations. If either sprite is missing or destroyed, it returns 0.",
      parameters: [
        { name: "a", type: "Sprite / Location / Point", default: "mySprite", meaning: "First point to measure from" },
        { name: "b", type: "Sprite / Location / Point", default: "myEnemy", meaning: "Second point to measure to" },
      ],
      returns: { type: "number", meaning: "The distance in pixels." },
      example: `${spriteSetup}
let distance = spriteutils.distanceBetween(mySprite, myEnemy)
console.log(distance)`,
    },
    {
      slug: "angle-from",
      title: "angle from",
      blockId: "spriteutilextanglebw",
      blockString: "angle from $a to $b",
      group: "Sprite",
      weight: 80,
      problem:
        "You want an enemy to face or move toward the player, but you only have the two sprites' positions, not the direction between them.",
      whatItDoes:
        "Returns the angle, in radians, pointing from one sprite, point, or tile location to another. If either is missing, it returns 0.",
      parameters: [
        { name: "a", type: "Sprite / Location / Point", default: "mySprite", meaning: "Starting point" },
        { name: "b", type: "Sprite / Location / Point", default: "myEnemy", meaning: "Target point" },
      ],
      returns: { type: "number", meaning: "The angle in radians from a to b." },
      example: `${spriteSetup}
let angle = spriteutils.angleFrom(mySprite, myEnemy)
console.log(angle)`,
    },
    {
      slug: "place-angle-from",
      title: "place angle from",
      blockId: "spriteutilextplaceanglefrom",
      blockString: "place $spriteToMove angle $angleInRadians distance $distance from $fromSprite",
      group: "Sprite",
      weight: 70,
      problem:
        "You want to drop a sprite at an exact spot relative to another sprite—like spawning an orbiting shield a fixed distance from the player at a specific angle.",
      whatItDoes:
        "Moves spriteToMove so it sits a given distance away from fromSprite, at the given angle in radians.",
      parameters: [
        { name: "spriteToMove", type: "Sprite", default: "myEnemy", meaning: "The sprite to reposition" },
        { name: "angleInRadians", type: "number", meaning: "The angle away from fromSprite" },
        { name: "distance", type: "number", meaning: "How far away to place spriteToMove, in pixels" },
        { name: "fromSprite", type: "Sprite / Location / Point", default: "mySprite", meaning: "The sprite to measure from" },
      ],
      example: `${spriteSetup}
spriteutils.placeAngleFrom(myEnemy, Math.PI / 2, 40, mySprite)`,
    },
    {
      slug: "set-velocity-at-angle",
      title: "set velocity at angle",
      blockId: "spriteutilextsetspeedanglefrom",
      blockString: "set $target velocity at angle $angleInRadians speed $speed",
      group: "Sprite",
      weight: 60,
      problem:
        "You know the direction and speed you want a sprite to move in, but Arcade's built-in blocks only let you set vx and vy separately.",
      whatItDoes:
        "Sets a sprite's velocity so it moves at the given speed in the given direction (an angle in radians).",
      parameters: [
        { name: "target", type: "Sprite", default: "mySprite", meaning: "The sprite to move" },
        { name: "angleInRadians", type: "number", meaning: "The direction of travel" },
        { name: "speed", type: "number", meaning: "How fast to move, in pixels per second" },
      ],
      example: `${spriteSetup}
spriteutils.setVelocityAtAngle(mySprite, spriteutils.angleFrom(mySprite, myEnemy), 100)`,
    },
    {
      slug: "heading",
      title: "velocity angle",
      blockId: "spriteutilheading",
      blockString: "$sprite velocity angle",
      group: "Sprite",
      weight: 75,
      problem:
        "You want to rotate a sprite's image to face the direction it's actually moving, but you only have its velocity.",
      whatItDoes: "Returns the angle of a sprite's current movement, in radians.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check" },
      ],
      returns: { type: "number", meaning: "The angle of movement in radians." },
      example: `${spriteSetup}
let direction = spriteutils.heading(mySprite)
console.log(direction)`,
    },
    {
      slug: "speed",
      title: "speed",
      blockId: "spriteutilspeed",
      blockString: "$sprite speed",
      group: "Sprite",
      weight: 73,
      problem:
        "You want to know how fast a sprite is currently moving overall, not just its horizontal or vertical velocity.",
      whatItDoes: "Returns a sprite's scalar speed in pixels per second, combining its vx and vy.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to check" },
      ],
      returns: { type: "number", meaning: "The speed in pixels per second." },
      example: `${spriteSetup}
let currentSpeed = spriteutils.speed(mySprite)
console.log(currentSpeed)`,
    },
    {
      slug: "move-to",
      title: "move to",
      blockId: "spriteutilmoveto",
      blockString: "$sprite move to $location over $time ms||and pause $doPause",
      group: "Sprite",
      weight: 55,
      problem:
        "You want a sprite to glide smoothly to a specific spot over a set amount of time, without hand-writing timers or velocity math.",
      whatItDoes:
        "Moves a sprite to a location (a sprite, point, or tile location) over the given number of milliseconds. Optionally pauses your code until the move finishes. Only works for sprites without acceleration or friction.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to move" },
        { name: "location", type: "Sprite / Location / Point", meaning: "Where to move it to" },
        { name: "time", type: "number", default: "100", meaning: "How long the move should take, in ms" },
        { name: "doPause", type: "boolean", default: "false", meaning: "Optionally wait for the move to finish before continuing" },
      ],
      example: `${spriteSetup}
spriteutils.moveTo(mySprite, spriteutils.point(80, 60), 1000)`,
    },
    {
      slug: "move-to-at-speed",
      title: "move to at speed",
      blockId: "spriteutilmovetoatspeed",
      blockString: "$sprite move to $location at speed $speed||and pause $doPause",
      group: "Sprite",
      weight: 53,
      problem:
        "You know how fast you want a sprite to travel, but not how long the trip should take, so `move to` isn't the right fit.",
      whatItDoes:
        "Moves a sprite to a location (a sprite, point, or tile location) at a fixed speed. Optionally pauses your code until the move finishes. Only works for sprites without acceleration or friction.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to move" },
        { name: "location", type: "Sprite / Location / Point", meaning: "Where to move it to" },
        { name: "speed", type: "number", default: "100", meaning: "How fast to travel, in pixels per second" },
        { name: "doPause", type: "boolean", default: "false", meaning: "Optionally wait for the move to finish before continuing" },
      ],
      example: `${spriteSetup}
spriteutils.moveToAtSpeed(mySprite, spriteutils.point(80, 60), 100)`,
    },
    {
      slug: "get-sprites-within",
      title: "get sprites of kind within distance",
      blockString: "get all sprites of kind $kind within $distance pixels from $sprite",
      group: "Sprite",
      weight: 85,
      problem:
        "You need to find every enemy (or coin, or bullet) near the player—for example to check which ones are in range of an area attack.",
      whatItDoes:
        "Returns every sprite of a given kind within the given distance of a sprite, point, or tile location, sorted from nearest to farthest.",
      parameters: [
        { name: "kind", type: "Sprite kind", meaning: "The kind of sprite to search for" },
        { name: "distance", type: "number", default: "50", meaning: "The search radius, in pixels" },
        { name: "sprite", type: "Sprite / Location / Point", default: "mySprite", meaning: "The center of the search" },
      ],
      returns: { type: "Sprite[]", meaning: "The matching sprites, nearest first." },
      example: `${spriteSetup}
let nearby = spriteutils.getSpritesWithin(SpriteKind.Enemy, 50, mySprite)
console.log(nearby.length)`,
    },
    {
      slug: "jump-impulse",
      title: "jump impulse",
      blockId: "spriteutiljumpimpulse",
      blockString: "make $sprite jump $pixels pixels",
      group: "Sprite",
      weight: 70,
      problem:
        "You want a platformer jump that reaches roughly the same height no matter how strong gravity is set to, instead of guessing a velocity by trial and error.",
      whatItDoes:
        "Gives a sprite an instant upward velocity, calculated from its current gravity (acceleration y), so it jumps to approximately the given height in pixels.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to make jump" },
        { name: "pixels", type: "number", default: "34", meaning: "The approximate jump height" },
      ],
      example: `${spriteSetup}
mySprite.ay = 200
spriteutils.jumpImpulse(mySprite, 34)`,
    },
    {
      slug: "transform-sprite-image",
      title: "apply transform to sprite image",
      blockId: "spriteutiltransformspriteimage",
      blockString: "apply $transform to $sprite image",
      group: "Sprite",
      weight: 40,
      problem:
        "You want to flip or rotate a sprite's image—for example to face the other direction—without redrawing it by hand.",
      whatItDoes:
        "Flips or rotates a sprite's current image in place: horizontal flip, vertical flip, or a 90/180/270 degree clockwise rotation.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite to transform" },
        { name: "transform", type: "ImageTransform", meaning: "flip horizontal, flip vertical, or rotate 90/180/270 degrees clockwise" },
      ],
      example: `${spriteSetup}
spriteutils.transformSpriteImage(mySprite, spriteutils.ImageTransform.FlipHorizontal)`,
    },
    {
      slug: "on-sprite-update-interval",
      title: "on sprite update interval",
      blockId: "spriteutilonspriteupdateinterval",
      blockString: "on $target update $sprite every $interval ms",
      group: "Sprite",
      weight: 4,
      problem:
        "You want a sprite to do something repeatedly—like fire a projectile or check its health—without cluttering the main game update loop with your own timer.",
      whatItDoes:
        "Runs your code for a specific sprite on a repeating interval, in milliseconds.",
      parameters: [
        { name: "target", type: "Sprite", default: "mySprite", meaning: "The sprite to run the handler for" },
        { name: "interval", type: "number", default: "500", meaning: "How often to run, in ms" },
      ],
      example: `${spriteSetup}
spriteutils.onSpriteUpdateInterval(mySprite, 500, function (sprite) {
    console.log("tick")
})`,
    },
    {
      slug: "on-sprite-kind-update-interval",
      title: "on sprite kind update interval",
      blockId: "spriteutilonspritekindupdateinterval",
      blockString: "on $sprite of kind $kind update every $interval ms",
      group: "Sprite",
      weight: 9,
      problem:
        "You want every enemy on screen to do something on a regular timer—like sync animations or take periodic damage—without writing a per-sprite timer for each one.",
      whatItDoes:
        "Runs your code for every sprite of a given kind on a repeating interval, in milliseconds.",
      parameters: [
        { name: "kind", type: "Sprite kind", meaning: "The kind of sprite to run the handler for" },
        { name: "interval", type: "number", default: "500", meaning: "How often to run, in ms" },
      ],
      example: `spriteutils.onSpriteKindUpdateInterval(SpriteKind.Enemy, 500, function (sprite) {
    console.log("tick")
})`,
    },
    {
      slug: "radians-to-degrees",
      title: "radians to degrees",
      blockId: "spriteutilextradtodeg",
      blockString: "convert $asRadians radians to degrees",
      group: "General",
      weight: 80,
      problem:
        "Arcade's math blocks work in radians, but degrees are usually easier for students to reason about when describing an angle.",
      whatItDoes: "Converts a number from radians to degrees.",
      parameters: [
        { name: "asRadians", type: "number", meaning: "The angle in radians" },
      ],
      returns: { type: "number", meaning: "The angle in degrees." },
      example: `let degrees = spriteutils.radiansToDegrees(Math.PI)
console.log(degrees)`,
    },
    {
      slug: "degrees-to-radians",
      title: "degrees to radians",
      blockId: "spriteutilextdegtorad",
      blockString: "convert $asDegrees degrees to radians",
      group: "General",
      weight: 80,
      problem:
        "You want to think in degrees, but blocks like `angle from` or `set velocity at angle` need radians.",
      whatItDoes: "Converts a number from degrees to radians.",
      parameters: [
        { name: "asDegrees", type: "number", meaning: "The angle in degrees" },
      ],
      returns: { type: "number", meaning: "The angle in radians." },
      example: `let radians = spriteutils.degreesToRadians(180)
console.log(radians)`,
    },
    {
      slug: "create-renderable",
      title: "render on z-index",
      blockId: "spriteutilextcreaterenderable",
      blockString: "render on z-index $index to $screen",
      group: "General",
      weight: 70,
      problem:
        "You want to draw something custom on the screen every frame—like a health bar or a minimap—layered correctly with sprites and backgrounds.",
      whatItDoes:
        "Registers a function that draws onto the screen image every frame, at the given z-index (layering order).",
      parameters: [
        { name: "index", type: "number", meaning: "The z-index to draw at" },
      ],
      example: `spriteutils.createRenderable(scene.HUD_Z, function (screen) {
    screen.print("HP: 100", 4, 4)
})`,
    },
    {
      slug: "draw-transparent-image",
      title: "draw transparent image",
      blockId: "spriteutilextdrawtransparentimg",
      blockString: "draw $src to $to at x $x y $y",
      group: "General",
      weight: 65,
      problem:
        "You want to stamp one image onto another (like an icon onto the screen) without the source image's background color covering what's underneath.",
      whatItDoes:
        "Draws src onto to, treating the source's transparent pixels as transparent, with its top-left corner at (x, y).",
      parameters: [
        { name: "src", type: "Image", meaning: "The image to draw" },
        { name: "to", type: "Image", default: "myImage", meaning: "The image to draw onto" },
        { name: "x", type: "number", meaning: "Left position" },
        { name: "y", type: "number", meaning: "Top position" },
      ],
      example: `let myImage = image.create(160, 120)
spriteutils.drawTransparentImage(img\`.\`, myImage, 10, 10)`,
    },
    {
      slug: "draw-circle",
      title: "draw circle",
      blockId: "spriteutilextdrawcircle",
      blockString: "draw circle in $to at cx $cx cy $cy radius $r color $col",
      group: "General",
      weight: 64,
      problem:
        "You want to draw a circle outline—for a radar ping, a target reticle, or a simple UI element—without doing the math yourself.",
      whatItDoes: "Draws the outline of a circle onto an image at the given center and radius.",
      parameters: [
        { name: "to", type: "Image", default: "myImage", meaning: "The image to draw onto" },
        { name: "cx", type: "number", default: "80", meaning: "Center x (0-160)" },
        { name: "cy", type: "number", default: "60", meaning: "Center y (0-120)" },
        { name: "r", type: "number", default: "5", meaning: "Radius (0-40)" },
        { name: "col", type: "color index", default: "3", meaning: "The color to draw with" },
      ],
      example: `let myImage = image.create(160, 120)
spriteutils.drawCircle(myImage, 80, 60, 5, 3)`,
    },
    {
      slug: "fill-circle",
      title: "fill circle",
      blockId: "spriteutilextdrawfilledcircle",
      blockString: "fill circle in $to at cx $cx cy $cy radius $r color $col",
      group: "General",
      weight: 63,
      problem:
        "You want a solid, filled circle—for example to represent an explosion, a shield, or a highlighted area—instead of just an outline.",
      whatItDoes: "Draws a filled circle onto an image at the given center and radius.",
      parameters: [
        { name: "to", type: "Image", default: "myImage", meaning: "The image to draw onto" },
        { name: "cx", type: "number", default: "80", meaning: "Center x (0-160)" },
        { name: "cy", type: "number", default: "60", meaning: "Center y (0-120)" },
        { name: "r", type: "number", default: "5", meaning: "Radius (0-40)" },
        { name: "col", type: "color index", default: "3", meaning: "The color to fill with" },
      ],
      example: `let myImage = image.create(160, 120)
spriteutils.fillCircle(myImage, 80, 60, 5, 3)`,
    },
    {
      slug: "set-console-overlay",
      title: "console overlay",
      blockId: "spriteutilextsetconsolevisible",
      blockString: "console overlay $on",
      group: "General",
      weight: 60,
      problem:
        "You're using console.log to debug your game, but the console output isn't visible on the game screen itself.",
      whatItDoes: "Turns the on-screen console overlay on or off.",
      parameters: [
        { name: "on", type: "boolean", meaning: "Whether the overlay should be visible" },
      ],
      example: `spriteutils.setConsoleOverlay(true)
console.log("hello!")`,
    },
    {
      slug: "set-life-image",
      title: "set life image",
      blockId: "spriteutilextsetlifeimage",
      blockString: "set life image $im",
      group: "General",
      weight: 55,
      problem:
        "The default heart icon for the life counter doesn't fit your game's theme, and you want a custom icon instead.",
      whatItDoes: "Sets the icon used by the built-in life/health display.",
      parameters: [
        { name: "im", type: "Image", meaning: "The icon to use for each life" },
      ],
      example: `spriteutils.setLifeImage(img\`.\`)`,
    },
    {
      slug: "round-with-precision",
      title: "round with precision",
      blockId: "spriteutilextroundwithprecision",
      blockString: "round $x to $digitsAfterDecimal decimal places",
      group: "General",
      weight: 50,
      problem:
        "You want to show a score or measurement with a fixed number of decimal places (like \"3.14\") instead of a long, messy decimal.",
      whatItDoes: "Rounds a number to a given number of digits after the decimal point and returns it as text.",
      parameters: [
        { name: "x", type: "number", default: "3.14159", meaning: "The number to round" },
        { name: "digitsAfterDecimal", type: "number", default: "2", meaning: "How many decimal digits to keep" },
      ],
      returns: { type: "string", meaning: "The rounded value, formatted with the requested number of digits." },
      example: `let rounded = spriteutils.roundWithPrecision(3.14159, 2)
console.log(rounded)`,
    },
    {
      slug: "add-event-handler",
      title: "run code before/after engine step",
      blockId: "spriteutiladdeventhandler",
      blockString: "run code $modifier game engine $priority",
      group: "General",
      weight: 10,
      problem:
        "You need your code to run at a precise point in Arcade's frame—right before physics runs, or right after sprites render—rather than whenever `game.onUpdate` happens to fire.",
      whatItDoes:
        "Registers code to run immediately before or after one of the engine's built-in update steps (like physics or rendering).",
      parameters: [
        { name: "modifier", type: "UpdatePriorityModifier", meaning: "before or after" },
        { name: "priority", type: "UpdatePriority", meaning: "Which engine step to hook into (e.g. physics, rendering sprites)" },
      ],
      example: `spriteutils.addEventHandler(spriteutils.UpdatePriorityModifier.After, spriteutils.UpdatePriority.Physics, function () {
    console.log("physics just ran")
})`,
    },
    {
      slug: "consts",
      title: "math constant",
      blockId: "spriteutilmathconsts",
      blockString: "$constType",
      group: "General",
      weight: 10,
      problem:
        "You need a mathematical constant like π or e in a calculation without typing out a long decimal from memory.",
      whatItDoes: "Returns a common mathematical constant: NaN, π, e, LN2, LN10, √1/2, or √2.",
      parameters: [
        { name: "constType", type: "Consts", meaning: "Which constant to return" },
      ],
      returns: { type: "number", meaning: "The value of the selected constant." },
      example: `let pi = spriteutils.consts(spriteutils.Consts.Pi)
console.log(pi)`,
    },
    {
      slug: "null-consts",
      title: "null-like constant",
      blockId: "spriteutilnullconsts",
      blockString: "$constType",
      group: "General",
      weight: 10,
      problem:
        "Blocks don't normally have a way to produce the special values `undefined` or `null` directly.",
      whatItDoes: "Returns either `undefined` or `null`, for the rare cases blocks-only projects need one of these values.",
      parameters: [
        { name: "constType", type: "NullConsts", meaning: "undefined or null" },
      ],
      returns: { type: "undefined", meaning: "The selected null-like value." },
      example: `let nothing = spriteutils.nullConsts(spriteutils.NullConsts.Undefined)
console.log(nothing)`,
    },
    {
      slug: "point",
      title: "point (x, y)",
      blockId: "spriteutilpoint",
      blockString: "x $x y $y",
      group: "General",
      weight: 1,
      problem:
        "Several blocks in this extension (like `move to` or `place angle from`) need a plain location, not a sprite, but Arcade doesn't have a simple built-in \"point\" value.",
      whatItDoes: "Creates a reusable point value at the given x, y coordinates.",
      parameters: [
        { name: "x", type: "number", meaning: "X coordinate" },
        { name: "y", type: "number", meaning: "Y coordinate" },
      ],
      returns: { type: "util.Point", meaning: "A point that can be used anywhere a location is expected." },
      example: `let target = spriteutils.point(80, 60)
console.log(target.x)`,
    },
    {
      slug: "pos",
      title: "x, y (deprecated)",
      blockId: "spriteutilpos",
      blockString: "x $x y $y",
      group: "General",
      weight: 1,
      deprecated: true,
      problem: "Older projects used `pos` to create a location value.",
      whatItDoes:
        "Deprecated. Creates a location value at the given x, y coordinates. Use `point` instead for new projects.",
      parameters: [
        { name: "x", type: "number", meaning: "X coordinate" },
        { name: "y", type: "number", meaning: "Y coordinate" },
      ],
      returns: { type: "Position", meaning: "A location value (extends util.Point)." },
      example: `let target = spriteutils.point(80, 60)
console.log(target.x)`,
    },
  ],
};
