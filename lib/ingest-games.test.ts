import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { refreshGameReactions, ingestPost, ingestCategoryTopics, ingestJamTopic, ingestOnce, listActiveCategoryTopics } from "./ingest-games";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: mockSupabase }));
vi.mock("@/lib/algolia", () => ({
  getAlgoliaSearchClient: vi.fn(() => null),
  getAlgoliaWriteClient: vi.fn(() => null),
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

function jsonResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}

let mockFetch: Mock;

describe("refreshGameReactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-02T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("skips posts refreshed within the last hour", async () => {
    mockSupabase.from = vi.fn(() =>
      makeBuilder("game_forum_posts", {
        data: [
          { forum_post_id: 100, reaction_refreshed_at: "2026-08-02T11:30:00.000Z" },
        ],
      })
    );

    await refreshGameReactions("game-1");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches and updates stale post reactions", async () => {
    const updateCalls: unknown[] = [];
    mockSupabase.from = vi.fn((table: string) => {
      const base = makeBuilder(table, { data: [] });
      if (table === "game_forum_posts") {
        return new Proxy(base as unknown as object, {
          get(_, prop) {
            if (prop === "select") {
              return () =>
                makeBuilder("game_forum_posts", {
                  data: [{ forum_post_id: 200, reaction_refreshed_at: "2026-08-02T10:00:00.000Z" }],
                });
            }
            if (prop === "update") {
              return (values: unknown) => {
                updateCalls.push(values);
                return makeBuilder("game_forum_posts", { error: null });
              };
            }
            return () => base;
          },
        });
      }
      return base;
    });

    mockFetch.mockResolvedValue(jsonResponse({ reaction_users_count: 42 }));

    await refreshGameReactions("game-1");

    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/posts/200.json", {
      headers: { Accept: "application/json" },
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      reaction_count: 42,
      reaction_refreshed_at: "2026-08-02T12:00:00.000Z",
    });
  });
});

describe("ingestPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-02T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("persists reaction_users_count as reaction_count when upserting a forum post", async () => {
    const upsertCalls: unknown[] = [];
    const calls: string[] = [];

    const chain = {
      select: () => { calls.push("select"); return chain; },
      eq: () => { calls.push("eq"); return chain; },
      limit: () => { calls.push("limit"); return chain; },
      single: () => { calls.push("single"); return chain; },
      insert: () => { calls.push("insert"); return chain; },
      upsert: (data: unknown) => { calls.push("upsert"); upsertCalls.push(data); return chain; },
      then: (resolve: (value: unknown) => void) => {
        if (calls.includes("upsert")) return resolve({ error: null });
        if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-1" }, error: null });
        if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
        return resolve({ data: null, error: null });
      },
    };

    mockSupabase.from = vi.fn(() => chain);

    mockFetch.mockResolvedValue(
      jsonResponse({ kind: "script", id: "abc-123", name: "Test Game" })
    );

    const post = {
      id: 12345,
      post_number: 2,
      cooked: '<p><a href="https://arcade.makecode.com/12345">game</a></p>',
      user_id: 1,
      username: "player",
      created_at: "2026-08-02T11:00:00.000Z",
      reaction_users_count: 7,
    };

    const topic = {
      id: 555,
      title: "A game topic",
      category_id: 5,
      posts_count: 2,
      views: 10,
    };

    const categoryMap = new Map([[5, "Games"]]);

    await ingestPost("https://arcade.makecode.com/12345", post, topic, categoryMap, "jam-1");

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]).toMatchObject({
      game_id: "game-1",
      reaction_count: 7,
      reaction_refreshed_at: "2026-08-02T12:00:00.000Z",
      last_parsed_at: "2026-08-02T12:00:00.000Z",
    });
  });
});

