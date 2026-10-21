import type { Metadata } from "next";
import Link from "next/link";
import ElfCompiler from "./elf-compiler";

export const metadata: Metadata = {
  title: "PNG → Raspberry Pi ELF Compiler — MakeCode Games",
  description:
    "The easy way to compile a MakeCode Arcade PNG export into a Raspberry Pi ELF binary with 4-player GPIO support.",
};

export const maxDuration = 300;

export default function ElfPage() {
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
            PNG → Raspberry Pi ELF Compiler
          </h1>
          <p className="mt-1 font-sans text-sm text-makecode-tan">
            Upload a MakeCode Arcade PNG export to compile a Raspberry Pi ELF
            binary. This is the easy way to get 4-player input support over GPIO
            on a Raspberry Pi.
          </p>
        </div>
        <ElfCompiler />
      </div>
    </main>
  );
}
