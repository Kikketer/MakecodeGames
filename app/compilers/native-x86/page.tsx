import type { Metadata } from "next";
import Link from "next/link";
import NativeCompilerPage from "../_native/native-compiler-page";

export const metadata: Metadata = {
  title: "PNG → x86 Native — MakeCode Games",
  description:
    "Convert a MakeCode Arcade PNG export to a native Linux x86-64 executable for Native-flavor arcade cabinets.",
};

// Native builds on the ingest box can take several minutes.
export const maxDuration = 300;

export default function Page() {
  return (
    <NativeCompilerPage arch="x86-64" title="PNG to x86 Native">
      <p>
        Builds a native <span className="font-bold">Linux x86-64</span> (Intel/AMD) <code>Game</code> executable for Native-flavor arcade cabinets. On x86 hardware the Chromium setup (<Link href="/compilers/png-to-js" className="font-bold text-makecode-cyan hover:underline">PNG to JS</Link>) usually runs games faster.
      </p>
    </NativeCompilerPage>
  );
}