describe("ingestCategoryTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-04T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("only re-crawls the trailing pages of a mostly-ingested thread and pokes older known posts by id", async () => {
    // Topic 200 has 3 pages (posts 1-6). Pages 1 and 2 (posts 1-4) have
    // already been fully ingested; only post 6 (on page 3) is new.
    mockSupabase.from = vi.fn((table: string) => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        update: () => { calls.push("update"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (table === "game_forum_posts" && calls.includes("select") && calls.includes("eq") && !calls.includes("limit")) {
            return resolve({ data: [1, 2, 3, 4, 5].map((id) => ({ forum_post_id: id })), error: null });
          }
          if (calls.includes("upsert") || calls.includes("update")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-6" }, error: null });
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    const page1 = jsonResponse({
      id: 200,
      title: "Cool new game",
      category_id: 5,
      posts_count: 6,
      views: 50,
      post_stream: {
        posts: [
          { id: 1, post_number: 1, cooked: "<p>topic starter</p>", user_id: 1, username: "player", created_at: "2026-08-01T10:00:00.000Z", reaction_users_count: 2 },
          { id: 2, post_number: 2, cooked: "<p>older reply</p>", user_id: 2, username: "player2", created_at: "2026-08-01T11:00:00.000Z", reaction_users_count: 1 },
        ],
      },
    });
    const page2 = jsonResponse({
      id: 200,
      title: "Cool new game",
      category_id: 5,
      posts_count: 6,
      views: 50,
      post_stream: {
        posts: [
          { id: 3, post_number: 3, cooked: "<p>known reply</p>", user_id: 1, username: "player", created_at: "2026-08-02T10:00:00.000Z", reaction_users_count: 5 },
          { id: 4, post_number: 4, cooked: "<p>known reply 2</p>", user_id: 2, username: "player2", created_at: "2026-08-02T11:00:00.000Z", reaction_users_count: 1 },
        ],
      },
    });
    const page3 = jsonResponse({
      id: 200,
      title: "Cool new game",
      category_id: 5,
      posts_count: 6,
      views: 50,
      post_stream: {
        posts: [
          { id: 5, post_number: 5, cooked: "<p>known reply 3</p>", user_id: 1, username: "player", created_at: "2026-08-03T10:00:00.000Z", reaction_users_count: 3 },
          { id: 6, post_number: 6, cooked: '<p><a href="https://arcade.makecode.com/99999">game</a></p>', user_id: 2, username: "player2", created_at: "2026-08-04T09:00:00.000Z", reaction_users_count: 1 },
        ],
      },
    });

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 200,
                title: "Cool new game",
                posts_count: 6,
                bumped_at: "2026-08-04T10:00:00.000Z",
                category_id: 5,
                views: 50,
                created_at: "2026-08-01T00:00:00.000Z",
              },
              {
                id: 201,
                title: "Old thread",
                posts_count: 1,
                bumped_at: "2026-08-01T00:00:00.000Z",
                category_id: 5,
                views: 1,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ categories: [{ id: 5, name: "Games", slug: "games" }] }))
      // fetchThreadTailPosts fetches the topic to get metadata (posts_count etc.);
      // this payload is treated as page 1's content too.
      .mockResolvedValueOnce(page1)
      // walks backward from the last page: page 3 has the new post...
      .mockResolvedValueOnce(page3)
      // ...page 2 is fully known, so the walk stops there — page 1 is never re-fetched.
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-123", name: "Test Game" }))
      // posts 1 and 2 (on the skipped page 1) still get poked individually for fresh reactions.
      .mockResolvedValueOnce(jsonResponse({ id: 1, reaction_users_count: 9 }))
      .mockResolvedValueOnce(jsonResponse({ id: 2, reaction_users_count: 4 }));

    const result = await ingestCategoryTopics(5, 10, new Date("2026-08-03T00:00:00.000Z"));

    expect(result.games).toBe(1);

    const topicFetches = mockFetch.mock.calls
      .filter((call) => String(call[0]).includes("/t/200.json"))
      .map((call) => String(call[0]));
    expect(topicFetches).toEqual([
      "https://forum.makecode.com/t/200.json",
      "https://forum.makecode.com/t/200.json?page=3",
      "https://forum.makecode.com/t/200.json?page=2",
    ]);
    expect(topicFetches).not.toContain("https://forum.makecode.com/t/200.json?page=1");

    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/posts/1.json", {
      headers: { Accept: "application/json" },
    });
    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/posts/2.json", {
      headers: { Accept: "application/json" },
    });
  });

  it("stops crawling after maxPages even if no fully-known page is hit", async () => {
    // Topic 500 has 12 pages (1 post per page), no known posts.
    // The tail walk should stop after 10 pages (12, 11, ..., 3).
    mockSupabase.from = vi.fn((table: string) => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        update: () => { calls.push("update"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (table === "game_forum_posts" && calls.includes("select") && calls.includes("eq") && !calls.includes("limit")) {
            return resolve({ data: [], error: null });
          }
          if (calls.includes("upsert") || calls.includes("update")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-capped" }, error: null });
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    function makePage(pageNum: number, postId: number, gamePostId: number) {
      return jsonResponse({
        id: 500,
        title: "Chatting area have fun",
        category_id: 5,
        posts_count: 12,
        views: 1000,
        post_stream: {
          posts: [
            { id: postId, post_number: pageNum, cooked: `<p><a href="https://arcade.makecode.com/${gamePostId}">game</a></p>`, user_id: 1, username: "player", created_at: "2026-08-01T00:00:00.000Z", reaction_users_count: 0 },
          ],
        },
      });
    }

    const pages: Record<number, ReturnType<typeof makePage>> = {};
    for (let i = 1; i <= 12; i++) {
      pages[i] = makePage(i, i, 10000 + i);
    }

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 500,
                title: "Chatting area have fun",
                posts_count: 12,
                bumped_at: "2026-08-04T10:00:00.000Z",
                category_id: 5,
                views: 1000,
                created_at: "2026-08-01T00:00:00.000Z",
              },
              {
                id: 501,
                title: "Old chat",
                posts_count: 1,
                bumped_at: "2026-08-01T00:00:00.000Z",
                category_id: 5,
                views: 1,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ categories: [{ id: 5, name: "Games", slug: "games" }] }))
      .mockResolvedValueOnce(pages[1])
      .mockResolvedValueOnce(pages[12])
      .mockResolvedValueOnce(pages[11])
      .mockResolvedValueOnce(pages[10])
      .mockResolvedValueOnce(pages[9])
      .mockResolvedValueOnce(pages[8])
      .mockResolvedValueOnce(pages[7])
      .mockResolvedValueOnce(pages[6])
      .mockResolvedValueOnce(pages[5])
      .mockResolvedValueOnce(pages[4])
      .mockResolvedValueOnce(pages[3])
      // Games from pages 12, 11, 10, 9, 8, 7, 6, 5, 4, 3.
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-12", name: "Game 12" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-11", name: "Game 11" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-10", name: "Game 10" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-9", name: "Game 9" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-8", name: "Game 8" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-7", name: "Game 7" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-6", name: "Game 6" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-5", name: "Game 5" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-4", name: "Game 4" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-3", name: "Game 3" }));

    const promise = ingestCategoryTopics(5, 10, new Date("2026-08-03T00:00:00.000Z"));
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.games).toBe(10);

    const topicFetches = mockFetch.mock.calls
      .filter((call) => String(call[0]).includes("/t/500.json"))
      .map((call) => String(call[0]));
    expect(topicFetches).toEqual([
      "https://forum.makecode.com/t/500.json",
      "https://forum.makecode.com/t/500.json?page=12",
      "https://forum.makecode.com/t/500.json?page=11",
      "https://forum.makecode.com/t/500.json?page=10",
      "https://forum.makecode.com/t/500.json?page=9",
      "https://forum.makecode.com/t/500.json?page=8",
      "https://forum.makecode.com/t/500.json?page=7",
      "https://forum.makecode.com/t/500.json?page=6",
      "https://forum.makecode.com/t/500.json?page=5",
      "https://forum.makecode.com/t/500.json?page=4",
      "https://forum.makecode.com/t/500.json?page=3",
    ]);
    expect(topicFetches).not.toContain("https://forum.makecode.com/t/500.json?page=2");
    expect(topicFetches).not.toContain("https://forum.makecode.com/t/500.json?page=1");
  });
});

