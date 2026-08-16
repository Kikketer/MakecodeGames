import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeCameraOffset: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-camera-offset",
  displayName: "Camera Offset",
  packageSlug: "github:riknoll/arcade-camera-offset",
  description: "Customizes camera tracking in MakeCode Arcade by letting the camera follow a sprite with horizontal and vertical pixel offsets.",
  tools: [
    {
      slug: "camera-follow-sprite-with-offset-x-offset-y",
      title: "camera follow sprite with offset x offset y",
      blockId: "riknoll_camera_follow_with_offset",
      blockString: "camera follow sprite $sprite with offset x $offsetx offset y $offsety",
      group: "Camera",
      weight: 0,
      problem: "You want the camera to look ahead of your running player or keep the character near the bottom of the screen instead of locked dead center.",
      whatItDoes: "Makes the camera track a target sprite while shifting the focus by a fixed number of pixels horizontally and vertically instead of centering directly on the sprite.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite for the camera to follow." },
        { name: "offsetx", type: "number", default: "0", meaning: "Horizontal shift in pixels (positive shifts the camera right, negative shifts it left)." },
        { name: "offsety", type: "number", default: "0", meaning: "Vertical shift in pixels (positive shifts the camera down, negative shifts it up)." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(mySprite)
cameraOffsetScene.cameraFollowWithOffset(mySprite, 20, -10)`,
    }
  ],
};
