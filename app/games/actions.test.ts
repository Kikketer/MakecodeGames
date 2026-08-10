import { describe, it, expect, vi, beforeEach } from "vitest";
import { addLike, listGames, recordClick, searchGames, searchGamesAndTopics, getTopicTitle } from "./actions";

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

  it("uses reaction_count as likes and game_stats for clicks", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await listGames({ sort: "hot", limit: 10 });

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

  it("sorts by trending delta from snapshots", async () => {
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, {
        ...responses,
        game_stats_snapshots: {
          data: [
            { game_id: "g1", likes: 8, plays: 3 },
            { game_id: "g2", likes: 5, plays: 0 },
          ],
        },
      }[table])
    );

    const result = await listGames({ sort: "trending", limit: 10 });

    expect(result.map((g) => g.id)).toEqual(["g1", "g2"]);
    const g1 = result.find((g) => g.id === "g1");
    const g2 = result.find((g) => g.id === "g2");
    expect((g1?.likes ?? 0) + (g1?.plays ?? 0)).toBe(16);
    expect((g2?.likes ?? 0) + (g2?.plays ?? 0)).toBe(6);
  });

  it("fetches games for a forum topic", async () => {
    const result = await listGames({ topic: 123, sort: "hot", limit: 10 });

    expect(mockSupabase.from).toHaveBeenCalledWith("game_forum_posts");
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.id)).toEqual(expect.arrayContaining(["g1", "g2"]));
  });

  it("sorts newest by posted_at when present (fetchAll path)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-10T00:00:00.000Z");
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, {
        ...responses,
        game_daily_stats: {
          data: [
            // g1 was crawled recently but posted long ago; g2 was crawled
            // earlier but posted more recently. Newest should put g2 first.
            { id: "g1", first_seen_at: "2026-08-09T00:00:00Z", posted_at: "2026-07-01T00:00:00Z", likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null },
            { id: "g2", first_seen_at: "2026-08-01T00:00:00Z", posted_at: "2026-08-05T00:00:00Z", likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null },
          ],
        },
      }[table])
    );

    const result = await listGames({ sort: "newest", limit: 10 });
    vi.useRealTimers();

    expect(result.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("falls back to first_seen_at for newest when posted_at is null", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-10T00:00:00.000Z");
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, {
        ...responses,
        game_daily_stats: {
          data: [
            { id: "g1", first_seen_at: "2026-08-01T00:00:00Z", posted_at: null, likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null },
            { id: "g2", first_seen_at: "2026-08-02T00:00:00Z", posted_at: null, likes: 0, clicks: 0, link_clicks: 0, plays: 0, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null },
          ],
        },
      }[table])
    );

    const result = await listGames({ sort: "newest", limit: 10 });
    vi.useRealTimers();

    expect(result.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("sorts hot by posted_at time-decay when present", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-10T00:00:00.000Z");
    // Both games have identical likes+plays, so the one posted more recently
    // (smaller age) wins under the hot formula. g1 was crawled today but
    // posted a month ago; g2 was crawled early but posted yesterday.
    mockSupabase.from = vi.fn((table: string) =>
      makeBuilder(table, {
        ...responses,
        game_daily_stats: {
          data: [
            { id: "g1", first_seen_at: "2026-08-09T00:00:00Z", posted_at: "2026-07-10T00:00:00Z", likes: 10, clicks: 0, link_clicks: 0, plays: 10, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null },
            { id: "g2", first_seen_at: "2026-08-01T00:00:00Z", posted_at: "2026-08-09T00:00:00Z", likes: 10, clicks: 0, link_clicks: 0, plays: 10, forum_url: "", forum_topic_title: null, replies: 0, views: 0, post_cooked: null },
          ],
        },
      }[table])
    );

    const result = await listGames({ sort: "hot", limit: 10 });
    vi.useRealTimers();

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