describe("ingestJamTopic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-04T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("only re-crawls the trailing pages of a mostly-ingested jam thread and pokes older known posts by id", async () => {
    // Jam topic has 3 pages (posts 1-6). Posts 2-5 are already known; only
    // post 6 (on the last page) is new. Page 1 should never be re-fetched.
    mockSupabase.from = vi.fn((table: string) => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        update: () => { calls.push("update"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (table === "game_forum_posts" && calls.includes("select") && calls.includes("eq") && !calls.includes("limit")) {
            return resolve({ data: [2, 3, 4, 5].map((id) => ({ forum_post_id: id })), error: null });
          }
          if (calls.includes("upsert") || calls.includes("update")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-6" }, error: null });
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    const page1 = jsonResponse({
      id: 44801,
      title: "Jam #42",
      category_id: 13,
      posts_count: 6,
      views: 100,
      post_stream: {
        posts: [
          { id: 1, post_number: 1, cooked: "<p>Welcome to the jam</p>", user_id: 1, username: "host", created_at: "2026-08-01T00:00:00.000Z", reaction_users_count: 10 },
          { id: 2, post_number: 2, cooked: "<p>known entry</p>", user_id: 2, username: "player", created_at: "2026-08-01T10:00:00.000Z", reaction_users_count: 1 },
        ],
      },
    });
    const page2 = jsonResponse({
      id: 44801,
      title: "Jam #42",
      category_id: 13,
      posts_count: 6,
      views: 100,
      post_stream: {
        posts: [
          { id: 3, post_number: 3, cooked: "<p>known entry 2</p>", user_id: 3, username: "player3", created_at: "2026-08-02T10:00:00.000Z", reaction_users_count: 2 },
          { id: 4, post_number: 4, cooked: "<p>known entry 3</p>", user_id: 4, username: "player4", created_at: "2026-08-02T11:00:00.000Z", reaction_users_count: 3 },
        ],
      },
    });
    const page3 = jsonResponse({
      id: 44801,
      title: "Jam #42",
      category_id: 13,
      posts_count: 6,
      views: 100,
      post_stream: {
        posts: [
          { id: 5, post_number: 5, cooked: "<p>known entry 4</p>", user_id: 5, username: "player5", created_at: "2026-08-03T10:00:00.000Z", reaction_users_count: 4 },
          { id: 6, post_number: 6, cooked: '<p><a href="https://arcade.makecode.com/77777">game</a></p>', user_id: 6, username: "player6", created_at: "2026-08-04T09:00:00.000Z", reaction_users_count: 0 },
        ],
      },
    });

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ categories: [{ id: 13, name: "Jams", slug: "jams" }] }))
      // ingestJamTopic fetches page 1 itself and passes it in as the firstPage
      .mockResolvedValueOnce(page1)
      // walks backward from the last page: page 3 has the new post...
      .mockResolvedValueOnce(page3)
      // ...page 2 is fully known, so the walk stops there — page 1 is never re-fetched.
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-777", name: "Jam Game" }))
      // post 2 (on the skipped page 1) still gets poked individually for fresh reactions.
      .mockResolvedValueOnce(jsonResponse({ id: 2, reaction_users_count: 7 }));

    const result = await ingestJamTopic(44801, new Date("2026-08-03T00:00:00.000Z"));

    expect(result.games).toBe(1);
    const topicFetches = mockFetch.mock.calls
      .filter((call) => String(call[0]).includes("/t/44801.json"))
      .map((call) => String(call[0]));
    expect(topicFetches).toEqual([
      "https://forum.makecode.com/t/44801.json",
      "https://forum.makecode.com/t/44801.json?page=3",
      "https://forum.makecode.com/t/44801.json?page=2",
    ]);
    expect(topicFetches).not.toContain("https://forum.makecode.com/t/44801.json?page=1");

    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/posts/2.json", {
      headers: { Accept: "application/json" },
    });
  });
});

