import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { refreshGameReactions, ingestPost } from "./ingest-games";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));

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
    });
  });
});
