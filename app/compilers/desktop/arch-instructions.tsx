"use client";

import { ARCADE_DOCS_URL } from "../compiler-tools";

export interface ArchInstructionsProps {
  arch: "x86-64" | "arm64" | "win64";
}

function NativeDocLinks() {
  const docs = [
    { label: "Multi-Native Arcade", page: "multi-native-arcade" },
    { label: "Native Application Single-Game", page: "single-native-arcade" },
  ];
  return (
    <>
      {docs.map((doc, i) => (
        <span key={doc.page}>
          {i > 0 && " or "}
          <a
            href={`${ARCADE_DOCS_URL}/${doc.page}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-makecode-cyan hover:underline"
          >
            {doc.label}
          </a>
        </span>
      ))}
    </>
  );
}

export default function ArchInstructions({ arch }: ArchInstructionsProps) {
  if (arch === "arm64") {
    return (
      <p className="mt-1 font-sans text-sm text-makecode-tan">
        Extract the downloaded .tar.gz onto a 64-bit ARM Linux board (Raspberry
        Pi 3, Pi Zero 2 W, etc.), or drop it on a USB stick for a Creation
        Station Arcade cabinet. Setup guides:{" "}
        <NativeDocLinks />.
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
      For an x86 arcade cabinet, see the setup guides: <NativeDocLinks />.
      Otherwise extract the downloaded .tar.gz, then run ./Game in the extracted folder.
      Keep Game and libpxt.so in the same directory. On a desktop Linux system
      with X11 or Wayland, double-clicking or running ./Game from a terminal
      should start the game.
    </p>
  );
}
