import type { ExtensionDoc } from "@/content/extensions/types";

export const pxtLantern: ExtensionDoc = {
  owner: "felixtsu",
  repo: "pxt-lantern",
  displayName: "Lantern",
  packageSlug: "github:felixtsu/pxt-lantern",
  description: "Add dynamic dark lighting effects, glowing lanterns, torches, and directional flashlights to your MakeCode Arcade games.",
  tools: [
    {
      slug: "start-lantern-effect",
      title: "start lantern effect",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You are making a dark cave or dungeon level where only a glowing lantern centered on your player lets you see nearby walls and enemies.",
      whatItDoes: "Darkens the rest of the screen and creates a single glowing, pulsing light ring anchored to a chosen sprite.",
      parameters: [
        { name: "anchor", type: "Sprite", meaning: "The sprite that holds the glowing lantern light." },
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
      problem: "You want to turn off the dark lantern effect when the player walks into a brightly lit room or steps outside into daylight.",
      whatItDoes: "Stops the lantern screen darkness effect and returns full visibility to the screen.",
      parameters: [],
      example: "lantern.stopLanternEffect()",
    },
    {
      slug: "set-light-band-width",
      title: "set light band width",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want your single lantern light to cast a wider glow for a large torch or a tighter ring for a weak candle.",
      whatItDoes: "Adjusts the thickness of the light bands that surround the single lantern anchor sprite.",
      parameters: [
        { name: "width", type: "number", meaning: "The width of each light band ring in pixels." },
      ],
      example: "lantern.setLightBandWidth(20)",
    },
    {
      slug: "set-breathing-enabled",
      title: "set breathing enabled",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want to stop the flickering, pulsing animation of the lantern so the light remains steady.",
      whatItDoes: "Enables or disables the pulsing 'breathing' animation of the single lantern light effect.",
      parameters: [
        { name: "enabled", type: "boolean", meaning: "True to turn on light pulsing, or false to keep the lantern light constant." },
      ],
      example: "lantern.setBreathingEnabled(false)",
    },
    {
      slug: "toggle-lighting",
      title: "toggle lighting",
      blockString: "true",
      group: "General",
      weight: 0,
      problem: "You want to enable a darkness system where multiple sprites (torches, fireballs, or players) can produce independent lights at the same time.",
      whatItDoes: "Turns the multi-light darkness system on or off for the entire screen.",
      parameters: [
        { name: "on", type: "boolean", meaning: "True to activate multi-light darkness, or false to turn it off." },
      ],
      example: "lantern.toggleLighting(true)",
    },
    {
      slug: "band-width-of",
      title: "band width of",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You have a large campfire sprite that needs a wider circle of light than a smaller torch sprite.",
      whatItDoes: "Changes the size of the light ring for a specific sprite that already has a light source attached.",
      parameters: [
        { name: "sprite", type: "Sprite", meaning: "The sprite whose light radius you want to change." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The light band thickness for this sprite." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Item)
lantern.addLightSource(torch)
lantern.bandWidthOf(torch, 8)`,
    },
    {
      slug: "remove-light-source",
      title: "remove light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want a torch to extinguish when the player collects it or puts it out in water.",
      whatItDoes: "Removes the light source from a sprite so it no longer glows in the darkness.",
      parameters: [
        { name: "sprite", type: "Sprite", meaning: "The sprite that should stop glowing." },
      ],
      example: `let torch = sprites.create(img\`.\`, SpriteKind.Item)
lantern.addLightSource(torch)
lantern.removeLightSource(torch)`,
    },
    {
      slug: "add-light-source",
      title: "add light source",
      blockString: "true",
      group: "Circlelight",
      weight: 0,
      problem: "You want multiple objects on screen, like torches or collectibles, to glow in the dark.",
      whatItDoes: "Attaches a circular light source to a sprite so it cuts through darkness when multi-light screen lighting is enabled.",
      parameters: [
        { name: "sprite", type: "Sprite", meaning: "The sprite that will produce light." },
        { name: "bandWidth", type: "number", default: "4", meaning: "The width of the light bands around this sprite." },
      ],
      example: `let hero = sprites.create(img\`.\`, SpriteKind.Player)
lantern.toggleLighting(true)
lantern.addLightSource(hero, 6)`,
    },
    {
      slug: "add-flash-light-source",
      title: "add flash light source",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "You are building a night stealth game where the hero holds a flashlight that shoots a cone beam in the direction they are facing.",
      whatItDoes: "Attaches a directional flashlight cone to a sprite, controlling direction, reach, and spread angle.",
      parameters: [
        { name: "sprite", type: "Sprite", meaning: "The sprite holding the flashlight." },
        { name: "direction", type: "number", default: "0", meaning: "The angle in degrees (0 to 360) where the flashlight points." },
        { name: "lightRange", type: "number", default: "32", meaning: "How far in pixels the flashlight beam shines." },
        { name: "angleRange", type: "number", default: "30", meaning: "The cone spread width in degrees." },
        { name: "bandWidth", type: "number", default: "5", meaning: "The edge softness of the light beam." },
      ],
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
lantern.toggleLighting(true)
lantern.addFlashLightSource(player, 90, 50, 45)`,
    },
    {
      slug: "flashlight-source-attached-to",
      title: "flashlight source attached to",
      blockString: "true",
      group: "Flashlight",
      weight: 0,
      problem: "You need to adjust or read properties like direction or light range on a player's flashlight while the game is running.",
      whatItDoes: "Returns the flashlight object connected to a sprite so you can update its settings in code.",
      parameters: [
        { name: "sprite", type: "Sprite", meaning: "The sprite with the flashlight attached." },
      ],
      returns: { type: "lightsource.FlashlightLightSource", meaning: "The flashlight light source object attached to the sprite." },
      example: `let player = sprites.create(img\`.\`, SpriteKind.Player)
lantern.addFlashLightSource(player, 0, 40, 30)
let fl = lantern.flashlightSourceAttachedTo(player)`,
    }
  ],
};
