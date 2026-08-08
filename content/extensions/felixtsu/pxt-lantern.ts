import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtLantern: ExtensionDoc = {
  owner: "felixtsu",
  repo: "pxt-lantern",
  displayName: "Lantern & Multi-Lighting",
  packageSlug: "github:felixtsu/pxt-lantern",
  description: "Add dark atmospheric dungeons, glowing torch circles, flickering lanterns, and directed flashlight beams to your MakeCode Arcade games.",
  tools: [
    {
      slug: "start-lantern-effect",
      title: "start lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You are making a dark dungeon exploration game and want the screen darkened except for a warm, glowing ring of light that follows your player character.",
      whatItDoes: "Turns on a single lantern screen effect anchored to a target sprite. Darkens the surrounding screen while illuminating a flickering circular area around the anchor sprite.",
      parameters: [
        { name: "anchor", type: "Sprite", default: "mySprite", meaning: "The sprite that carries the lantern light." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
lantern.startLanternEffect(player)`,
    },
    {
      slug: "stop-lantern-effect",
      title: "stop lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "Your player exits a dark cave into daylight, and you need to clear the darkness and extinguish the lantern glowing effect.",
      whatItDoes: "Stops the single lantern lighting effect and restores standard full screen illumination.",
      parameters: [],
      example: "lantern.stopLanternEffect()",
    },
    {
      slug: "set-light-band-width",
      title: "set light band width",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want your player's lantern flame to grow wider when picking up oil or shrink as fuel runs out.",
      whatItDoes: "Sets the width of the concentric light bands surrounding the lantern anchor sprite, expanding or shrinking the illuminated area.",
      parameters: [
        { name: "width", type: "number", default: "13", meaning: "The thickness of each glowing band surrounding the lantern." },
      ],
      example: "lantern.setLightBandWidth(20)",
    },
    {
      slug: "set-breathing-enabled",
      title: "set breathing enabled",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want an electric battery light that shines with constant brightness instead of a flickering fire light that expands and pulses.",
      whatItDoes: "Turns the pulsing flicker animation (breathing effect) of the single lantern light source on or off.",
      parameters: [
        { name: "enabled", type: "boolean", default: "true", meaning: "Set to true to animate a flickering fire effect, or false for steady lighting." },
      ],
      example: "lantern.setBreathingEnabled(false)",
    },
    {
      slug: "toggle-lighting",
      title: "toggle lighting",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You are building a game with multiple light sources (like wall torches and flashlight beams) and need to turn the dark world effect on or off.",
      whatItDoes: "Enables or disables the multi-light darkness system across the entire screen.",
      parameters: [
        { name: "on", type: "boolean", default: "true", meaning: "Set to true to enable multi-light screen darkness, or false to reveal the full screen." },
      ],
      example: "multilights.toggleLighting(true)",
    },
    {
      slug: "band-width-of",
      title: "band width of",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You have a small torch sprite and a giant campfire sprite in the same dark level, and need to change the size of the torch's light circle independently.",
      whatItDoes: "Adjusts the light band thickness for a specific sprite's attached light source.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose light size you want to adjust." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The thickness of the glowing light rings around this sprite." },
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
      problem: "An enemy holding a torch is defeated or a light bulb breaks, and you need to extinguish its circle of light.",
      whatItDoes: "Removes the circular light source associated with a sprite so it no longer casts light in dark areas.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite whose light source should be removed." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addLightSource(torch)
multilights.removeLightSource(torch)`,
    },
    {
      slug: "add-light-source",
      title: "add light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want multiple torches, glowing crystals, or player characters to each cast a ring of light in a dark map.",
      whatItDoes: "Attaches a circular point light to a sprite. The light automatically tracks and moves with the sprite.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that emits light." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The radius multiplier for the circular glowing rings." },
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
      problem: "You want a night watchman or player character to project a directional cone of light ahead of them like a flashlight beam.",
      whatItDoes: "Attaches a directional flashlight cone light to a sprite, specifying its pointing angle, reach distance, spread angle, and edge width.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite holding the flashlight." },
        { name: "direction", type: "number", default: "0", meaning: "The aiming direction in degrees (0 to 360) for the light beam." },
        { name: "lightRange", type: "number", default: "32", meaning: "The distance in pixels the light cone reaches." },
        { name: "angleRange", type: "number", default: "30", meaning: "The spread width of the flashlight cone in degrees." },
        { name: "bandWidth", type: "number", default: "5", meaning: "The thickness quality of the flashlight beam edge." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
multilights.toggleLighting(true)
multilights.addFlashLightSource(player, 0, 48, 45, 5)`,
    },
    {
      slug: "flashlight-source-attached-to",
      title: "flashlight source attached to",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "You want your player to sweep their flashlight around using controller buttons or aim it toward where they walk.",
      whatItDoes: "Retrieves the flashlight object attached to a sprite so you can update its direction, range, or cone angle during gameplay.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite carrying the flashlight." },
      ],
      returns: { type: "lightsource.FlashlightLightSource", meaning: "The flashlight light source object bound to the sprite." },
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
multilights.addFlashLightSource(player, 0, 32, 30)
let flash = multilights.flashlightSourceAttachedTo(player)
flash.direction = 90`,
    }
  ],
};
