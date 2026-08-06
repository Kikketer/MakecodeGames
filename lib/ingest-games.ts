import { supabaseServer } from "@/lib/supabase-server";

const FORUM_BASE = "https://forum.makecode.com";
const MAKECODE_BASE = "https://arcade.makecode.com";
const CONCURRENCY_LIMIT = 5;

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

type TopicPage = DiscourseTopic & {
  post_stream: { posts: DiscoursePost[] };
  details?: {
    links?: { url: string; clicks: number }[];
  };
};

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
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429) {
      const delay = (attempt + 1) * 2000;
      console.warn(`Rate limited on ${url}, waiting ${delay}ms...`);
      await sleep(delay);
      continue;
    }
    return null;
  }
  return null;
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
  topicTitle: string,
  categoryId: number,
  categoryName: string,
  jamId: string | undefined,
  replyCount: number,
  viewCount: number,
  reactionCount: number,
  linkClicks: number
) {
  const forumUrl = `${FORUM_BASE}/t/${topicSlug}/${topicId}/${post.post_number}`;
  const now = new Date().toISOString();
  const { error } = await supabaseServer.from("game_forum_posts").upsert(
    {
      game_id: gameId,
      forum_topic_id: topicId,
      forum_post_id: post.id,
      forum_url: forumUrl,
      forum_topic_title: topicTitle,
      forum_category_id: categoryId,
      forum_category_name: categoryName,
      jam_id: jamId || null,
      seen_at: now,
      reply_count: Math.max(0, replyCount - 1),
      view_count: viewCount,
      post_cooked: post.cooked,
      reaction_count: reactionCount,
      link_clicks: linkClicks,
      reaction_refreshed_at: now,
      last_parsed_at: now,
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
  reactionCount?: number,
  linkClicks?: number
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
    topic.title,
    topic.category_id,
    categoryName,
    jamId,
    topic.posts_count || 0,
    topic.views || 0,
    reactionCount ?? (post.reaction_users_count ?? 0),
    linkClicks ?? 0
  );
  return gameId;
}

async function refreshKnownPostMetadata(
  post: DiscoursePost,
  topic: DiscourseTopic,
  linkClicks: Map<string, number>
) {
  const urls = extractShareUrls(post.cooked);
  const clicks = urls.length ? (linkClicks.get(urls[0]) ?? 0) : 0;
  const { error } = await supabaseServer
    .from("game_forum_posts")
    .update({
      reaction_count: post.reaction_users_count ?? 0,
      link_clicks: clicks,
      forum_topic_title: topic.title,
      reaction_refreshed_at: new Date().toISOString(),
    })
    .eq("forum_topic_id", topic.id)
    .eq("forum_post_id", post.id);
  if (error) throw error;
}

async function refreshSinglePostReactions(forumPostId: number) {
  const post = await fetchJson<DiscoursePost>(`${FORUM_BASE}/posts/${forumPostId}.json`);
  if (!post) return;

  const { error } = await supabaseServer
    .from("game_forum_posts")
    .update({
      reaction_count: post.reaction_users_count ?? 0,
      reaction_refreshed_at: new Date().toISOString(),
    })
    .eq("forum_post_id", forumPostId);
  if (error) throw error;
}

function buildLinkClicksMap(page: TopicPage | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!page?.details?.links) return map;
  for (const link of page.details.links) {
    map.set(link.url, link.clicks);
  }
  return map;
}

/**
 * Walks a topic's pages back-to-front, stopping as soon as it hits a page
 * where every post is already known (already has a `game_forum_posts` row).
 * This lets a mostly-ingested thread that gets bumped by one new reply only
 * re-fetch the handful of trailing pages that could contain unseen posts,
 * instead of re-crawling the whole thread.
 */
