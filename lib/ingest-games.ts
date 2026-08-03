import { supabaseServer } from "@/lib/supabase-server";

const FORUM_BASE = "https://forum.makecode.com";
const MAKECODE_BASE = "https://arcade.makecode.com";

export type IngestResult = {
  jams: number;
  games: number;
  posts: number;
  errors: string[];
};

type DiscourseTopic = {
  id: number;
  title: string;
  category_id: number;
  posts_count: number;
  views: number;
  created_at?: string;
  bumped_at?: string;
  last_posted_at?: string;
  bumped?: boolean;
};

type DiscoursePost = {
  id: number;
  post_number: number;
  cooked: string;
  user_id: number;
  username: string;
  created_at?: string;
  reaction_users_count?: number;
};

type TopicPage = DiscourseTopic & { post_stream: { posts: DiscoursePost[] } };

type MakeCodeMeta = {
  id: string;
  shortid?: string;
  persistId?: string;
  name: string;
  description?: string;
};

type CategoryMap = Map<number, string>;

const makeCodeUrlPattern = /https?:\/\/(?:arcade\.)?makecode\.com\/[A-Za-z0-9_\-]+/g;

async function getCategories(): Promise<CategoryMap> {
  const site = await fetchJson<{
    categories: { id: number; name: string; slug: string; parent_category_id?: number }[];
  }>(`${FORUM_BASE}/site.json`);
  const rows = (site?.categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parent_category_id: c.parent_category_id ?? null,
  }));

  if (rows.length) {
    const { error } = await supabaseServer
      .from("forum_categories")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  const map: CategoryMap = new Map();
  rows.forEach((c) => map.set(c.id, c.name));
  return map;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  return res.ok ? ((await res.json()) as T) : null;
}

function extractShareUrls(cooked: string): string[] {
  const matches = cooked.match(makeCodeUrlPattern) || [];
  return [...new Set(matches)];
}

