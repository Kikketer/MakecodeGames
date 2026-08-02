"use client";

import { supabase } from "@/lib/supabase";

export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: "email",
    },
  });
  if (error) throw error;
  if (data.url) window.location.href = data.url;
}
