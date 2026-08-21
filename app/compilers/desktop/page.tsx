import type { Metadata } from "next";
import Link from "next/link";
import NativeCompiler from "./native-compiler";

export const metadata: Metadata = {
  title: "PNG → Native Executable — MakeCode Games",
  description: "Convert a MakeCode Arcade PNG export to a standalone native executable.",
};

// Native builds on the Chromebook (4 GB RAM) can take several minutes.
export const maxDuration = 300;

export default function DesktopPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/compilers"
            className="font-sans text-sm font-bold text-makecode-cyan hover:underline"
          >
            ← All compilers
          </Link>
          <h1 className="mt-2 font-sans text-2xl font-bold text-makecode-yellow">
            PNG → Native Executable
          </h1>
        </div>
        <NativeCompiler />
      </div>
    </main>
  );
}
