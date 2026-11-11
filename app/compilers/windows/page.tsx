import type { Metadata } from "next";
import Link from "next/link";
import NativeCompilerPage from "../_native/native-compiler-page";

export const metadata: Metadata = {
  title: "PNG → Windows EXE — MakeCode Games",
  description:
    "Convert a MakeCode Arcade PNG export to a Windows Game.exe you can unzip and double-click.",
};

// Native builds on the ingest box can take several minutes.
export const maxDuration = 300;

export default function Page() {
  return (
    <NativeCompilerPage arch="win64" title="PNG to EXE (Windows)">
      <p>
        Builds a <span className="font-bold">Windows</span> <code>Game.exe</code> for playing or sharing a game on a regular Windows PC. There is{" "}
            <span className="font-bold text-makecode-pink">no macOS support</span>
            {" "}— Mac users should use{" "}
            <Link
              href="/compilers/png-to-js"
              className="font-bold text-makecode-cyan hover:underline"
            >
              PNG to JS
            </Link>{" "}
            and run the game in a browser.
      </p>
    </NativeCompilerPage>
  );
}
