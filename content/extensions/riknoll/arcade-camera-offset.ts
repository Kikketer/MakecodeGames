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
      problem: "You want the camera to follow your player, but shifted to the side or higher up so players can see ahead of themselves or see platforms above them.",
      whatItDoes: "Makes the game camera follow a target sprite while keeping it shifted by a specific number of pixels horizontally and vertically from the sprite's position.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that the camera will track." },
        { name: "offsetx", type: "number", default: "", meaning: "Horizontal offset in pixels from the sprite center (positive moves camera right, negative moves left)." },
        { name: "offsety", type: "number", default: "", meaning: "Vertical offset in pixels from the sprite center (positive moves camera down, negative moves up)." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(mySprite)
cameraOffsetScene.cameraFollowWithOffset(mySprite, 20, -10)`,
    }
  ],
};
