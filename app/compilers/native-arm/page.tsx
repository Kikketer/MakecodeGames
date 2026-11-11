import type { Metadata } from "next";
import NativeCompilerPage from "../_native/native-compiler-page";

export const metadata: Metadata = {
  title: "PNG → ARM Native — MakeCode Games",
  description:
    "Convert a MakeCode Arcade PNG export to a native Linux ARM64 executable for Raspberry Pi 3 / Pi Zero 2 W arcade cabinets.",
};

// Native builds on the ingest box can take several minutes.
export const maxDuration = 300;

export default function Page() {
  return (
    <NativeCompilerPage arch="arm64" title="PNG to ARM Native (Raspberry Pi 3 or less)">
      <p>
        Builds a native <span className="font-bold">Linux ARM64</span> <code>Game</code> executable for Native-flavor arcade cabinets on a Raspberry Pi 3, Pi Zero 2 W, or similar low-powered board. Needs a 64-bit OS.
      </p>
    </NativeCompilerPage>
  );
}