function shareUrlToId(shareUrl: string): string {
  return shareUrl.replace(/^https?:\/\/(?:arcade\.)?makecode\.com\//, "");
}

async function normalizeMakeCode(urlId: string): Promise<MakeCodeMeta | null> {
  const json = await fetchJson<Record<string, unknown>>(
    `${MAKECODE_BASE}/api/${encodeURIComponent(urlId)}`
  );
  if (!json || json.kind !== "script" || typeof json.id !== "string") return null;
  return {
    id: json.id as string,
    shortid: (json.shortid as string) || undefined,
    persistId: (json.persistId as string) || undefined,
    name: (json.name as string) || urlId,
    description: (json.description as string) || undefined,
  };
}

async function upsertGame(shareUrl: string, meta: MakeCodeMeta, author: { user_id: number; username: string }) {
  const thumbUrl = `https://cdn.makecode.com/api/${meta.id}/thumb`;
  const { data: existing } = await supabaseServer
    .from("games")
    .select("id")
    .eq("share_url", shareUrl)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await supabaseServer
      .from("games")
      .update({
        makecode_id: meta.id,
        shortid: meta.shortid,
        persist_id: meta.persistId,
        title: meta.name,
        description: meta.description,
        thumb_url: thumbUrl,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);
    if (error) throw error;
    return existing[0].id as string;
  }

  const { data: inserted, error } = await supabaseServer
    .from("games")
    .insert({
      share_url: shareUrl,
      makecode_id: meta.id,
      shortid: meta.shortid,
      persist_id: meta.persistId,
      title: meta.name,
      description: meta.description,
      thumb_url: thumbUrl,
      game_url: shareUrl,
      author_forum_id: author.user_id,
      author_username: author.username,
    })
    .select("id")
    .single();

  if (error || !inserted) throw error || new Error("failed to insert game");
  return inserted.id as string;
}

async function upsertForumPost(
  gameId: string,
  post: DiscoursePost,
  topicId: number,
  topicSlug: string,
  categoryId: number,
  categoryName: string,
  jamId: string | undefined,
  replyCount: number,
  viewCount: number,
  reactionCount: number
) {
  const forumUrl = `${FORUM_BASE}/t/${topicSlug}/${topicId}/${post.post_number}`;
  const now = new Date().toISOString();
  const { error } = await supabaseServer.from("game_forum_posts").upsert(
    {
      game_id: gameId,
      forum_topic_id: topicId,
      forum_post_id: post.id,
      forum_url: forumUrl,
      forum_category_id: categoryId,
      forum_category_name: categoryName,
      jam_id: jamId || null,
      seen_at: now,
      reply_count: Math.max(0, replyCount - 1),
      view_count: viewCount,
      post_cooked: post.cooked,
      reaction_count: reactionCount,
      reaction_refreshed_at: now,
    },
    { onConflict: "game_id, forum_topic_id, forum_post_id" }
  );
  if (error) throw error;
}

function shortJamTitle(title: string): string {
  const hash = title.indexOf("#");
  if (hash === -1) return title;
  return title.slice(hash).trim();
}

async function upsertJam(topic: DiscourseTopic): Promise<string | undefined> {
  const title = shortJamTitle(topic.title);
  const { data, error } = await supabaseServer
    .from("game_jams")
    .upsert(
      {
        forum_topic_id: topic.id,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        category_id: topic.category_id,
        type: "mini",
        announced_at: topic.created_at || new Date().toISOString(),
      },
      { onConflict: "forum_topic_id" }
    )
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string | undefined;
}

export async function ingestPost(
  shareUrl: string,
  post: DiscoursePost,
  topic: DiscourseTopic,
  categoryMap: CategoryMap,
  jamId?: string,
  reactionCount?: number
): Promise<string | null> {
  const urlId = shareUrlToId(shareUrl);
  const meta = await normalizeMakeCode(urlId);
  if (!meta) return null;

  const gameId = await upsertGame(shareUrl, meta, { user_id: post.user_id, username: post.username });
  const categoryName = categoryMap.get(topic.category_id) || "";
  await upsertForumPost(
    gameId,
    post,
    topic.id,
    `t-${topic.id}`,
    topic.category_id,
    categoryName,
    jamId,
    topic.posts_count || 0,
    topic.views || 0,
    reactionCount ?? (post.reaction_users_count ?? 0)
  );
  return gameId;
}

async function refreshPostReactions(post: DiscoursePost, topicId: number) {
  const count = post.reaction_users_count ?? 0;
  const { error } = await supabaseServer
    .from("game_forum_posts")
    .update({
      reaction_count: count,
      reaction_refreshed_at: new Date().toISOString(),
    })
    .eq("forum_topic_id", topicId)
    .eq("forum_post_id", post.id);
  if (error) throw error;
}

async function fetchAllTopicPosts(topicId: number): Promise<{ topic: DiscourseTopic | null; posts: DiscoursePost[] }> {
  const first = await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json`);
  if (!first) return { topic: null, posts: [] };

  const posts: DiscoursePost[] = [...first.post_stream.posts];
  const perPage = first.post_stream.posts.length || 20;
  const pages = Math.ceil(first.posts_count / perPage);

  for (let page = 2; page <= pages; page++) {
    const next = await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json?page=${page}`);
    if (!next) break;
    posts.push(...next.post_stream.posts);
  }

  const topic: DiscourseTopic = { ...first, id: topicId };
  return { topic, posts };
}