describe("ingestCategoryTopics (never-seen-before topic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-04T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("walks every page of a topic that has no known posts yet", async () => {
    mockSupabase.from = vi.fn((table: string) => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        update: () => { calls.push("update"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (table === "game_forum_posts" && calls.includes("select") && calls.includes("eq") && !calls.includes("limit")) {
            return resolve({ data: [], error: null });
          }
          if (calls.includes("upsert") || calls.includes("update")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-1" }, error: null });
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    const page1 = jsonResponse({
      id: 400,
      title: "Brand new thread",
      category_id: 5,
      posts_count: 4,
      views: 5,
      post_stream: {
        posts: [
          { id: 1, post_number: 1, cooked: '<p><a href="https://arcade.makecode.com/11111">game</a></p>', user_id: 1, username: "player", created_at: "2026-08-01T00:00:00.000Z", reaction_users_count: 0 },
          { id: 2, post_number: 2, cooked: "<p>no link</p>", user_id: 2, username: "player2", created_at: "2026-08-01T01:00:00.000Z", reaction_users_count: 0 },
        ],
      },
    });
    const page2 = jsonResponse({
      id: 400,
      title: "Brand new thread",
      category_id: 5,
      posts_count: 4,
      views: 5,
      post_stream: {
        posts: [
          { id: 3, post_number: 3, cooked: "<p>no link either</p>", user_id: 2, username: "player2", created_at: "2026-08-01T02:00:00.000Z", reaction_users_count: 0 },
          { id: 4, post_number: 4, cooked: '<p><a href="https://arcade.makecode.com/22222">game</a></p>', user_id: 1, username: "player", created_at: "2026-08-04T09:00:00.000Z", reaction_users_count: 0 },
        ],
      },
    });

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 400,
                title: "Brand new thread",
                posts_count: 4,
                bumped_at: "2026-08-04T10:00:00.000Z",
                category_id: 5,
                views: 5,
                created_at: "2026-08-01T00:00:00.000Z",
              },
              {
                id: 401,
                title: "Old thread",
                posts_count: 1,
                bumped_at: "2026-08-01T00:00:00.000Z",
                category_id: 5,
                views: 1,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ categories: [{ id: 5, name: "Games", slug: "games" }] }))
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-22222", name: "New Game" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "abc-11111", name: "Old Game" }));

    const result = await ingestCategoryTopics(5, 10, new Date("2026-08-03T00:00:00.000Z"));

    expect(result.games).toBe(2);
    const topicFetches = mockFetch.mock.calls
      .filter((call) => String(call[0]).includes("/t/400.json"))
      .map((call) => String(call[0]));
    expect(topicFetches).toEqual([
      "https://forum.makecode.com/t/400.json",
      "https://forum.makecode.com/t/400.json?page=2",
    ]);
  });
});