async function fetchThreadTailPosts(
  topicId: number,
  knownIds: Set<number>,
  firstPage?: TopicPage
): Promise<{ posts: DiscoursePost[]; linkClicks: Map<string, number>; crawledIds: Set<number> }> {
  const first = firstPage || (await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json`));
  if (!first) return { posts: [], linkClicks: new Map(), crawledIds: new Set() };

  const linkClicks = buildLinkClicksMap(first);
  const perPage = first.post_stream.posts.length || 20;
  const totalPages = Math.ceil(first.posts_count / perPage);
  const posts: DiscoursePost[] = [];
  const crawledIds = new Set<number>();

  for (let page = totalPages; page >= 1; page--) {
    const pageData = page === 1 ? first : await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json?page=${page}`);
    if (!pageData) continue;

    const pagePosts = pageData.post_stream.posts;
    posts.push(...pagePosts);
    for (const post of pagePosts) crawledIds.add(post.id);

    const pageFullyKnown = pagePosts.length > 0 && pagePosts.every((post) => knownIds.has(post.id));
    if (pageFullyKnown) break;
  }

  return { posts, linkClicks, crawledIds };
}

async function getKnownPostIds(topicId: number): Promise<Set<number>> {
  const { data, error } = await supabaseServer
    .from("game_forum_posts")
    .select("forum_post_id")
    .eq("forum_topic_id", topicId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.forum_post_id as number));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function batchWithDelay<T>(
  items: T[],
  batchSize: number,
  delayMs: number,
  fn: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fn));
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (rejected.length) throw rejected[0].reason;
    if (i + batchSize < items.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }
}

type IngestTopicOptions = {
  jamId?: string;
  skipFirstPost?: boolean;
  firstPage?: TopicPage;
  delayMs?: number;
};

type ProcessTopicPostsOptions = {
  jamId?: string;
  skipFirstPost?: boolean;
};

