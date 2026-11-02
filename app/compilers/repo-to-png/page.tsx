import type { Metadata } from "next";
import Link from "next/link";
import RepoToPng from "./repo-to-png-compiler";

export const metadata: Metadata = {
  title: "GitHub Repo → MakeCode PNG — MakeCode Games",
  description:
    "Generate a MakeCode Arcade project PNG straight from a public GitHub repo — no editor import needed.",
};

export const maxDuration = 120;

export default function RepoToPngPage() {
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
            GitHub Repo → MakeCode PNG
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Point at a public GitHub repo containing a MakeCode Arcade project
            (pxt.json + main.ts) and get back a project PNG you can feed into
            the other compilers — no MakeCode editor import required.
          </p>
        </div>
        <RepoToPng />
      </div>
    </main>
  );
}
