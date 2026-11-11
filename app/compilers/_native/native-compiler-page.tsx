import Link from "next/link";
import NativeCompiler, { type Arch } from "./native-compiler";

interface Props {
  arch: Arch;
  title: string;
  children: React.ReactNode;
}

/** Shared layout for the per-target native compiler routes. */
export default function NativeCompilerPage({ arch, title, children }: Props) {
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
            {title}
          </h1>
          <div className="mt-2 font-sans text-sm text-makecode-tan">{children}</div>
        </div>
        <NativeCompiler arch={arch} />
      </div>
    </main>
  );
}
