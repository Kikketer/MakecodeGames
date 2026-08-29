import { describe, it, expect, vi, beforeEach } from "vitest";
import { addLike, listGames, listAllGames, countAllLetters, recordClick, searchGames, searchGamesAndTopics, getTopicTitle } from "./actions";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockRefreshReactions = vi.hoisted(() => vi.fn());
const mockGetAlgoliaSearchClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: mockSupabase }));
vi.mock("@/lib/auth", () => ({ getUser: mockGetUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/ingest-games", () => ({ refreshGameReactions: mockRefreshReactions }));
vi.mock("@/lib/algolia", () => ({
  getAlgoliaSearchClient: mockGetAlgoliaSearchClient,
  getAlgoliaWriteClient: vi.fn(),
  GAMES_INDEX: "games",
  FORUM_TOPICS_INDEX: "forum_topics",
}));

function makeBuilder(table: string, response: unknown) {
  const thenable = {
    then: (resolve: (value: unknown) => void) => resolve(response),
  };
  return new Proxy(thenable, {
    get(_, prop) {
      if (prop === "then") return thenable.then;
      return () => makeBuilder(table, response);
    },
  });
}

// Like makeBuilder, but records every chained method call (e.g. order/limit)
// so tests can assert that sort + limit are pushed into the Supabase query
// rather than applied to an unbounded fetch in JS.
function makeRecordingBuilder(response: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const thenable = {
    then: (resolve: (value: unknown) => void) => resolve(response),
  };
  const builder = new Proxy(thenable, {
    get(_, prop) {
      if (prop === "then") return thenable.then;
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return builder;
      };
    },
  });
  return { builder, calls };
}

const responses = {
  games: {
    data: [
      { id: "g1", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null },
      { id: "g2", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null },
    ],
  },
  game_stats: {
    data: [
      { game_id: "g1", clicks: 2 },
      { game_id: "g2", clicks: 0 },
    ],
  },
  game_forum_posts: {
    data: [
      { game_id: "g1", forum_url: "https://forum.makecode.com/t/g1", reply_count: 3, view_count: 5, post_cooked: null, reaction_count: 10, link_clicks: 4, posted_at: null },
      { game_id: "g2", forum_url: "https://forum.makecode.com/t/g2", reply_count: 0, view_count: 1, post_cooked: null, reaction_count: 5, link_clicks: 1, posted_at: null },
    ],
  },
  game_daily_stats: {
    data: [
      { id: "g1", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null, likes: 10, clicks: 2, link_clicks: 4, plays: 6, forum_url: "https://forum.makecode.com/t/g1", forum_topic_title: null, replies: 3, views: 5, post_cooked: null },
      { id: "g2", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null, likes: 5, clicks: 0, link_clicks: 1, plays: 1, forum_url: "https://forum.makecode.com/t/g2", forum_topic_title: null, replies: 0, views: 1, post_cooked: null },
    ],
  },
  // game_scores mirrors game_daily_stats plus the computed score columns the
  // view adds (sort_date/hot_score/trending_score). The fetchAll path queries
  // this view with ORDER BY + LIMIT pushed into the database.
  game_scores: {
    data: [
      { id: "g1", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null, likes: 10, clicks: 2, link_clicks: 4, plays: 6, forum_url: "https://forum.makecode.com/t/g1", forum_topic_title: null, replies: 3, views: 5, post_cooked: null, sort_date: "2026-08-01T00:00:00Z", hot_score: 4.0, trending_score: 6 },
      { id: "g2", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null, likes: 5, clicks: 0, link_clicks: 1, plays: 1, forum_url: "https://forum.makecode.com/t/g2", forum_topic_title: null, replies: 0, views: 1, post_cooked: null, sort_date: "2026-08-02T00:00:00Z", hot_score: 2.0, trending_score: 1 },
    ],
  },
  game_stats_snapshots: {
    data: [],
  },
  game_likes: {
    data: [{ game_id: "g1" }],
  },
};

describe("addLike", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn();
    mockGetUser.mockReset();
    mockRevalidatePath.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("throws if the user is not signed in", async () => {
    mockGetUser.mockResolvedValue(null);
    await expect(addLike("game-1")).rejects.toThrow("Unauthorized");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("upserts a like with conflict-ignoring strategy and revalidates", async () => {
    const user = { id: "user-1" };
    mockGetUser.mockResolvedValue(user);

    const mockUpsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
    mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

    await addLike("game-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("game_likes");
    expect(mockUpsert).toHaveBeenCalledWith(
      { game_id: "game-1", user_id: "user-1" },
      { onConflict: "game_id,user_id", ignoreDuplicates: true }
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/games");
  });
});

describe("listGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, responses[table as keyof typeof responses]));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("fetchAll queries game_scores and passes rows through with their fields", async () => {
    mockGetUser.mockResolvedValue(null);
    const { builder, calls } = makeRecordingBuilder(responses.game_scores);
    mockSupabase.from = vi.fn((table: string) => (table === "game_scores" ? builder : makeBuilder(table, responses[table as keyof typeof responses])));

    const result = await listGames({ sort: "hot", limit: 10 });

    // The fetchAll path must query game_scores (not game_daily_stats) and push
    // ORDER BY + LIMIT into the database instead of fetching all rows.
    expect(mockSupabase.from).toHaveBeenCalledWith("game_scores");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("game_daily_stats");
    expect(calls).toContainEqual({ method: "order", args: ["hot_score", { ascending: false, nullsFirst: false }] });
    expect(calls).toContainEqual({ method: "limit", args: [10] });
    // Rows are returned as-is from the view (no JS re-sort / re-slice).
    expect(result).toHaveLength(2);
    const g1 = result.find((g) => g.id === "g1");
    const g2 = result.find((g) => g.id === "g2");
    expect(g1?.likes).toBe(10);
    expect(g1?.clicks).toBe(2);
    expect(g1?.link_clicks).toBe(4);
    expect(g1?.plays).toBe(6);
    expect(g2?.likes).toBe(5);
    expect(g2?.clicks).toBe(0);
    expect(g2?.link_clicks).toBe(1);
    expect(g2?.plays).toBe(1);
  });

  it("fetchAll trending orders by trending_score and does not fetch snapshots in JS", async () => {
    const { builder, calls } = makeRecordingBuilder(responses.game_scores);
    mockSupabase.from = vi.fn((table: string) => (table === "game_scores" ? builder : makeBuilder(table, responses[table as keyof typeof responses])));

    const result = await listGames({ sort: "trending", limit: 10 });

    expect(mockSupabase.from).toHaveBeenCalledWith("game_scores");
    expect(calls).toContainEqual({ method: "order", args: ["trending_score", { ascending: false, nullsFirst: false }] });
    expect(calls).toContainEqual({ method: "limit", args: [10] });
    // The trending score is computed in the view via the snapshot join, so the
    // app must not issue a separate game_stats_snapshots query.
    expect(mockSupabase.from).not.toHaveBeenCalledWith("game_stats_snapshots");
    expect(result.map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("fetches games for a forum topic", async () => {
    const result = await listGames({ topic: 123, sort: "hot", limit: 10 });

    expect(mockSupabase.from).toHaveBeenCalledWith("game_forum_posts");
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.id)).toEqual(expect.arrayContaining(["g1", "g2"]));
  });

  it("fetchAll newest orders by sort_date (coalesced posted_at/first_seen_at)", async () => {
    // The coalesce(posted_at, first_seen_at) fallback now lives in the
    // game_scores view's sort_date column, so the app just orders by it.
    const scoresData = {
      data: [
        // Returned in DB-sorted order: g2 (posted 08-05) before g1 (posted 07-01).
        { id: "g2", first_seen_at: "2026-08-01T00:00:00Z", posted_at: "2026-08-05T00:00:00Z", likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null, sort_date: "2026-08-05T00:00:00Z", hot_score: 0, trending_score: 0 },
        { id: "g1", first_seen_at: "2026-08-09T00:00:00Z", posted_at: "2026-07-01T00:00:00Z", likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null, sort_date: "2026-07-01T00:00:00Z", hot_score: 0, trending_score: 0 },
      ],
    };
    const { builder, calls } = makeRecordingBuilder(scoresData);
    mockSupabase.from = vi.fn((table: string) => (table === "game_scores" ? builder : makeBuilder(table, responses[table as keyof typeof responses])));

    const result = await listGames({ sort: "newest", limit: 10 });

    expect(calls).toContainEqual({ method: "order", args: ["sort_date", { ascending: false, nullsFirst: false }] });
    expect(calls).toContainEqual({ method: "limit", args: [10] });
    // Rows come back in DB order; the app must not re-sort them.
    expect(result.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("fetchAll newest with null posted_at relies on the view's sort_date coalesce", async () => {
    // When posted_at is null the view's sort_date falls back to first_seen_at.
    // The app only orders by sort_date, so this just verifies the query shape.
    const scoresData = {
      data: [
        { id: "g2", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null, likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null, sort_date: "2026-08-02T00:00:00Z", hot_score: 0, trending_score: 0 },
        { id: "g1", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null, likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null, sort_date: "2026-08-01T00:00:00Z", hot_score: 0, trending_score: 0 },
      ],
    };
    const { builder, calls } = makeRecordingBuilder(scoresData);
    mockSupabase.from = vi.fn((table: string) => (table === "game_scores" ? builder : makeBuilder(table, responses[table as keyof typeof responses])));

    const result = await listGames({ sort: "newest", limit: 10 });

    expect(calls).toContainEqual({ method: "order", args: ["sort_date", { ascending: false, nullsFirst: false }] });
    expect(result.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("fetchAll hot orders by hot_score (time-decay computed in the view)", async () => {
    // hot_score is computed in the view from likes+plays and age, so the app
    // just orders by hot_score. Provide rows in DB-sorted order.
    const scoresData = {
      data: [
        { id: "g2", first_seen_at: "2026-08-01T00:00:00Z", posted_at: "2026-08-09T00:00:00Z", likes: 10, clicks: 0, link_clicks: 0, plays: 10, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null, sort_date: "2026-08-09T00:00:00Z", hot_score: 8.0, trending_score: 0 },
        { id: "g1", first_seen_at: "2026-08-09T00:00:00Z", posted_at: "2026-07-10T00:00:00Z", likes: 10, clicks: 0, link_clicks: 0, plays: 10, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null, sort_date: "2026-07-10T00:00:00Z", hot_score: 1.0, trending_score: 0 },
      ],
    };
    const { builder, calls } = makeRecordingBuilder(scoresData);
    mockSupabase.from = vi.fn((table: string) => (table === "game_scores" ? builder : makeBuilder(table, responses[table as keyof typeof responses])));

    const result = await listGames({ sort: "hot", limit: 10 });

    expect(calls).toContainEqual({ method: "order", args: ["hot_score", { ascending: false, nullsFirst: false }] });
    expect(calls).toContainEqual({ method: "limit", args: [10] });
    expect(result.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("sorts newest by posted_at from game_forum_posts on the topic path", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-10T00:00:00.000Z");
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, {
        ...responses,
        games: {
          data: [
            { id: "g1", first_seen_at: "2026-08-09T00:00:00Z", posted_at: null },
            { id: "g2", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null },
          ],
        },
        game_forum_posts: {
          data: [
            // g1 posted long ago, g2 posted recently — posted_at from the
            // posts rows should drive the order, not first_seen_at from games.
            { game_id: "g1", forum_url: "https://forum.makecode.com/t/g1", reply_count: 0, view_count: 0, post_cooked: null, reaction_count: 0, link_clicks: 0, posted_at: "2026-07-01T00:00:00Z" },
            { game_id: "g2", forum_url: "https://forum.makecode.com/t/g2", reply_count: 0, view_count: 0, post_cooked: null, reaction_count: 0, link_clicks: 0, posted_at: "2026-08-05T00:00:00Z" },
          ],
        },
      }[table])
    );

    const result = await listGames({ topic: 123, sort: "newest", limit: 10 });
    vi.useRealTimers();

    expect(result.map((g) => g.id)).toEqual(["g2", "g1"]);
  });
});

const searchResponses = {
  games: {
    data: [
      { id: "g1", title: "Space Quest", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null },
      { id: "g2", title: "My Space Game", first_seen_at: "2026-08-03T00:00:00Z", posted_at: null },
      { id: "g3", title: "A Space Adventure", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null },
    ],
  },
  game_stats: {
    data: [
      { game_id: "g1", clicks: 1 },
      { game_id: "g2", clicks: 0 },
      { game_id: "g3", clicks: 3 },
    ],
  },
  game_forum_posts: {
    data: [
      { game_id: "g1", forum_url: "https://forum.makecode.com/t/g1", reply_count: 1, view_count: 2, post_cooked: null, reaction_count: 5, link_clicks: 2, posted_at: null },
      { game_id: "g2", forum_url: "https://forum.makecode.com/t/g2", reply_count: 0, view_count: 1, post_cooked: null, reaction_count: 2, link_clicks: 0, posted_at: null },
      { game_id: "g3", forum_url: "", reply_count: 0, view_count: 0, post_cooked: null, reaction_count: 8, link_clicks: 3, posted_at: null },
    ],
  },
  game_likes: {
    data: [],
  },
};

const algoliaSearchResponses = {
  results: [
    {
      hits: [
        {
          objectID: "t1",
          forum_topic_id: 101,
          title: "Space Games",
          category_name: "Games",
          reply_count: 5,
          view_count: 50,
        },
      ],
    },
    {
      hits: [
        { objectID: "g1", title: "Space Quest" },
        { objectID: "g3", title: "A Space Adventure" },
        { objectID: "g2", title: "My Space Game" },
      ],
    },
  ],
};

describe("searchGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, searchResponses[table as keyof typeof searchResponses]));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("returns an empty array for empty or whitespace-only queries", async () => {
    expect(await searchGames("")).toEqual([]);
    expect(await searchGames("   ")).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("ranks matches by earliest title position, then newest first_seen_at", async () => {
    const result = await searchGames("space");
    expect(result.map((g) => g.id)).toEqual(["g1", "g3", "g2"]);
  });

  it("uses reaction_count as likes and stats for clicks", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await searchGames("space");

    expect(result).toHaveLength(3);
    const g1 = result.find((g) => g.id === "g1");
    const g2 = result.find((g) => g.id === "g2");
    const g3 = result.find((g) => g.id === "g3");
    expect(g1?.likes).toBe(5);
    expect(g1?.clicks).toBe(1);
    expect(g1?.link_clicks).toBe(2);
    expect(g1?.plays).toBe(3);
    expect(g1?.forum_url).toBe("https://forum.makecode.com/t/g1");
    expect(g2?.likes).toBe(2);
    expect(g2?.plays).toBe(0);
    expect(g3?.likes).toBe(8);
    expect(g3?.clicks).toBe(3);
    expect(g3?.link_clicks).toBe(3);
    expect(g3?.plays).toBe(6);
    expect(g3?.forum_url).toBe("");
  });
});

describe("searchGamesAndTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, searchResponses[table as keyof typeof searchResponses]));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("falls back to Supabase ilike when Algolia is not configured", async () => {
    mockGetAlgoliaSearchClient.mockReturnValue(null);

    const result = await searchGamesAndTopics("space");

    expect(result.topics).toEqual([]);
    expect(result.games.map((g) => g.id)).toEqual(["g1", "g3", "g2"]);
  });

  it("uses Algolia when configured and hydrates games in result order", async () => {
    mockGetAlgoliaSearchClient.mockReturnValue({
      search: vi.fn(() => Promise.resolve(algoliaSearchResponses)),
    });

    const result = await searchGamesAndTopics("space", 4);

    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]).toMatchObject({
      forum_topic_id: 101,
      title: "Space Games",
      category_name: "Games",
      reply_count: 5,
      view_count: 50,
    });
    expect(result.games.map((g) => g.id)).toEqual(["g1", "g3", "g2"]);
  });

  it("returns empty results for empty or whitespace queries", async () => {
    expect(await searchGamesAndTopics("")).toEqual({ topics: [], games: [] });
    expect(await searchGamesAndTopics("   ")).toEqual({ topics: [], games: [] });
  });
});

describe("getTopicTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("returns the topic title from a matching forum post", async () => {
    mockSupabase.from.mockReturnValue(
      makeBuilder("game_forum_posts", {
        data: [{ forum_topic_title: "Space Games" }],
      })
    );

    const title = await getTopicTitle(101);
    expect(title).toBe("Space Games");
  });

  it("returns null when no posts match the topic", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder("game_forum_posts", { data: [] }));

    const title = await getTopicTitle(999);
    expect(title).toBeNull();
  });
});