describe("ingestOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-04T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls snapshot_game_stats at the end of a successful run", async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from = vi.fn((table: string) => {
      const calls: string[] = [];
      const chain = {
        select: (cols?: string) => {
          calls.push(`select:${cols ?? ""}`);
          return chain;
        },
        eq: () => { calls.push("eq"); return chain; },
        in: () => { calls.push("in"); return chain; },
        not: () => { calls.push("not"); return chain; },
        is: () => { calls.push("is"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        order: () => { calls.push("order"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        update: () => { calls.push("update"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (table === "ingest_log") {
            if (calls.includes("single")) return resolve({ data: null, error: null });
            if (calls.includes("insert")) return resolve({ error: null });
            return resolve({ data: [], error: null });
          }
          if (table === "game_forum_posts" && calls.includes("select") && !calls.includes("single")) {
            return resolve({ data: [], count: 0, error: null });
          }
          if (calls.includes("upsert") || calls.includes("update")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-1" }, error: null });
          if (calls.includes("single")) return resolve({ data: null, error: null });
          return resolve({ data: [], error: null });
        },
      };
      return chain;
    });

    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            categories: [
              { id: 13, name: "Jams", slug: "jams" },
              { id: 5, name: "Games", slug: "games" },
            ],
          })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            id: 44801,
            title: "Jam #1",
            category_id: 13,
            posts_count: 1,
            views: 50,
            post_stream: {
              posts: [
                {
                  id: 1,
                  post_number: 1,
                  cooked: "<p>Welcome</p>",
                  user_id: 1,
                  username: "host",
                  created_at: "2026-08-01T00:00:00.000Z",
                  reaction_users_count: 0,
                },
              ],
            },
          })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            topic_list: {
              topics: [
                {
                  id: 100,
                  title: "A game topic",
                  posts_count: 1,
                  bumped_at: "2026-08-01T00:00:00.000Z",
                  category_id: 5,
                  views: 10,
                  created_at: "2026-08-01T00:00:00.000Z",
                },
              ],
            },
          })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            categories: [
              { id: 13, name: "Jams", slug: "jams" },
              { id: 5, name: "Games", slug: "games" },
            ],
          })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            id: 100,
            title: "A game topic",
            category_id: 5,
            posts_count: 1,
            views: 10,
            post_stream: {
              posts: [
                {
                  id: 10,
                  post_number: 1,
                  cooked: '<p><a href="https://arcade.makecode.com/12345">game</a></p>',
                  user_id: 2,
                  username: "player",
                  created_at: "2026-08-01T00:00:00.000Z",
                  reaction_users_count: 0,
                },
              ],
            },
          })
        )
      );

    await ingestOnce();

    expect(mockSupabase.rpc).toHaveBeenCalledWith("snapshot_game_stats");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("refresh_game_daily_stats");
  });
});

