import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Distance between two sprites in MakeCode Arcade - Sprite Utils",
  description:
    "Find the distance in pixels between two sprites, points, or tile locations using the arcade-sprite-util extension.",
  keywords: [
    "makecode arcade",
    "arcade extension",
    "sprite distance",
    "distance between sprites",
    "spriteutils",
  ],
};

export default function DistanceBetweenPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <h1 className="font-sans text-3xl font-bold text-white">distance between</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Problem it solves</h2>
        <p className="font-sans text-white">
          You need to know how far away an enemy, power-up, or another sprite is from the player
          before doing something—playing a sound, firing a projectile, or ending the game.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">What this block does</h2>
        <p className="font-sans text-white">
          Returns the distance in pixels between the centers of two sprites, points, or tile
          locations. If either sprite is missing or destroyed, it returns <code className="bg-makecode-blue px-1 font-mono text-white">0</code>.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">The block</h2>
        <p className="font-sans text-white">
          Block ID: <code className="font-mono text-makecode-cyan">spriteutilextdistbw</code>
        </p>
        <Image
          src="/extensions/jwunderl/arcade-sprite-util/distance-between.svg"
          alt="distance between a and b block"
          width={674}
          height={316}
          unoptimized
          className="max-w-full border-2 border-makecode-white bg-white"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Parameters</h2>
        <div className="overflow-x-auto border-2 border-makecode-white">
          <table className="w-full border-collapse font-sans text-sm text-white">
            <thead>
              <tr className="bg-makecode-blue text-left">
                <th className="border-2 border-makecode-white px-4 py-2">Name</th>
                <th className="border-2 border-makecode-white px-4 py-2">Type</th>
                <th className="border-2 border-makecode-white px-4 py-2">Default</th>
                <th className="border-2 border-makecode-white px-4 py-2">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-makecode-dark">
                <td className="border-2 border-makecode-white px-4 py-2 font-mono">a</td>
                <td className="border-2 border-makecode-white px-4 py-2">Sprite / Location / Point</td>
                <td className="border-2 border-makecode-white px-4 py-2 font-mono">mySprite</td>
                <td className="border-2 border-makecode-white px-4 py-2">First point to measure from</td>
              </tr>
              <tr className="bg-makecode-dark">
                <td className="border-2 border-makecode-white px-4 py-2 font-mono">b</td>
                <td className="border-2 border-makecode-white px-4 py-2">Sprite / Location / Point</td>
                <td className="border-2 border-makecode-white px-4 py-2 font-mono">myEnemy</td>
                <td className="border-2 border-makecode-white px-4 py-2">Second point to measure to</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Returns</h2>
        <p className="font-sans text-white">
          <code className="bg-makecode-blue px-1 font-mono text-white">number</code> — the distance in pixels.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Example</h2>
        <pre className="overflow-x-auto border-2 border-makecode-black bg-makecode-black p-4 font-mono text-sm text-makecode-green">
{`let mySprite = sprites.create(img\`...\`, SpriteKind.Player)
let myEnemy = sprites.create(img\`...\`, SpriteKind.Enemy)
let distance = spriteutils.distanceBetween(mySprite, myEnemy)
console.log(distance)`}
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-sans text-xl font-bold text-makecode-yellow">Add the extension</h2>
        <p className="font-sans text-white">
          Add <code className="font-mono text-makecode-cyan">github:jwunderl/arcade-sprite-util</code> to your project, or open:{" "}
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
      </section>
    </main>
  );
}
