import { SearchBox } from "./components/SearchBox";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-makecode-blue border-b-4 border-makecode-white px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-3xl font-bold text-white">MakeCode Games!</h1>
            <p className="mt-1 font-sans text-sm text-makecode-tan">
              A fan-made community library of MakeCode Arcade games. Visit{" "}
              <a
                href="https://arcade.makecode.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white hover:underline"
              >
                MakeCode Arcade
              </a>{" "}
              to make a game!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchBox />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
