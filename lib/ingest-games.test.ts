import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { refreshGameReactions, ingestPost, ingestCategoryTopics, ingestJamTopic, ingestOnce } from "./ingest-games";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: mockSupabase }));

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

  it("fetches only the last page of bumped topics and parses new posts", async () => {
    mockSupabase.from = vi.fn(() => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (calls.includes("upsert")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-1" }, error: null });
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topic_list: {
            topics: [
              {
                id: 200,
                title: "Cool new game",
                posts_count: 4,
                bumped_at: "2026-08-04T10:00:00.000Z",
                category_id: 5,
                views: 50,
                created_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          categories: [{ id: 5, name: "Games", slug: "games" }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 200,
          title: "Cool new game",
          category_id: 5,
          posts_count: 4,
          views: 50,
          post_stream: {
            posts: [
              {
                id: 1,
                post_number: 1,
                cooked: '<p>old topic starter</p>',
                user_id: 1,
                username: "player",
                created_at: "2026-08-01T10:00:00.000Z",
                reaction_users_count: 2,
              },
              {
                id: 2,
                post_number: 2,
                cooked: '<p>older reply</p>',
                user_id: 2,
                username: "player2",
                created_at: "2026-08-01T11:00:00.000Z",
                reaction_users_count: 1,
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 200,
          title: "Cool new game",
          category_id: 5,
          posts_count: 4,
          views: 50,
          post_stream: {
            posts: [
              {
                id: 3,
                post_number: 3,
                cooked: '<p><a href="https://arcade.makecode.com/99999">game</a></p>',
                user_id: 1,
                username: "player",
                created_at: "2026-08-03T10:00:00.000Z",
                reaction_users_count: 5,
              },
              {
                id: 4,
                post_number: 4,
                cooked: '<p>no link here</p>',
                user_id: 2,
                username: "player2",
                created_at: "2026-08-03T11:00:00.000Z",
                reaction_users_count: 1,
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ kind: "script", id: "abc-123", name: "Test Game" })
      );

    const result = await ingestCategoryTopics(5, 10, new Date("2026-08-03T00:00:00.000Z"));

    expect(result.games).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/c/5.json", {
      headers: { Accept: "application/json" },
    });
    expect(mockFetch).toHaveBeenCalledWith("https://forum.makecode.com/t/200.json?page=2", {
      headers: { Accept: "application/json" },
    });
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/t/200.json?page=1"),
      expect.anything()
    );
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

  it("does not walk earlier pages when all posts are older than the cutoff", async () => {
    mockSupabase.from = vi.fn(() => {
      const calls: string[] = [];
      const chain = {
        select: () => { calls.push("select"); return chain; },
        eq: () => { calls.push("eq"); return chain; },
        limit: () => { calls.push("limit"); return chain; },
        single: () => { calls.push("single"); return chain; },
        insert: () => { calls.push("insert"); return chain; },
        upsert: () => { calls.push("upsert"); return chain; },
        then: (resolve: (value: unknown) => void) => {
          if (calls.includes("upsert")) return resolve({ error: null });
          if (calls.includes("insert") && calls.includes("single")) return resolve({ data: { id: "game-1" }, error: null });
          if (calls.includes("select") && calls.includes("limit")) return resolve({ data: [] });
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    });

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          categories: [{ id: 13, name: "Jams", slug: "jams" }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 44801,
          title: "Jam #42",
          category_id: 13,
          posts_count: 2,
          views: 100,
          post_stream: {
            posts: [
              {
                id: 1,
                post_number: 1,
                cooked: "<p>Welcome to the jam</p>",
                user_id: 1,
                username: "host",
                created_at: "2026-08-01T00:00:00.000Z",
                reaction_users_count: 10,
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 44801,
          title: "Jam #42",
          category_id: 13,
          posts_count: 2,
          views: 100,
          post_stream: {
            posts: [
              {
                id: 2,
                post_number: 2,
                cooked: '<p><a href="https://arcade.makecode.com/77777">game</a></p>',
                user_id: 2,
                username: "player",
                created_at: "2026-08-03T10:00:00.000Z",
                reaction_users_count: 4,
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ kind: "script", id: "abc-777", name: "Jam Game" })
      );

    await ingestJamTopic(44801, new Date("2026-08-03T00:00:00.000Z"));

    const topicFetches = mockFetch.mock.calls
      .filter((call) => String(call[0]).includes("/t/44801.json"))
      .map((call) => String(call[0]));
    expect(topicFetches).toEqual([
      "https://forum.makecode.com/t/44801.json",
      "https://forum.makecode.com/t/44801.json?page=2",
    ]);
    expect(topicFetches).not.toContain("https://forum.makecode.com/t/44801.json?page=1");
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
  });
});
