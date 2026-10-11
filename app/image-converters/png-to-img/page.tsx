import type { Metadata } from "next";
import Link from "next/link";
import PngToImgConverter from "./png-to-img-converter";

export const metadata: Metadata = {
  title: "PNG → MakeCode Image — MakeCode Games",
  description:
    "Convert a PNG into MakeCode Arcade img literals and .jres entries for use in Visual Studio Code.",
};

export default function PngToImgPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/image-converters"
            className="font-sans text-sm font-bold text-makecode-cyan hover:underline"
          >
            ← All image converters
          </Link>
          <h1 className="mt-2 font-sans text-2xl font-bold text-makecode-yellow">
            PNG → MakeCode Image
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Convert a PNG into MakeCode Arcade{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              img
            </code>{" "}
            literals and{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              .jres
            </code>{" "}
            entries for use in Visual Studio Code.
          </p>
        </div>
        <PngToImgConverter />
      </div>
    </main>
  );
}