async function processTopicPosts(
  posts: DiscoursePost[],
  topic: DiscourseTopic,
  categoryMap: CategoryMap,
  knownIds: Set<number>,
  linkClicks: Map<string, number>,
  delayMs: number,
  options: ProcessTopicPostsOptions = {}
): Promise<{ games: number; errors: string[] }> {
  const errors: string[] = [];
  let games = 0;

  await batchWithDelay(posts, CONCURRENCY_LIMIT, delayMs, async (post) => {
    if (options.skipFirstPost && post.post_number === 1) return;

    try {
      if (knownIds.has(post.id)) {
        await refreshKnownPostMetadata(post, topic, linkClicks);
      } else {
        const urls = extractShareUrls(post.cooked);
        for (const url of urls) {
          const gameId = await ingestPost(url, post, topic, categoryMap, options.jamId, undefined, linkClicks.get(url));
          if (gameId) games++;
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  });

  return { games, errors };
}

async function ingestTopic(
  topic: DiscourseTopic,
  categoryMap: CategoryMap,
  options: IngestTopicOptions = {}
): Promise<{ games: number; errors: string[] }> {
  const knownIds = await getKnownPostIds(topic.id);
  // A topic we've never looked at before is treated like a mini backfill
  // (slower pacing); a topic we've already mostly mined only needs a small
  // tail crawl, so the default (fast) pacing is fine.
  const delayMs = knownIds.size === 0 ? 1000 : (options.delayMs ?? 100);

  const { posts, linkClicks, crawledIds } = await fetchThreadTailPosts(topic.id, knownIds, options.firstPage);

  const { games, errors } = await processTopicPosts(posts, topic, categoryMap, knownIds, linkClicks, delayMs, {
    jamId: options.jamId,
    skipFirstPost: options.skipFirstPost,
  });

  // Anything known but outside the crawled tail wasn't re-fetched as part of
  // a page, but its reactions/click count may still have changed - poke it
  // individually by post id instead of re-crawling its page.
  const uncrawledKnownIds = [...knownIds].filter((id) => !crawledIds.has(id));
  await batchWithDelay(uncrawledKnownIds, CONCURRENCY_LIMIT, delayMs, async (forumPostId) => {
    try {
      await refreshSinglePostReactions(forumPostId);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  });

  return { games, errors };
}

export async function ingestJamTopic(
  topicId: number,
  lastIngestAt?: Date,
  delayMs = 100
): Promise<{ games: number; errors: string[] }> {
  const categoryMap = await getCategories();
  const first = await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json`);
  if (!first) return { games: 0, errors: [`topic ${topicId} not found`] };

  const topic: DiscourseTopic = { ...first, id: topicId };
  const jam = await upsertJam(topic);

  return ingestTopic(topic, categoryMap, { jamId: jam, skipFirstPost: true, firstPage: first, delayMs });
}

export async function ingestCategoryTopics(
  categoryId: number,
  limit = 20,
  lastIngestAt?: Date,
  delayMs = 100
): Promise<{ games: number; errors: string[] }> {
  const category = await fetchJson<{ topic_list: { topics: DiscourseTopic[] } }>(
    `${FORUM_BASE}/c/${categoryId}.json`
  );
  if (!category) return { games: 0, errors: [`category ${categoryId} not found`] };

  const categoryMap = await getCategories();
  const errors: string[] = [];
  let games = 0;

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const topics = category.topic_list.topics
    .filter((t) => {
      if (!lastIngestAt) return true;
      const bumpedAt = t.bumped_at ? new Date(t.bumped_at) : null;
      return bumpedAt && bumpedAt >= twoDaysAgo;
    })
    .slice(0, limit);

  for (const topic of topics) {
    const result = await ingestTopic(topic, categoryMap, { delayMs });
    games += result.games;
    errors.push(...result.errors);
  }

  return { games, errors };
}

async function fetchAllTopicPosts(topicId: number): Promise<{ topic: DiscourseTopic | null; posts: DiscoursePost[]; linkClicks: Map<string, number> }> {
  const first = await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json`);
  if (!first) return { topic: null, posts: [], linkClicks: new Map() };

  const linkClicks = buildLinkClicksMap(first);
  const posts: DiscoursePost[] = [...first.post_stream.posts];
  const perPage = first.post_stream.posts.length || 20;
  const pages = Math.ceil(first.posts_count / perPage);

  for (let page = 2; page <= pages; page++) {
    const next = await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json?page=${page}`);
    if (!next) break;
    posts.push(...next.post_stream.posts);
  }

  const topic: DiscourseTopic = { ...first, id: topicId };
  return { topic, posts, linkClicks };
}

type BackfillTopicOptions = {
  jamId?: string;
  skipFirstPost?: boolean;
  delayMs?: number;
};

async function backfillTopic(
  topic: DiscourseTopic,
  categoryMap: CategoryMap,
  options: BackfillTopicOptions = {}
): Promise<{ games: number; errors: string[] }> {
  const delayMs = options.delayMs ?? 1000;
  const knownIds = await getKnownPostIds(topic.id);
  const { posts, linkClicks } = await fetchAllTopicPosts(topic.id);

  return processTopicPosts(posts, topic, categoryMap, knownIds, linkClicks, delayMs, {
    jamId: options.jamId,
    skipFirstPost: options.skipFirstPost,
  });
}

export async function backfillJamTopic(
  topicId: number,
  delayMs = 1000
): Promise<{ games: number; errors: string[] }> {
  const categoryMap = await getCategories();
  const first = await fetchJson<TopicPage>(`${FORUM_BASE}/t/${topicId}.json`);
  if (!first) return { games: 0, errors: [`topic ${topicId} not found`] };

  const topic: DiscourseTopic = { ...first, id: topicId };
  const jam = await upsertJam(topic);

  return backfillTopic(topic, categoryMap, { jamId: jam, skipFirstPost: true, delayMs });
}

type BackfillCategoryOptions = {
  limit?: number;
  since?: Date;
  delayMs?: number;
  topicDelayMs?: number;
  listDelayMs?: number;
  skipTopicIds?: Set<number>;
  onTopicStart?: (topic: DiscourseTopic, index: number, total: number) => void;
  onTopicCompleted?: (topic: DiscourseTopic, index: number, total: number) => void;
};

export async function backfillCategoryTopics(
  categoryId: number,
  options: BackfillCategoryOptions = {}
): Promise<{ games: number; errors: string[] }> {
  const limit = options.limit ?? 500;
  const since = options.since;
  const delayMs = options.delayMs ?? 1000;
  const topicDelayMs = options.topicDelayMs ?? 0;
  const listDelayMs = options.listDelayMs ?? 1000;

  const topics: DiscourseTopic[] = [];
  let page = 0;
  while (topics.length < limit) {
    const url = page === 0 ? `${FORUM_BASE}/c/${categoryId}.json` : `${FORUM_BASE}/c/${categoryId}.json?page=${page}`;
    const category = await fetchJson<{ topic_list: { topics: DiscourseTopic[] } }>(url);
    if (!category || !category.topic_list.topics.length) break;

    const pageTopics = category.topic_list.topics;
    topics.push(...pageTopics);

    const allOld = since && pageTopics.every((t) => !t.bumped_at || new Date(t.bumped_at) < since);
    if (allOld) break;

    if (pageTopics.length < 30) break;
    page++;
    if (listDelayMs > 0) await sleep(listDelayMs);
  }

  const categoryMap = await getCategories();
  const errors: string[] = [];
  let games = 0;

  const skipTopicIds = options.skipTopicIds || new Set<number>();
  const filtered = topics
    .filter((t) => !skipTopicIds.has(t.id))
    .filter((t) => !since || (t.bumped_at && new Date(t.bumped_at) >= since))
    .slice(0, limit);

  for (let i = 0; i < filtered.length; i++) {
    const topic = filtered[i];
    options.onTopicStart?.(topic, i, filtered.length);
    const result = await backfillTopic(topic, categoryMap, { delayMs });
    games += result.games;
    errors.push(...result.errors);
    options.onTopicCompleted?.(topic, i, filtered.length);
    if (topicDelayMs > 0 && i < filtered.length - 1) {
      await sleep(topicDelayMs);
    }
  }

  return { games, errors };
}

export async function backfillAll(
  options: {
    since?: Date;
    categoryDelayMs?: number;
    categoryTopicDelayMs?: number;
    jamDelayMs?: number;
    skipTopicIds?: Set<number>;
    onProgress?: (message: string) => void;
    onTopicCompleted?: (topic: DiscourseTopic, index: number, total: number) => void;
  } = {}
): Promise<IngestResult> {
  const result: IngestResult = { jams: 0, games: 0, posts: 0, errors: [] };
  const log = options.onProgress || (() => {});

  log("Backfilling jam topic 44801...");
  const jam = await backfillJamTopic(44801, options.jamDelayMs ?? 1000);
  result.jams = 1;
  result.games += jam.games;
  result.errors.push(...jam.errors);
  log(`Jam topic done: ${jam.games} games, ${jam.errors.length} errors`);

  const sinceText = options.since ? options.since.toISOString() : "all time";
  log(`Backfilling category 5 topics since ${sinceText}...`);
  const cat = await backfillCategoryTopics(5, {
    since: options.since,
    delayMs: options.categoryDelayMs ?? 1000,
    topicDelayMs: options.categoryTopicDelayMs ?? 0,
    listDelayMs: options.categoryDelayMs ?? 1000,
    skipTopicIds: options.skipTopicIds,
    onTopicStart: (topic, idx, total) => {
      log(`[${idx + 1}/${total}] ${topic.title} — ${topic.posts_count} posts`);
    },
    onTopicCompleted: options.onTopicCompleted,
  });
  result.games += cat.games;
  result.errors.push(...cat.errors);
  log(`Category 5 done: ${cat.games} games, ${cat.errors.length} errors`);

  const { count } = await supabaseServer.from("game_forum_posts").select("*", { count: "exact", head: true });
  result.posts = count || 0;

  return result;
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

  const cat = await ingestCategoryTopics(5, 20, lastIngestAt);
  result.games += cat.games;
  result.errors.push(...cat.errors);

  const { count } = await supabaseServer.from("game_forum_posts").select("*", { count: "exact", head: true });
  result.posts = count || 0;

  try {
    const { error } = await supabaseServer.rpc("snapshot_game_stats");
    if (error) throw error;
  } catch (error) {
    console.error("Failed to snapshot game stats:", error);
    result.errors.push(`snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const { error } = await supabaseServer.rpc("refresh_game_daily_stats");
    if (error) throw error;
  } catch (error) {
    console.error("Failed to refresh game daily stats:", error);
    result.errors.push(`refresh daily stats failed: ${error instanceof Error ? error.message : String(error)}`);
  }

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
