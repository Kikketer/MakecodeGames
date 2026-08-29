"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getUser } from "@/lib/auth";
import { refreshGameReactions } from "@/lib/ingest-games";
import { getAlgoliaSearchClient, GAMES_INDEX, FORUM_TOPICS_INDEX } from "@/lib/algolia";

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
  posted_at: string | null;
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

export type ForumTopic = {
  forum_topic_id: number;
  title: string;
  category_name: string | null;
  reply_count: number;
  view_count: number;
};

export type SearchGamesAndTopicsResult = {
  topics: ForumTopic[];
  games: GameWithStats[];
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
  posted_at: string | null;
};

type ListParams = {
  category?: string;
  jam?: string;
  topic?: number;
  sort: "hot" | "likes" | "newest" | "trending";
  limit?: number;
};

function mergeGameData(games: GameWithStats[], stats: StatsRow[], posts: PostRow[]): GameWithStats[] {
  const statsMap = new Map(stats.map((s) => [s.game_id, { clicks: s.clicks || 0 }]));

  const forumMap = new Map<
    string,
    { url: string; topicTitle: string | null; replies: number; views: number; post_cooked: string | null; likes: number; link_clicks: number; postedAt: string | null }
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
        postedAt: p.posted_at ?? null,
      });
    } else {
      existing.likes += p.reaction_count || 0;
      existing.link_clicks += p.link_clicks || 0;
      if (p.posted_at && (!existing.postedAt || new Date(p.posted_at).getTime() < new Date(existing.postedAt).getTime())) {
        existing.postedAt = p.posted_at;
      }
    }
  });

  return games.map((g) => {
    const s = statsMap.get(g.id) || { clicks: 0 };
    const p = forumMap.get(g.id) || { url: "", topicTitle: null, replies: 0, views: 0, post_cooked: null, likes: 0, link_clicks: 0, postedAt: null as string | null };
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
      posted_at: g.posted_at ?? p.postedAt,
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

/**
 * Maps a sort mode to the computed score column on the `game_scores` view.
 * The view adds `sort_date` (coalesced posted_at/first_seen_at), `hot_score`
 * (time-decayed likes+plays), and `trending_score` (likes+plays delta vs the
 * latest snapshot) on top of `game_daily_stats`.
 */
function sortScoreColumn(sort: ListParams["sort"]): string {
  switch (sort) {
    case "newest":
      return "sort_date";
    case "hot":
      return "hot_score";
    case "trending":
      return "trending_score";
    case "likes":
      return "likes";
  }
}

export async function listGames({ category, jam, topic, sort, limit = 10 }: ListParams): Promise<GameWithStats[]> {
  const fetchAll = (!category || category === "all") && !topic;

  // The "all" front page reads from the game_scores view and pushes
  // ORDER BY + LIMIT into the database so Postgres ranks the full dataset
  // and returns only `limit` rows. Fetching every game_daily_stats row
  // (capped by Supabase's default row limit) and sorting an arbitrary
  // subset in JS caused the front page to stop reflecting new games once
  // the table grew past that cap.
  if (fetchAll) {
    const { data } = await supabaseServer
      .from("game_scores")
      .select("*")
      .order(sortScoreColumn(sort), { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data || []) as unknown as GameWithStats[];
  }

  let gameIds: string[] = [];

  if (topic) {
    const { data } = await supabaseServer.from("game_forum_posts").select("game_id").eq("forum_topic_id", topic);
    gameIds = [...new Set(((data || []) as unknown as IdRow[]).map((d) => d.game_id))];
  } else if (category === "game-jams") {
    const query = jam
      ? supabaseServer.from("game_category_stats").select("game_id").eq("jam_id", jam)
      : supabaseServer.from("game_category_stats").select("game_id").not("jam_id", "is", null);
    const { data } = await query;
    gameIds = [...new Set(((data || []) as unknown as IdRow[]).map((d) => d.game_id))];
  } else {
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
  }

  if (gameIds.length === 0) return [];

  const [{ data: gamesData }, { data: statsData }, { data: postsData }] = await Promise.all([
    supabaseServer.from("games").select("*").in("id", gameIds),
    supabaseServer.from("game_stats").select("game_id, clicks").in("game_id", gameIds),
    supabaseServer
      .from("game_forum_posts")
      .select("game_id,forum_url,forum_topic_title,reply_count,view_count,post_cooked,reaction_count,link_clicks,posted_at")
      .in("game_id", gameIds),
  ]);

  const gameRows = (gamesData || []) as unknown as GameWithStats[];
  const merged = mergeGameData(
    gameRows,
    (statsData || []) as unknown as StatsRow[],
    (postsData || []) as unknown as PostRow[]
  );

  if (sort === "likes") {
    merged.sort((a, b) => b.likes - a.likes);
  } else if (sort === "newest") {
    const dateOf = (g: GameWithStats) => new Date(g.posted_at ?? g.first_seen_at).getTime();
    merged.sort((a, b) => dateOf(b) - dateOf(a));
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
    const dateOf = (g: GameWithStats) => new Date(g.posted_at ?? g.first_seen_at).getTime();
    merged.sort((a, b) => {
      const ah = (Date.now() - dateOf(a)) / 3600000;
      const bh = (Date.now() - dateOf(b)) / 3600000;
      const as = (a.likes + a.plays) / Math.pow(ah + 2, 1.5);
      const bs = (b.likes + b.plays) / Math.pow(bh + 2, 1.5);
      return bs - as;
    });
  }

  return merged.slice(0, limit);
}

export async function listAllGames({
  letter,
  page,
  limit = 20,
}: {
  letter: string;
  page: number;
  limit?: number;
}): Promise<{ games: GameWithStats[]; total: number }> {
  const offset = (page - 1) * limit;
  const isOther = letter === "other";

  let query = supabaseServer.from("games").select("*", { count: "exact" });
  if (isOther) {
    query = query.not("title", "imatches", "^[a-z]");
  } else {
    query = query.ilike("title", `${letter}%`);
  }
  query = query.order("title").range(offset, offset + limit - 1);

  const { data, count } = await query;
  const gameRows = (data || []) as unknown as GameWithStats[];
  const total = count ?? 0;
  if (gameRows.length === 0) return { games: [], total };

  const gameIds = gameRows.map((g) => g.id);
  const [{ data: statsData }, { data: postsData }] = await Promise.all([
    supabaseServer.from("game_stats").select("game_id, clicks").in("game_id", gameIds),
    supabaseServer
      .from("game_forum_posts")
      .select("game_id,forum_url,forum_topic_title,reply_count,view_count,post_cooked,reaction_count,link_clicks,posted_at")
      .in("game_id", gameIds),
  ]);

  const merged = mergeGameData(
    gameRows,
    (statsData || []) as unknown as StatsRow[],
    (postsData || []) as unknown as PostRow[]
  );

  merged.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  return { games: merged, total };
}

export async function countAllLetters(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    counts[letter] = 0;
  }
  counts["other"] = 0;

  const PAGE_SIZE = 1000;
  let offset = 0;
  for (;;) {
    const { data } = await supabaseServer
      .from("games")
      .select("title")
      .range(offset, offset + PAGE_SIZE - 1);
    const titles = (data || []) as { title: string }[];
    if (titles.length === 0) break;

    for (const { title } of titles) {
      const first = title.charAt(0).toUpperCase();
      if (first >= "A" && first <= "Z") {
        counts[first]++;
      } else {
        counts["other"]++;
      }
    }

    if (titles.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return counts;
}

async function hydrateGames(gameIds: string[]): Promise<GameWithStats[]> {
  if (gameIds.length === 0) return [];

  const [{ data: gamesData }, { data: statsData }, { data: postsData }] = await Promise.all([
    supabaseServer.from("games").select("*").in("id", gameIds),
    supabaseServer.from("game_stats").select("game_id, clicks").in("game_id", gameIds),
    supabaseServer
      .from("game_forum_posts")
      .select("game_id,forum_url,forum_topic_title,reply_count,view_count,post_cooked,reaction_count,link_clicks,posted_at")
      .in("game_id", gameIds),
  ]);

  const gameRows = (gamesData || []) as unknown as GameWithStats[];
  const merged = mergeGameData(
    gameRows,
    (statsData || []) as unknown as StatsRow[],
    (postsData || []) as unknown as PostRow[]
  );

  const orderMap = new Map(gameIds.map((id, index) => [id, index]));
  merged.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return merged;
}

async function searchGamesSupabase(query: string, limit?: number): Promise<GameWithStats[]> {
  const { data: games } = await supabaseServer
    .from("games")
    .select("*")
    .ilike("title", `%${query}%`);

  const gameRows = (games || []) as unknown as GameWithStats[];
  if (gameRows.length === 0) return [];

  const gameIds = gameRows.map((g) => g.id);
  const merged = await hydrateGames(gameIds);

  const lowerQuery = query.toLowerCase();
  merged.sort((a, b) => {
    const ai = a.title.toLowerCase().indexOf(lowerQuery);
    const bi = b.title.toLowerCase().indexOf(lowerQuery);
    if (ai !== bi) return ai - bi;
    return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
  });

  return limit ? merged.slice(0, limit) : merged;
}

export async function searchGamesAndTopics(
  query: string,
  limit?: number
): Promise<SearchGamesAndTopicsResult> {
  const trimmed = query.trim();
  if (!trimmed) return { topics: [], games: [] };

  const client = getAlgoliaSearchClient();
  if (client) {
    try {
      const { results } = (await client.search({
        requests: [
          {
            indexName: FORUM_TOPICS_INDEX,
            query: trimmed,
            hitsPerPage: 3,
            attributesToRetrieve: ["forum_topic_id", "title", "category_name", "reply_count", "view_count"],
          },
          {
            indexName: GAMES_INDEX,
            query: trimmed,
            hitsPerPage: limit ?? 4,
            attributesToRetrieve: [
              "objectID",
              "title",
              "description",
              "author_username",
              "thumb_url",
              "game_url",
              "first_seen_at",
            ],
          },
        ],
      })) as unknown as {
        results: Array<{ hits: Array<Record<string, unknown> & { objectID: string }> }>;
      };

      const [topicResult, gameResult] = results;

      const topics: ForumTopic[] = (topicResult?.hits || []).map((hit) => ({
        forum_topic_id: Number(hit.forum_topic_id ?? 0),
        title: String(hit.title ?? ""),
        category_name: hit.category_name ? String(hit.category_name) : null,
        reply_count: Number(hit.reply_count ?? 0),
        view_count: Number(hit.view_count ?? 0),
      }));

      const gameIds = (gameResult?.hits || []).map((hit) => String(hit.objectID));
      const games = gameIds.length > 0 ? await hydrateGames(gameIds) : [];

      return { topics, games };
    } catch (error) {
      console.error("Algolia search failed, falling back to Supabase:", error);
    }
  }

  return { topics: [], games: await searchGamesSupabase(trimmed, limit) };
}

export async function searchGames(query: string): Promise<GameWithStats[]> {
  return (await searchGamesAndTopics(query, 1000)).games;
}

export async function getTopicTitle(topicId: number): Promise<string | null> {
  const { data } = await supabaseServer
    .from("game_forum_posts")
    .select("forum_topic_title")
    .eq("forum_topic_id", topicId)
    .limit(1);
  return ((data as { forum_topic_title: string | null }[] | null)?.[0]?.forum_topic_title) || null;
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