const allGamesResponses = {
  games: {
    data: [
      { id: "a1", title: "Apple Game", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null },
      { id: "a2", title: "aardvark quest", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null },
      { id: "b1", title: "Banana Run", first_seen_at: "2026-08-03T00:00:00Z", posted_at: null },
      { id: "o1", title: "123 Numbers", first_seen_at: "2026-08-04T00:00:00Z", posted_at: null },
      { id: "o2", title: "!Special", first_seen_at: "2026-08-05T00:00:00Z", posted_at: null },
    ],
    count: 5,
  },
  game_stats: {
    data: [
      { game_id: "a1", clicks: 3 },
      { game_id: "a2", clicks: 1 },
      { game_id: "b1", clicks: 5 },
      { game_id: "o1", clicks: 0 },
      { game_id: "o2", clicks: 2 },
    ],
  },
  game_forum_posts: {
    data: [
      { game_id: "a1", forum_url: "https://forum/a1", reply_count: 1, view_count: 10, post_cooked: null, reaction_count: 4, link_clicks: 2, posted_at: null },
      { game_id: "a2", forum_url: "https://forum/a2", reply_count: 0, view_count: 5, post_cooked: null, reaction_count: 2, link_clicks: 1, posted_at: null },
      { game_id: "b1", forum_url: "https://forum/b1", reply_count: 3, view_count: 20, post_cooked: null, reaction_count: 7, link_clicks: 3, posted_at: null },
      { game_id: "o1", forum_url: "", reply_count: 0, view_count: 0, post_cooked: null, reaction_count: 0, link_clicks: 0, posted_at: null },
      { game_id: "o2", forum_url: "https://forum/o2", reply_count: 1, view_count: 2, post_cooked: null, reaction_count: 1, link_clicks: 0, posted_at: null },
    ],
  },
};

