"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

export async function setSessionFromTokens({
  access_token,
  refresh_token,
}: {
  access_token: string;
  refresh_token: string;
}) {
  const { data, error } = await supabaseServer.auth.getUser(access_token);
  if (error || !data.user) {
    return { error: "invalid-token" };
  }

  const cookieStore = await cookies();
  const options = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  cookieStore.set("sb-access-token", access_token, options);
  cookieStore.set("sb-refresh-token", refresh_token, options);

  return { ok: true };
}
