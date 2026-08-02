"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSessionFromTokens } from "./actions";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");

    if (!access_token || !refresh_token) {
      router.replace("/games?error=missing-tokens");
      return;
    }

    setSessionFromTokens({ access_token, refresh_token })
      .then((result) => {
        if ("error" in result) {
          router.replace("/games?error=auth-failed");
        } else {
          router.replace("/games");
        }
      })
      .catch(() => router.replace("/games?error=auth-failed"));
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-makecode-dark p-6 text-center">
      <div className="border-4 border-makecode-yellow bg-makecode-blue p-6 shadow-[4px_4px_0_#000000]">
        <p className="font-mono text-2xl font-bold text-white">Signing you in...</p>
      </div>
    </main>
  );
}
