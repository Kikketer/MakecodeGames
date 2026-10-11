import type { Metadata } from "next";
import Link from "next/link";
import JresToImgConverter from "./jres-to-img-converter";

export const metadata: Metadata = {
  title: ".jres → img — MakeCode Games",
  description:
    "Decode a base64 .jres image data string back into a MakeCode Arcade img literal.",
};

export default function JresToImgPage() {
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
            .jres → img
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Paste a base64{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              .jres
            </code>{" "}
            data string to decode it back into an{" "}
            <code className="rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green">
              img
            </code>{" "}
            literal.
          </p>
        </div>
        <JresToImgConverter />
      </div>
    </main>
  );
}
