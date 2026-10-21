import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeCameraOffset: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-camera-offset",
  displayName: "Camera Offset",
  packageSlug: "github:riknoll/arcade-camera-offset",
  description: "Lets the game camera follow a sprite with a custom horizontal and vertical pixel offset so players can see ahead.",
  tools: [
    {
      slug: "camera-follow-sprite-with-offset-x-offset-y",
      title: "camera follow sprite with offset x offset y",
      blockId: "riknoll_camera_follow_with_offset",
      blockString: "camera follow sprite $sprite with offset x $offsetx offset y $offsety",
      group: "Camera",
      weight: 0,
      problem: "You want the player to see further ahead when moving across a platformer level instead of always being trapped dead in the center of the screen.",
      whatItDoes: "Positions the camera to track a sprite with a specified horizontal and vertical pixel offset from the sprite's center.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite the camera will follow." },
        { name: "offsetx", type: "number", meaning: "The horizontal pixel offset from the sprite (positive shifts the camera right)." },
        { name: "offsety", type: "number", meaning: "The vertical pixel offset from the sprite (positive shifts the camera down)." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(mySprite)
cameraOffsetScene.cameraFollowWithOffset(mySprite, 30, -20)`,
    }
  ],
};
