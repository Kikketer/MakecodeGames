import { describe, it, expect, vi, beforeEach } from "vitest";
import { addLike, listGames } from "./actions";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: mockSupabase }));
vi.mock("@/lib/auth", () => ({ getUser: mockGetUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

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
      { game_id: "g1", likes: 10, clicks: 2 },
      { game_id: "g2", likes: 5, clicks: 0 },
    ],
  },
  game_forum_posts: {
    data: [
      { game_id: "g1", forum_url: "https://forum.makecode.com/t/g1", reply_count: 3, view_count: 5, post_cooked: null },
      { game_id: "g2", forum_url: "https://forum.makecode.com/t/g2", reply_count: 0, view_count: 1, post_cooked: null },
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
  });

  it("merges likedByMe for a signed-in user", async () => {
    mockGetUser.mockResolvedValue({ id: "user-1" });

    const result = await listGames({ sort: "hot", limit: 10 });

    expect(result).toHaveLength(2);
    const g1 = result.find((g) => g.id === "g1");
    const g2 = result.find((g) => g.id === "g2");
    expect(g1?.likedByMe).toBe(true);
    expect(g1?.likes).toBe(10);
    expect(g2?.likedByMe).toBe(false);
    expect(g2?.likes).toBe(5);
  });

  it("sets likedByMe to false when no user is signed in", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await listGames({ sort: "hot", limit: 10 });

    expect(result).toHaveLength(2);
    expect(result.every((g) => g.likedByMe === false)).toBe(true);
  });
});