describe("listAllGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, allGamesResponses[table as keyof typeof allGamesResponses]));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("sorts games alphabetically ascending, case-insensitive", async () => {
    const { games } = await listAllGames({ letter: "A", page: 1 });

    // Case-insensitive alphabetical sort. Symbols/digits sort before
    // letters under localeCompare with sensitivity "base"; the key
    // assertion is that "aardvark quest" precedes "Apple Game".
    expect(games.map((g) => g.title)).toEqual([
      "!Special",
      "123 Numbers",
      "aardvark quest",
      "Apple Game",
      "Banana Run",
    ]);
    // Explicit case-insensitive check on the A titles.
    const aTitles = games.filter((g) => g.title.toLowerCase().startsWith("a")).map((g) => g.title);
    expect(aTitles).toEqual(["aardvark quest", "Apple Game"]);
  });

  it("merges stats and forum posts into game cards", async () => {
    const { games } = await listAllGames({ letter: "A", page: 1 });

    const a1 = games.find((g) => g.id === "a1");
    expect(a1?.likes).toBe(4);
    expect(a1?.clicks).toBe(3);
    expect(a1?.link_clicks).toBe(2);
    expect(a1?.plays).toBe(5);
    expect(a1?.forum_url).toBe("https://forum/a1");
    expect(a1?.replies).toBe(1);
    expect(a1?.views).toBe(10);

    const o1 = games.find((g) => g.id === "o1");
    expect(o1?.likes).toBe(0);
    expect(o1?.clicks).toBe(0);
    expect(o1?.plays).toBe(0);
    expect(o1?.forum_url).toBe("");
  });

  it("returns the total count from the query", async () => {
    const { total } = await listAllGames({ letter: "A", page: 1 });
    expect(total).toBe(5);
  });

  it("queries the games table for the letter", async () => {
    await listAllGames({ letter: "B", page: 1 });
    expect(mockSupabase.from).toHaveBeenCalledWith("games");
  });

  it("returns empty games with total when no data", async () => {
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, table === "games" ? { data: [], count: 0 } : allGamesResponses[table as keyof typeof allGamesResponses])
    );

    const result = await listAllGames({ letter: "Z", page: 1 });
    expect(result.games).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("handles the other bucket without error", async () => {
    const { games } = await listAllGames({ letter: "other", page: 1 });
    // Mock returns all games; verify it doesn't throw and returns merged data
    expect(games.length).toBeGreaterThan(0);
    expect(mockSupabase.from).toHaveBeenCalledWith("games");
  });
});

