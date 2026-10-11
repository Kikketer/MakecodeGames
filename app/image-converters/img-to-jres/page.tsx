import type { Metadata } from "next";
import Link from "next/link";
import ImgToJresConverter from "./img-to-jres-converter";

export const metadata: Metadata = {
  title: "img → .jres — MakeCode Games",
  description:
    "Convert a MakeCode Arcade img literal into a .jres entry for images.g.jres.",
};

export default function ImgToJresPage() {
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
            img → .jres
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Paste a MakeCode Arcade{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              img
            </code>{" "}
            literal to generate the matching{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              .jres
            </code>{" "}
            entry for your project.
          </p>
        </div>
        <ImgToJresConverter />
      </div>
    </main>
  );
}
