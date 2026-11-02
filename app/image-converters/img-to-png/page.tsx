import type { Metadata } from "next";
import Link from "next/link";
import ImgToPngConverter from "./img-to-png-converter";

export const metadata: Metadata = {
  title: "img → PNG — MakeCode Games",
  description:
    "Convert a MakeCode Arcade img`…` literal into a downloadable PNG, with a selectable palette and live pixel preview.",
};

export default function ImgToPngPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/image-converters"
            className="font-sans text-sm font-bold text-makecode-cyan hover:underline"
          >
            ← Back to converters
          </Link>
          <h1 className="mt-2 font-sans text-3xl font-extrabold tracking-tight text-makecode-yellow">
            img to PNG
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Paste a MakeCode Arcade{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              img`…`
            </code>{" "}
            literal, pick a palette, and download the rendered PNG.
          </p>
        </div>
        <ImgToPngConverter />
      </div>
    </main>
  );
}