describe("countAllLetters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("returns counts for A-Z plus other", async () => {
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, {
        data: [
          { title: "Apple Game" },
          { title: "aardvark quest" },
          { title: "Banana Run" },
          { title: "123 Numbers" },
          { title: "!Special" },
        ],
      })
    );

    const counts = await countAllLetters();

    // All 26 letters should be present
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(counts).toHaveProperty(letter);
    }
    expect(counts).toHaveProperty("other");

    expect(counts["A"]).toBe(2);
    expect(counts["B"]).toBe(1);
    expect(counts["other"]).toBe(2);
    // Letters with no games should be 0
    expect(counts["Z"]).toBe(0);
  });

  it("returns all zeros when there are no games", async () => {
    mockSupabase.from = vi.fn(() => makeBuilder("games", { data: [] }));

    const counts = await countAllLetters();

    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(counts[letter]).toBe(0);
    }
    expect(counts["other"]).toBe(0);
  });
});

describe("recordClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, undefined));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
    mockGetAlgoliaSearchClient.mockReset();
  });

  it("records an anonymous click and refreshes reactions in the background", async () => {
    mockGetUser.mockRejectedValue(new Error("no session"));
    mockRefreshReactions.mockResolvedValue(undefined);

    await recordClick("game-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("game_clicks");
    expect(mockRefreshReactions).toHaveBeenCalledWith("game-1");
  });

  it("still records a click even if reaction refresh fails", async () => {
    mockGetUser.mockResolvedValue(null);
    mockRefreshReactions.mockRejectedValue(new Error("network"));

    await recordClick("game-2");

    expect(mockSupabase.from).toHaveBeenCalledWith("game_clicks");
    expect(mockRefreshReactions).toHaveBeenCalledWith("game-2");
  });
});
