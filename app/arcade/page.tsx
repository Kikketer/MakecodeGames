import Tv from "./tv";

interface Props {
  searchParams: Promise<{ duration?: string; game?: string }>;
}

export default async function ArcadePage({ searchParams }: Props) {
  const params = await searchParams;
  const duration = Math.max(1, parseInt(params.duration ?? "60", 10) || 60);
  const gameName = params.game ?? "";

  return <Tv duration={duration} gameName={gameName} />;
}
