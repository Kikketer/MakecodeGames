import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtLantern: ExtensionDoc = {
  owner: "felixtsu",
  repo: "pxt-lantern",
  displayName: "Lantern Lighting Effects",
  packageSlug: "github:felixtsu/pxt-lantern",
  description: "Add dark dungeon lighting, flickering lantern circles, multiple light sources, and directional flashlights to MakeCode Arcade games.",
  tools: [
    {
      slug: "start-lantern-effect",
      title: "start lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want to create a spooky dark cave or horror game where the entire screen is pitch black except for a glowing circle of light around the player.",
      whatItDoes: "Turns on a single-player lantern lighting effect anchored to the specified sprite. Areas outside the light are darkened with gradient color bands.",
      parameters: [
        { name: "anchor", type: "Sprite", default: "mySprite", meaning: "The sprite that the center of the lantern light follows." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(mySprite)
lantern.startLanternEffect(mySprite)`,
    },
    {
      slug: "stop-lantern-effect",
      title: "stop lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want the lights to turn back on when the player steps out of a dark dungeon and into the bright outdoor overworld.",
      whatItDoes: "Disables the single-anchor lantern effect and restores normal full-screen visibility.",
      parameters: [],
      example: "lantern.stopLanternEffect()",
    },
    {
      slug: "set-light-band-width",
      title: "set light band width",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want to increase the lantern's brightness radius when the player collects a torch power-up, or shrink it when their battery gets low.",
      whatItDoes: "Sets the thickness of the concentric shading bands around the lantern, changing the overall size of the visible circle.",
      parameters: [
        { name: "width", type: "number", default: "13", meaning: "The width in pixels of each light ring gradient." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
lantern.startLanternEffect(mySprite)
lantern.setLightBandWidth(20)`,
    },
    {
      slug: "set-breathing-enabled",
      title: "set breathing enabled",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want to turn off the pulsing lantern flicker effect if you want a completely steady, motionless light source.",
      whatItDoes: "Enables or disables the animated breathing/flickering effect that causes the lantern radius to expand and contract over time.",
      parameters: [
        { name: "enabled", type: "boolean", default: "true", meaning: "true to make the lantern pulse and flicker, false for a steady light." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
lantern.startLanternEffect(mySprite)
lantern.setBreathingEnabled(false)`,
    },
    {
      slug: "toggle-lighting",
      title: "toggle lighting",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You have multiple torches, campfires, and enemies holding lights in a dark room and need to enable the multi-light rendering engine.",
      whatItDoes: "Turns the multi-light screen darkness effect on or off. When enabled, all added light sources and flashlights illuminate the darkness.",
      parameters: [
        { name: "on", type: "boolean", default: "true", meaning: "true to turn on darkness and multi-light rendering, false to disable it." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addLightSource(player, 6)
multilights.toggleLighting(true)`,
    },
    {
      slug: "band-width-of",
      title: "band width of",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want a specific campfire sprite to cast a larger glow than a small candle carried by the player.",
      whatItDoes: "Updates the light radius and band thickness for an existing light source attached to a sprite.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose light source radius you want to change." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The width of each light ring in pixels." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addLightSource(torch, 4)
multilights.bandWidthOf(torch, 8)`,
    },
    {
      slug: "remove-light-source",
      title: "remove light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want a torch to go out when it gets extinguished with water, returning the area around it to total darkness.",
      whatItDoes: "Removes the light source attached to the given sprite so it no longer casts light on the multi-light screen.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose light source should be removed." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Food)
multilights.addLightSource(torch, 6)
multilights.removeLightSource(torch)`,
    },
    {
      slug: "add-light-source",
      title: "add light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want to place stationary lamps or attach glowing auras to enemies so they illuminate dark hallways.",
      whatItDoes: "Attaches a circular multi-layer light source to a sprite. The light automatically tracks the sprite's position and is cleaned up if the sprite is destroyed.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will emit circular light." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The size/thickness of the concentric light bands in pixels." },
      ],
      example: `let hero = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addLightSource(hero, 5)
multilights.toggleLighting(true)`,
    },
    {
      slug: "add-flash-light-source",
      title: "add flash light source",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "You are making a survival game where the player holds a flashlight that only illuminates a cone in front of them.",
      whatItDoes: "Attaches a directional flashlight cone of light to a sprite with customizable angle width, pointing direction, and reach distance.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite holding the flashlight." },
        { name: "direction", type: "number", default: "0", meaning: "The angle in degrees the flashlight is aiming toward (0 = right, 90 = down, 180 = left, 270 = up)." },
        { name: "lightRange", type: "number", default: "32", meaning: "How far the beam reaches in pixels." },
        { name: "angleRange", type: "number", default: "30", meaning: "The spread of the light cone in degrees." },
        { name: "bandWidth", type: "number", default: "5", meaning: "Thickness factor for the light edges." },
      ],
      example: `let hero = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addFlashLightSource(hero, 0, 48, 45, 5)
multilights.toggleLighting(true)`,
    },
    {
      slug: "flashlight-source-attached-to",
      title: "flashlight source attached to",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "You want the player's flashlight beam to rotate as they move left, right, up, or down with the arrow keys.",
      whatItDoes: "Retrieves the FlashlightLightSource object attached to a sprite so you can dynamically adjust properties like direction, range, and angle spread in game loops.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite with an attached flashlight." },
      ],
      returns: { type: "lightsource.FlashlightLightSource", meaning: "The flashlight object attached to the sprite, or undefined if none exists." },
      example: `let hero = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addFlashLightSource(hero, 0, 40, 30, 5)
let flash = multilights.flashlightSourceAttachedTo(hero)
flash.direction = 90`,
    }
  ],
};
