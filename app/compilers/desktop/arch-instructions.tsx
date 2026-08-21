"use client";

export interface ArchInstructionsProps {
  arch: "x86-64" | "arm64" | "win64";
}

export default function ArchInstructions({ arch }: ArchInstructionsProps) {
  if (arch === "arm64") {
    return (
      <p className="mt-1 font-sans text-sm text-makecode-tan">
        Extract the downloaded .tar.gz onto a 64-bit ARM Linux board (Raspberry
        Pi 3/4/5, Pi Zero 2 W, etc.). To turn it into a single-game arcade
        machine with USB joysticks, use the CreationStationArcade
        single-native-arcade branch:{" "}
        <a
          href="https://github.com/Kikketer/CreationStationArcade/tree/single-native-arcade"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-makecode-cyan hover:underline"
        >
          https://github.com/Kikketer/CreationStationArcade/tree/single-native-arcade
        </a>
        . It sets up boot-to-game, keeps Game and libpxt.so together, and
        configures KMSDRM/ALSA for the native SDL binary.
      </p>
    );
  }

  if (arch === "win64") {
    return (
      <p className="mt-1 font-sans text-sm text-makecode-tan">
        Extract the downloaded .zip, keep Game.exe and pxt.dll in the same
        folder, then run Game.exe.
      </p>
    );
  }

  return (
    <p className="mt-1 font-sans text-sm text-makecode-tan">
      Extract the downloaded .tar.gz, then run ./Game in the extracted folder.
      Keep Game and libpxt.so in the same directory. On a desktop Linux system
      with X11 or Wayland, double-clicking or running ./Game from a terminal
      should start the game.
    </p>
  );
}
