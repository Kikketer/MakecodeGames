import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MakeCode Arcade Extensions",
  description: "A curated directory of MakeCode Arcade extensions.",
};

export default function ExtensionsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <h2 className="font-sans text-2xl font-bold text-white">MakeCode Arcade Extensions</h2>
      <p className="font-sans text-white">
        A curated, student-friendly documentation set for community-made MakeCode Arcade extensions.
      </p>
      <div className="border-4 border-makecode-yellow bg-makecode-blue p-6 shadow-[4px_4px_0_#000000]">
        <p className="font-sans text-lg font-bold text-white">Coming soon</p>
        <p className="mt-2 font-sans text-white">
          First up: documentation for{" "}
          <a
            href="https://arcade.makecode.com/#import:github:jwunderl/arcade-sprite-util"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-makecode-yellow hover:underline"
          >
            jwunderl/arcade-sprite-util
          </a>
          .
        </p>
      </div>
    </main>
  );
}
