import type { ExtensionDoc } from "@/content/extensions/types";

export const arcadeCameraOffset: ExtensionDoc = {
  owner: "riknoll",
  repo: "arcade-camera-offset",
  displayName: "Camera Offset",
  packageSlug: "github:riknoll/arcade-camera-offset",
  description: "Customize how the camera follows sprites in MakeCode Arcade by adding horizontal and vertical offsets.",
  tools: [
    {
      slug: "camera-follow-sprite-with-offset-x-offset-y",
      title: "camera follow sprite with offset x offset y",
      blockId: "riknoll_camera_follow_with_offset",
      blockString: "camera follow sprite $sprite with offset x $offsetx offset y $offsety",
      group: "Camera",
      weight: 0,
      problem: "You want the camera to follow your player, but you want them positioned off-center so players can see further ahead in a platformer or racing game.",
      whatItDoes: "Makes the game camera follow a sprite while applying a horizontal (X) and vertical (Y) pixel offset instead of locking directly to the center of the screen.",
      parameters: [
        { name: "sprite", type: "Sprite", default: "mySprite", meaning: "The sprite that the camera will track." },
        { name: "offsetx", type: "number", default: "0", meaning: "The horizontal distance in pixels to shift the camera focus from the sprite center (positive moves focus right, negative moves left)." },
        { name: "offsety", type: "number", default: "0", meaning: "The vertical distance in pixels to shift the camera focus from the sprite center (positive moves focus down, negative moves up)." },
      ],
      example: `let mySprite = sprites.create(img\`.\`, SpriteKind.Player)
controller.moveSprite(mySprite)
cameraOffsetScene.cameraFollowWithOffset(mySprite, 20, 0)`,
    }
  ],
};
