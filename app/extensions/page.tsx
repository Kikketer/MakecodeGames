import type { Metadata } from "next";
import Link from "next/link";

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
        <p className="font-sans text-lg font-bold text-white">First documented extension</p>
        <ul className="mt-2 list-disc pl-6 font-sans text-white">
          <li>
            <Link
              href="/extensions/jwunderl/arcade-sprite-util/distance-between"
              className="font-bold text-makecode-yellow hover:underline"
            >
              arcade-sprite-util / distance between
            </Link>
          </li>
        </ul>
        <p className="mt-4 font-sans text-white">
          Or open the extension directly in MakeCode Arcade:{" "}
          <a
            href="https://arcade.makecode.com/#import:github:jwunderl/arcade-sprite-util"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-makecode-yellow hover:underline"
          >
            Import arcade-sprite-util
          </a>
          .
        </p>
      </div>
    </main>
  );
}
