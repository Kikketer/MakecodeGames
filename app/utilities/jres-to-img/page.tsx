import type { Metadata } from "next";
import Link from "next/link";
import ImageConverter from "../components/image-converter";

export const metadata: Metadata = {
  title: ".jres → img — MakeCode Games",
  description:
    "Decode a MakeCode Arcade .jres base64 data string back into an img literal.",
};

export default function JresToImgPage() {
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
            .jres → img
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Paste a MakeCode Arcade .jres base64 data string to decode it back
            into an img literal you can reuse in blocks code.
          </p>
        </div>
        <ImageConverter defaultTab="jres-to-img" />
      </div>
    </main>
  );
}
