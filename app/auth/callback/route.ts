import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) redirect("/games?error=missing-code");

  const { data, error } = await supabaseServer.auth.exchangeCodeForSession(code);
  if (error || !data.session) redirect("/games?error=auth-failed");

  const cookieStore = await cookies();
  const options = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  cookieStore.set("sb-access-token", data.session.access_token, options);
  cookieStore.set("sb-refresh-token", data.session.refresh_token, options);

  redirect("/games");
}
