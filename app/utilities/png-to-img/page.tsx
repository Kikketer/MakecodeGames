import type { Metadata } from "next";
import Link from "next/link";
import ImageConverter from "../components/image-converter";

export const metadata: Metadata = {
  title: "PNG → img + .jres — MakeCode Games",
  description:
    "Convert a PNG into a MakeCode Arcade img literal and a matching .jres entry for use in Visual Studio Code.",
};

export default function PngToImgPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/utilities"
            className="font-sans text-sm font-bold text-makecode-cyan hover:underline"
          >
            ← All utilities
          </Link>
          <h1 className="mt-2 font-sans text-2xl font-bold text-makecode-yellow">
            PNG → img + .jres
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Upload a PNG to generate a MakeCode Arcade img literal and a matching
            .jres entry for use in Visual Studio Code.
          </p>
        </div>
        <ImageConverter defaultTab="png-to-img" />
      </div>
    </main>
  );
}