describe("listActiveCategoryTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-04T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("falls back to last_posted_at when bumped_at is missing and pages until the limit is reached", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 1,
                title: "Bumped",
                posts_count: 5,
                bumped_at: "2026-08-04T10:00:00.000Z",
                last_posted_at: "2026-08-04T10:00:00.000Z",
                category_id: 5,
                views: 10,
                created_at: "2026-08-01T00:00:00.000Z",
              },
              {
                id: 2,
                title: "Not bumped",
                posts_count: 3,
                bumped_at: null,
                last_posted_at: "2026-08-04T09:00:00.000Z",
                category_id: 5,
                views: 5,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 3,
                title: "Page two active",
                posts_count: 2,
                bumped_at: "2026-08-04T08:00:00.000Z",
                category_id: 5,
                views: 2,
                created_at: "2026-08-01T00:00:00.000Z",
              },
              {
                id: 4,
                title: "Page two old",
                posts_count: 1,
                bumped_at: "2026-08-01T00:00:00.000Z",
                category_id: 5,
                views: 1,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      );

    const topics = await listActiveCategoryTopics(5, 3, new Date("2026-08-03T00:00:00.000Z"));

    expect(topics.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/c/5.json", { headers: { Accept: "application/json" } });
    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/c/5.json?page=2", { headers: { Accept: "application/json" } });
  });

  it("stops paging when the oldest topic on a page is outside the activity window", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        topic_list: {
          topics: [
            {
              id: 1,
              title: "Active",
              posts_count: 5,
              bumped_at: "2026-08-04T10:00:00.000Z",
              category_id: 5,
              views: 10,
              created_at: "2026-08-01T00:00:00.000Z",
            },
            {
              id: 2,
              title: "Old",
              posts_count: 1,
              bumped_at: "2026-08-01T00:00:00.000Z",
              category_id: 5,
              views: 1,
              created_at: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
      })
    );

    const topics = await listActiveCategoryTopics(5, 10, new Date("2026-08-03T00:00:00.000Z"));

    expect(topics.map((t) => t.id)).toEqual([1]);
  });

  it("returns all topics on the first run (no lastIngestAt)", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        topic_list: {
          topics: [
            {
              id: 1,
              title: "One",
              posts_count: 1,
              bumped_at: "2026-08-01T00:00:00.000Z",
              category_id: 5,
              views: 1,
              created_at: "2026-08-01T00:00:00.000Z",
            },
            {
              id: 2,
              title: "Two",
              posts_count: 1,
              bumped_at: "2026-08-01T00:00:00.000Z",
              category_id: 5,
              views: 1,
              created_at: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
      })
    );

    const topics = await listActiveCategoryTopics(5, 10);

    expect(topics.map((t) => t.id)).toEqual([1, 2]);
  });
});

