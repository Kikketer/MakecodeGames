import { describe, it, expect, vi, beforeEach } from "vitest";
import { addLike, listGames, recordClick, searchGames } from "./actions";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockRefreshReactions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: mockSupabase }));
vi.mock("@/lib/auth", () => ({ getUser: mockGetUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/ingest-games", () => ({ refreshGameReactions: mockRefreshReactions }));

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
      { id: "g1", first_seen_at: "2026-08-01T00:00:00Z" },
      { id: "g2", first_seen_at: "2026-08-02T00:00:00Z" },
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
      { game_id: "g1", forum_url: "https://forum.makecode.com/t/g1", reply_count: 3, view_count: 5, post_cooked: null, reaction_count: 10 },
      { game_id: "g2", forum_url: "https://forum.makecode.com/t/g2", reply_count: 0, view_count: 1, post_cooked: null, reaction_count: 5 },
    ],
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
  });

  it("uses reaction_count as likes and game_stats for clicks", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await listGames({ sort: "hot", limit: 10 });

    expect(result).toHaveLength(2);
    const g1 = result.find((g) => g.id === "g1");
    const g2 = result.find((g) => g.id === "g2");
    expect(g1?.likes).toBe(10);
    expect(g1?.clicks).toBe(2);
    expect(g2?.likes).toBe(5);
    expect(g2?.clicks).toBe(0);
  });
});

const searchResponses = {
  games: {
    data: [
      { id: "g1", title: "Space Quest", first_seen_at: "2026-08-02T00:00:00Z" },
      { id: "g2", title: "My Space Game", first_seen_at: "2026-08-03T00:00:00Z" },
      { id: "g3", title: "A Space Adventure", first_seen_at: "2026-08-01T00:00:00Z" },
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
      { game_id: "g1", forum_url: "https://forum.makecode.com/t/g1", reply_count: 1, view_count: 2, post_cooked: null, reaction_count: 5 },
      { game_id: "g2", forum_url: "https://forum.makecode.com/t/g2", reply_count: 0, view_count: 1, post_cooked: null, reaction_count: 2 },
      { game_id: "g3", forum_url: "", reply_count: 0, view_count: 0, post_cooked: null, reaction_count: 8 },
    ],
  },
  game_likes: {
    data: [],
  },
};

describe("searchGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, searchResponses[table as keyof typeof searchResponses]));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
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
    expect(g1?.forum_url).toBe("https://forum.makecode.com/t/g1");
    expect(g2?.likes).toBe(2);
    expect(g3?.likes).toBe(8);
    expect(g3?.forum_url).toBe("");
  });
});

describe("recordClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, undefined));
    mockGetUser.mockReset();
    mockRefreshReactions.mockReset();
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
