import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeCameraOffset: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-camera-offset",
  displayName: "Camera Offset",
  packageSlug: "github:riknoll/arcade-camera-offset",
  description: "Allows the scene camera to follow a sprite with a custom horizontal and vertical pixel offset.",
  tools: [
    {
      slug: "camera-follow-sprite-with-offset",
      title: "camera follow sprite with offset",
      blockId: "riknoll_camera_follow_with_offset",
      blockString: "camera follow sprite $sprite with offset x $offsetx offset y $offsety",
      group: "Camera",
      weight: 0,
      problem: "You want the camera to follow your player, but offset slightly to one side so players can see obstacles further ahead or make room for on-screen user interfaces.",
      whatItDoes: "Makes the game camera follow a sprite while keeping it shifted by a specific number of pixels horizontally and vertically.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that the camera should track." },
        { name: "offsetx", type: "number", meaning: "The horizontal pixel offset (positive shifts the camera right, negative shifts it left)." },
        { name: "offsety", type: "number", meaning: "The vertical pixel offset (positive shifts the camera down, negative shifts it up)." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(mySprite)
cameraOffsetScene.cameraFollowWithOffset(mySprite, 30, -10)`,
    }
  ],
};
