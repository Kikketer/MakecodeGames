import type { Metadata } from "next";
import Link from "next/link";
import JsCompiler from "./js-compiler";

export const metadata: Metadata = {
  title: "PNG → Game.js Compiler — MakeCode Games",
  description: "Convert a MakeCode Arcade PNG export to a standalone JavaScript game file.",
};

export const maxDuration = 300;

export default function PngToJsPage() {
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
            PNG → Game.js Compiler
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Upload a MakeCode Arcade PNG export to generate a standalone
            JavaScript game file.
          </p>
        </div>
        <JsCompiler />
      </div>
    </main>
  );
}
