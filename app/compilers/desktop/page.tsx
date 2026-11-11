import { redirect } from "next/navigation";

const ROUTES: Record<string, string> = {
  "x86-64": "/compilers/native-x86",
  arm64: "/compilers/native-arm",
  win64: "/compilers/windows",
};

interface Props {
  searchParams: Promise<{ arch?: string }>;
}

/** Legacy combined native compiler URL; each target now has its own route. */
export default async function DesktopPage({ searchParams }: Props) {
  const { arch } = await searchParams;
  redirect((arch && ROUTES[arch]) ?? "/compilers");
}
