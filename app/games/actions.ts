"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getUser } from "@/lib/auth";
import { refreshGameReactions } from "@/lib/ingest-games";

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
  link_clicks: number;
  plays: number;
  forum_url: string;
  forum_topic_title: string | null;
  replies: number;
  views: number;
  post_cooked: string | null;
};

type CategoryRow = { id: number; name: string; slug: string; parent_category_id?: number | null };
type JamRow = { id: string; title: string };
type StatsRow = { game_id: string; clicks: number };
type PostRow = {
  game_id: string;
  forum_url: string;
  forum_topic_title: string | null;
  reply_count: number;
  view_count: number;
  post_cooked: string | null;
  reaction_count: number;
  link_clicks: number;
};

type ListParams = {
  category?: string;
  jam?: string;
  sort: "hot" | "likes" | "newest" | "trending";
  limit?: number;
};

function mergeGameData(games: GameWithStats[], stats: StatsRow[], posts: PostRow[]): GameWithStats[] {
  const statsMap = new Map(stats.map((s) => [s.game_id, { clicks: s.clicks || 0 }]));

  const forumMap = new Map<
    string,
    { url: string; topicTitle: string | null; replies: number; views: number; post_cooked: string | null; likes: number; link_clicks: number }
  >();
  posts.forEach((p) => {
    const existing = forumMap.get(p.game_id);
    if (!existing) {
      forumMap.set(p.game_id, {
        url: p.forum_url,
        topicTitle: p.forum_topic_title,
        replies: p.reply_count || 0,
        views: p.view_count || 0,
        post_cooked: p.post_cooked,
        likes: p.reaction_count || 0,
        link_clicks: p.link_clicks || 0,
      });
    } else {
      existing.likes += p.reaction_count || 0;
      existing.link_clicks += p.link_clicks || 0;
    }
  });

  return games.map((g) => {
    const s = statsMap.get(g.id) || { clicks: 0 };
    const p = forumMap.get(g.id) || { url: "", topicTitle: null, replies: 0, views: 0, post_cooked: null, likes: 0, link_clicks: 0 };
    return {
      ...g,
      likes: p.likes,
      clicks: s.clicks,
      link_clicks: p.link_clicks,
      plays: s.clicks + p.link_clicks,
      forum_url: p.url,
      forum_topic_title: p.topicTitle,
      replies: p.replies,
      views: p.views,
      post_cooked: p.post_cooked,
    };
  });
}

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
    supabaseServer.from("game_stats").select("game_id, clicks").in("game_id", gameIds),
    supabaseServer
      .from("game_forum_posts")
      .select("game_id,forum_url,forum_topic_title,reply_count,view_count,post_cooked,reaction_count,link_clicks")
      .in("game_id", gameIds),
  ]);

  const gameRows = (games || []) as unknown as GameWithStats[];
  const merged = mergeGameData(
    gameRows,
    (stats || []) as unknown as StatsRow[],
    (posts || []) as unknown as PostRow[]
  );

  if (sort === "likes") {
    merged.sort((a, b) => b.likes - a.likes);
  } else if (sort === "newest") {
    merged.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
  } else if (sort === "trending") {
    const { data: snapshots } = await supabaseServer
      .from("game_stats_snapshots")
      .select("game_id, likes, plays");

    const gameIdSet = new Set(gameIds);
    const snapshotMap = new Map(
      (snapshots || [])
        .filter((s) => gameIdSet.has(s.game_id))
        .map((s) => [s.game_id, { likes: s.likes || 0, plays: s.plays || 0 }])
    );

    merged.sort((a, b) => {
      const sa = snapshotMap.get(a.id) || { likes: 0, plays: 0 };
      const sb = snapshotMap.get(b.id) || { likes: 0, plays: 0 };
      const da = (a.likes + a.plays) - (sa.likes + sa.plays);
      const db = (b.likes + b.plays) - (sb.likes + sb.plays);
      return db - da;
    });
  } else {
    merged.sort((a, b) => {
      const ah = (Date.now() - new Date(a.first_seen_at).getTime()) / 3600000;
      const bh = (Date.now() - new Date(b.first_seen_at).getTime()) / 3600000;
      const as = (a.likes + a.plays) / Math.pow(ah + 2, 1.5);
      const bs = (b.likes + b.plays) / Math.pow(bh + 2, 1.5);
      return bs - as;
    });
  }

  return merged.slice(0, limit);
}

export async function searchGames(query: string): Promise<GameWithStats[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data: games } = await supabaseServer
    .from("games")
    .select("*")
    .ilike("title", `%${trimmed}%`);

  const gameRows = (games || []) as unknown as GameWithStats[];
  if (gameRows.length === 0) return [];

  const gameIds = gameRows.map((g) => g.id);

  const [{ data: stats }, { data: posts }] = await Promise.all([
    supabaseServer.from("game_stats").select("game_id, clicks").in("game_id", gameIds),
    supabaseServer
      .from("game_forum_posts")
      .select("game_id,forum_url,forum_topic_title,reply_count,view_count,post_cooked,reaction_count,link_clicks")
      .in("game_id", gameIds),
  ]);

  const merged = mergeGameData(
    gameRows,
    (stats || []) as unknown as StatsRow[],
    (posts || []) as unknown as PostRow[]
  );

  const lowerQuery = trimmed.toLowerCase();
  merged.sort((a, b) => {
    const ai = a.title.toLowerCase().indexOf(lowerQuery);
    const bi = b.title.toLowerCase().indexOf(lowerQuery);
    if (ai !== bi) return ai - bi;
    return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
  });

  return merged;
}

export async function addLike(gameId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  await supabaseServer
    .from("game_likes")
    .upsert({ game_id: gameId, user_id: user.id }, { onConflict: "game_id,user_id", ignoreDuplicates: true });

  revalidatePath("/games");
}

export async function recordClick(gameId: string) {
  const user = await getUser().catch(() => null);
  await supabaseServer.from("game_clicks").insert({ game_id: gameId, user_id: user?.id || null });
  try {
    await refreshGameReactions(gameId);
  } catch (error) {
    console.error("Failed to refresh reactions:", error);
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");
  revalidatePath("/games");
  redirect("/games");
}
