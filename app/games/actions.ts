"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getUser } from "@/lib/auth";

export type GameWithStats = {
  id: string;
  share_url: string;
  makecode_id: string;
  title: string;
  description: string | null;
  thumb_url: string;
  game_url: string;
  author_username: string | null;
  first_seen_at: string;
  last_seen_at: string;
  likes: number;
  clicks: number;
  forum_url: string;
};

type CategoryRow = { id: number; name: string; slug: string; parent_category_id?: number | null };
type JamRow = { id: string; title: string };
type StatsRow = { game_id: string; likes: number; clicks: number };
type PostRow = { game_id: string; forum_url: string };

type ListParams = {
  category?: string;
  jam?: string;
  sort: "hot" | "likes" | "newest";
  limit?: number;
};

export async function listCategories(): Promise<CategoryRow[]> {
  const { data } = await supabaseServer.from("forum_categories").select("*").order("name");
  return (data || []) as unknown as CategoryRow[];
}

export async function listJams(): Promise<JamRow[]> {
  const { data } = await supabaseServer.from("game_jams").select("*").order("announced_at", { ascending: false });
  return (data || []) as unknown as JamRow[];
}

type IdRow = { game_id: string };
type GameIdRow = { id: string };

export async function listGames({ category, jam, sort, limit = 10 }: ListParams): Promise<GameWithStats[]> {
  let gameIds: string[] = [];

  if (category === "game-jams") {
    const query = jam
      ? supabaseServer.from("game_category_stats").select("game_id").eq("jam_id", jam)
      : supabaseServer.from("game_category_stats").select("game_id").not("jam_id", "is", null);
    const { data } = await query;
    gameIds = [...new Set(((data || []) as unknown as IdRow[]).map((d) => d.game_id))];
  } else if (category && category !== "all") {
    const { data: cat } = await supabaseServer
      .from("forum_categories")
      .select("id")
      .eq("slug", category)
      .limit(1)
      .single();
    if (!cat) return [];
    const { data } = await supabaseServer
      .from("game_category_stats")
      .select("game_id")
      .eq("forum_category_id", (cat as { id: number }).id);
    gameIds = [...new Set(((data || []) as unknown as IdRow[]).map((d) => d.game_id))];
  } else {
    const { data } = await supabaseServer.from("games").select("id");
    gameIds = ((data || []) as unknown as GameIdRow[]).map((d) => d.id);
  }

  if (gameIds.length === 0) return [];

  const [{ data: games }, { data: stats }, { data: posts }] = await Promise.all([
    supabaseServer.from("games").select("*").in("id", gameIds),
    supabaseServer.from("game_stats").select("*").in("game_id", gameIds),
    supabaseServer.from("game_forum_posts").select("game_id,forum_url,seen_at").in("game_id", gameIds),
  ]);

  const statsMap = new Map(
    ((stats || []) as unknown as StatsRow[]).map((s) => [
      s.game_id,
      { likes: s.likes || 0, clicks: s.clicks || 0 },
    ])
  );

  const forumMap = new Map<string, string>();
  ((posts || []) as unknown as PostRow[]).forEach((p) => {
    if (!forumMap.has(p.game_id)) forumMap.set(p.game_id, p.forum_url);
  });

  const gameRows = (games || []) as unknown as GameWithStats[];
  const merged = gameRows.map((g) => {
    const s = statsMap.get(g.id) || { likes: 0, clicks: 0 };
    return {
      ...g,
      likes: s.likes,
      clicks: s.clicks,
      forum_url: forumMap.get(g.id) || "",
    };
  });

  if (sort === "likes") {
    merged.sort((a, b) => b.likes - a.likes);
  } else if (sort === "newest") {
    merged.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
  } else {
    merged.sort((a, b) => {
      const ah = (Date.now() - new Date(a.first_seen_at).getTime()) / 3600000;
      const bh = (Date.now() - new Date(b.first_seen_at).getTime()) / 3600000;
      const as = (a.likes + a.clicks) / Math.pow(ah + 2, 1.5);
      const bs = (b.likes + b.clicks) / Math.pow(bh + 2, 1.5);
      return bs - as;
    });
  }

  return merged.slice(0, limit);
}

export async function toggleLike(gameId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabaseServer
    .from("game_likes")
    .select("game_id")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabaseServer.from("game_likes").delete().eq("game_id", gameId).eq("user_id", user.id);
  } else {
    await supabaseServer.from("game_likes").insert({ game_id: gameId, user_id: user.id });
  }

  revalidatePath("/games");
}

export async function recordClick(gameId: string) {
  const user = await getUser().catch(() => null);
  await supabaseServer.from("game_clicks").insert({ game_id: gameId, user_id: user?.id || null });
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");
  revalidatePath("/games");
  redirect("/games");
}
