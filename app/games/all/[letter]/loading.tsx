import { ArcadeLoader } from "../../components/ArcadeLoader";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-makecode-dark px-6 py-6">
      <ArcadeLoader />
    </main>
  );
}