describe("ingestCategoryTopics link click handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-04T12:00:00.000Z");
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("merges details.links from every crawled page and refreshes link_clicks for known and new posts", async () => {
    const upsertCalls: { table: string; data: unknown }[] = [];
    const updateCalls: { table: string; data: unknown }[] = [];
    const insertCalls: { table: string; data: unknown }[] = [];

    mockSupabase.from = vi.fn((table: string) => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: (data: unknown) => { calls.push("insert"); insertCalls.push({ table, data }); return chain; },
        upsert: (data: unknown) => { calls.push("upsert"); upsertCalls.push({ table, data }); return chain; },
        update: (data: unknown) => { calls.push("update"); updateCalls.push({ table, data }); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (table === "game_forum_posts" && calls.includes("select") && calls.includes("eq") && !calls.includes("limit")) {
            return resolve({ data: [1, 2, 3, 4, 5].map((id) => ({ forum_post_id: id })), error: null });
          }
          if (calls.includes("update")) return resolve({ error: null });
          if (calls.includes("upsert")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) {
            const last = insertCalls[insertCalls.length - 1];
            const shareUrl = (last?.data as { share_url?: string } | undefined)?.share_url ?? "";
            const id = shareUrl.split("/").pop() || "game-unknown";
            return resolve({ data: { id }, error: null });
          }
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    function makeLink(urlId: string, clicks: number) {
      return { url: `https://arcade.makecode.com/${urlId}`, clicks };
    }

    function makePost(id: number, postNumber: number, urlId?: string, reactionCount = id) {
      const cooked = urlId
        ? `<p><a href="https://arcade.makecode.com/${urlId}">game</a></p>`
        : "<p>no link</p>";
      return { id, post_number: postNumber, cooked, user_id: 1, username: "player", created_at: "2026-08-01T00:00:00.000Z", reaction_users_count: reactionCount };
    }

    function makePage(pageNum: number, posts: unknown[], links: unknown[]) {
      return jsonResponse({
        id: 300,
        title: "Topic with link clicks",
        category_id: 5,
        posts_count: 8,
        views: 100,
        details: { links },
        post_stream: { posts },
      });
    }

    const page1 = makePage(1, [makePost(1, 1, "10001", 1), makePost(2, 2, undefined, 2)], [makeLink("10001", 1), makeLink("10002", 2)]);
    const page2 = makePage(2, [makePost(3, 3, "10003", 3), makePost(4, 4, "10004", 4)], [makeLink("10003", 30), makeLink("10004", 40)]);
    const page3 = makePage(3, [makePost(5, 5, "10005", 5), makePost(6, 6, "10006", 6)], [makeLink("10005", 50), makeLink("10006", 60)]);
    const page4 = makePage(4, [makePost(7, 7, "10007", 7), makePost(8, 8, "10008", 8)], [makeLink("10007", 70), makeLink("10008", 80), makeLink("10001", 10)]);

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 300,
                title: "Topic with link clicks",
                posts_count: 8,
                bumped_at: "2026-08-04T10:00:00.000Z",
                category_id: 5,
                views: 100,
                created_at: "2026-08-01T00:00:00.000Z",
              },
              {
                id: 301,
                title: "Old thread",
                posts_count: 1,
                bumped_at: "2026-08-01T00:00:00.000Z",
                category_id: 5,
                views: 1,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ categories: [{ id: 5, name: "Games", slug: "games" }] }))
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page4)
      .mockResolvedValueOnce(page3)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "10007", name: "Game 7" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "10008", name: "Game 8" }))
      .mockResolvedValueOnce(jsonResponse({ kind: "script", id: "10006", name: "Game 6" }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, cooked: '<p><a href="https://arcade.makecode.com/10001">game</a></p>', reaction_users_count: 11 }))
      .mockResolvedValueOnce(jsonResponse({ id: 2, cooked: "<p>no link</p>", reaction_users_count: 12 }));

    const promise = ingestCategoryTopics(5, 10, new Date("2026-08-03T00:00:00.000Z"));
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.games).toBe(3);

    const topicFetches = mockFetch.mock.calls
      .filter((call) => String(call[0]).includes("/t/300.json"))
      .map((call) => String(call[0]));
    expect(topicFetches).toEqual([
      "https://forum.makecode.com/t/300.json",
      "https://forum.makecode.com/t/300.json?page=4",
      "https://forum.makecode.com/t/300.json?page=3",
      "https://forum.makecode.com/t/300.json?page=2",
    ]);

    const forumUpserts = upsertCalls.filter((c) => c.table === "game_forum_posts").map((c) => c.data as { forum_post_id: number; link_clicks: number });
    expect(forumUpserts).toMatchObject([
      { forum_post_id: 7, link_clicks: 70 },
      { forum_post_id: 8, link_clicks: 80 },
      { forum_post_id: 6, link_clicks: 60 },
    ]);

    const forumUpdates = updateCalls.filter((c) => c.table === "game_forum_posts").map((c) => c.data as { reaction_count: number; link_clicks: number });
    expect(forumUpdates).toContainEqual(expect.objectContaining({ link_clicks: 50, reaction_count: 5 }));
    expect(forumUpdates).toContainEqual(expect.objectContaining({ link_clicks: 30, reaction_count: 3 }));
    expect(forumUpdates).toContainEqual(expect.objectContaining({ link_clicks: 40, reaction_count: 4 }));
    expect(forumUpdates).toContainEqual(expect.objectContaining({ link_clicks: 10, reaction_count: 11 }));
    expect(forumUpdates).toContainEqual(expect.objectContaining({ link_clicks: 0, reaction_count: 12 }));
  });
});