export async function ingestJamTopic(
  topicId: number,
  lastIngestAt?: Date
): Promise<{ games: number; errors: string[] }> {
  const { topic, posts } = await fetchAllTopicPosts(topicId);
  if (!topic) return { games: 0, errors: [`topic ${topicId} not found`] };

  const categoryMap = await getCategories();
  const jam = await upsertJam(topic);
  const errors: string[] = [];
  let games = 0;

  for (const post of posts) {
    if (post.post_number === 1) continue;
    try {
      if (!lastIngestAt || (post.created_at && new Date(post.created_at) >= lastIngestAt)) {
        const urls = extractShareUrls(post.cooked);
        for (const url of urls) {
          const gameId = await ingestPost(url, post, topic, categoryMap, jam);
          if (gameId) games++;
        }
      } else {
        await refreshPostReactions(post, topic.id);
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  return { games, errors };
}

export async function ingestCategoryTopics(
  categoryId: number,
  limit = 10,
  lastIngestAt?: Date
): Promise<{ games: number; errors: string[] }> {
  const category = await fetchJson<{ topic_list: { topics: DiscourseTopic[] } }>(
    `${FORUM_BASE}/c/${categoryId}.json`
  );
  if (!category) return { games: 0, errors: [`category ${categoryId} not found`] };

  const categoryMap = await getCategories();
  const errors: string[] = [];
  let games = 0;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const topic of category.topic_list.topics.slice(0, limit)) {
    if (lastIngestAt) {
      const bumpedAt = topic.bumped_at ? new Date(topic.bumped_at) : null;
      if (!bumpedAt || bumpedAt < oneDayAgo) continue;
    }

    const { topic: fullTopic, posts } = await fetchAllTopicPosts(topic.id);
    if (!fullTopic) continue;

    for (const post of posts) {
      try {
        if (!lastIngestAt || (post.created_at && new Date(post.created_at) >= lastIngestAt)) {
          const urls = extractShareUrls(post.cooked);
          for (const url of urls) {
            const gameId = await ingestPost(url, post, fullTopic, categoryMap);
            if (gameId) games++;
          }
        } else {
          await refreshPostReactions(post, fullTopic.id);
        }
      } catch (e) {
        errors.push(String(e));
      }
    }
  }

  return { games, errors };
}

export async function ingestOnce(): Promise<IngestResult> {
  const result: IngestResult = { jams: 0, games: 0, posts: 0, errors: [] };
  const startedAt = new Date().toISOString();

  const { data: lastLog } = await supabaseServer
    .from("ingest_log")
    .select("finished_at")
    .order("finished_at", { ascending: false })
    .limit(1)
    .single();
  const lastIngestAt = lastLog?.finished_at ? new Date(lastLog.finished_at as string) : undefined;

  const jam = await ingestJamTopic(44801, lastIngestAt);
  result.jams = 1;
  result.games += jam.games;
  result.errors.push(...jam.errors);

  const cat = await ingestCategoryTopics(5, 10, lastIngestAt);
  result.games += cat.games;
  result.errors.push(...cat.errors);

  const { count } = await supabaseServer.from("game_forum_posts").select("*", { count: "exact", head: true });
  result.posts = count || 0;

  await supabaseServer.from("ingest_log").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    games: result.games,
    posts: result.posts,
    errors: result.errors,
  });

  return result;
}

export async function refreshGameReactions(gameId: string): Promise<void> {
  const { data: rows } = await supabaseServer
    .from("game_forum_posts")
    .select("forum_post_id, reaction_refreshed_at")
    .eq("game_id", gameId);
  if (!rows || rows.length === 0) return;

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const row of rows as { forum_post_id: number; reaction_refreshed_at: string | null }[]) {
    const refreshedAt = row.reaction_refreshed_at ? new Date(row.reaction_refreshed_at).getTime() : 0;
    if (now - refreshedAt < oneHour) continue;

    const post = await fetchJson<DiscoursePost>(`${FORUM_BASE}/posts/${row.forum_post_id}.json`);
    if (!post) continue;

    await supabaseServer
      .from("game_forum_posts")
      .update({
        reaction_count: post.reaction_users_count ?? 0,
        reaction_refreshed_at: new Date().toISOString(),
      })
      .eq("game_id", gameId)
      .eq("forum_post_id", row.forum_post_id);
  }
}
