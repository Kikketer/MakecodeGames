import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtLantern: ExtensionDoc = {
  owner: "felixtsu",
  repo: "pxt-lantern",
  displayName: "Lantern",
  packageSlug: "github:felixtsu/pxt-lantern",
  description: "Create dark levels with dynamic lighting effects like circular lanterns, glowing torches, and directional flashlights.",
  tools: [
    {
      slug: "start-lantern-effect",
      title: "start lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You are making a spooky dungeon game and want the screen to be pitch black except for a glowing circle of light centered on the player.",
      whatItDoes: "Turns on the single-lantern darkness effect and anchors the glowing circle of light to follow a specified sprite.",
      parameters: [
        { name: "anchor", type: "Sprite", default: "mySprite", meaning: "The sprite that the center of the lantern light will follow." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(player)
lantern.startLanternEffect(player)`,
    },
    {
      slug: "stop-lantern-effect",
      title: "stop lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "Your player stepped out of a dark cave into the sunny outdoors and you need to remove the darkness effect completely.",
      whatItDoes: "Turns off the single-lantern lighting effect and restores normal full-screen visibility.",
      parameters: [],
      example: "lantern.stopLanternEffect()",
    },
    {
      slug: "set-light-band-width",
      title: "set light band width",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "Your player collected a torch upgrade and you want their lantern circle to cast light much further across the screen.",
      whatItDoes: "Sets the thickness of the concentric light rings for the single lantern effect, making the illuminated area larger or smaller.",
      parameters: [
        { name: "width", type: "number", default: "13", meaning: "The width in pixels of each light ring (larger numbers make a bigger overall light circle)." },
      ],
      example: "lantern.setLightBandWidth(20)",
    },
    {
      slug: "set-breathing-enabled",
      title: "set breathing enabled",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want the lantern light to gently pulse and flicker to make a spooky scene feel alive, or turn off pulsing for steady lighting.",
      whatItDoes: "Enables or disables the pulsating 'breathing' animation that causes the lantern radius to expand and contract smoothly over time.",
      parameters: [
        { name: "enabled", type: "boolean", default: "true", meaning: "True to make the light pulse like a flickering flame, or false for steady light." },
      ],
      example: "lantern.setBreathingEnabled(true)",
    },
    {
      slug: "toggle-lighting",
      title: "toggle lighting",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You have multiple light sources like torches and campfires in a room, and you need to turn on the multi-light darkness system.",
      whatItDoes: "Enables or disables the multi-light screen effect where several sprites can cast light into darkness at the same time.",
      parameters: [
        { name: "on", type: "boolean", default: "true", meaning: "True to activate darkness and multi-light rendering, false to turn it off." },
      ],
      example: "multilights.toggleLighting(true)",
    },
    {
      slug: "band-width-of",
      title: "band width of",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "A bonfire sprite in your scene needs a much wider glow radius than a tiny handheld candle sprite.",
      whatItDoes: "Changes the light radius and band thickness for a specific sprite that already has a circle light attached in the multi-light system.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose light size you want to adjust." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The new thickness in pixels of the light bands." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addLightSource(torch, 4)
multilights.bandWidthOf(torch, 10)`,
    },
    {
      slug: "remove-light-source",
      title: "remove light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "A torch burned out or an enemy carrying a lantern was defeated, so you need that sprite to stop emitting light.",
      whatItDoes: "Removes a sprite from the multi-light system so it no longer casts light on the screen.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that should stop casting light." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addLightSource(torch, 6)
multilights.removeLightSource(torch)`,
    },
    {
      slug: "add-light-source",
      title: "add light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want the player, stationary torches, and glowing gems to each cast their own circular ring of light in a dark room.",
      whatItDoes: "Attaches a circular light source to a sprite in the multi-light system with a specified glow size.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that will emit circular light." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The width of the light bands, controlling how far the glow reaches." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
multilights.toggleLighting(true)
multilights.addLightSource(player, 6)`,
    },
    {
      slug: "add-flash-light-source",
      title: "add flash light source",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "Your player is searching an abandoned house with a flashlight that should only reveal what is directly in the direction they are facing.",
      whatItDoes: "Attaches a directional cone of light to a sprite in the multi-light system, controlling its angle, direction, and beam range.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite holding the flashlight." },
        { name: "direction", type: "number", default: "0", meaning: "The aiming angle in degrees (0 is right, 90 is down, 180 is left, 270 is up)." },
        { name: "lightRange", type: "number", default: "32", meaning: "How far forward the flashlight beam reaches in pixels." },
        { name: "angleRange", type: "number", default: "30", meaning: "How wide the flashlight beam spread is in degrees." },
        { name: "bandWidth", type: "number", default: "5", meaning: "The softness and edge width of the light beam." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
multilights.toggleLighting(true)
multilights.addFlashLightSource(player, 0, 48, 40, 5)`,
    },
    {
      slug: "flashlight-source-attached-to",
      title: "flashlight source attached to",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "Your player changed walking directions and you need to update the flashlight's aim angle so the beam points wherever the player moves.",
      whatItDoes: "Gets the flashlight object attached to a sprite so you can read or modify its direction, lightRange, and angleRange properties.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose attached flashlight you want to access." },
      ],
      returns: { type: "lightsource.FlashlightLightSource", meaning: "The flashlight object attached to the sprite, allowing you to update its direction or range." },
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addFlashLightSource(player, 0, 48, 40, 5)
let flash = multilights.flashlightSourceAttachedTo(player)
flash.direction = 180`,
    }
  ],
};
