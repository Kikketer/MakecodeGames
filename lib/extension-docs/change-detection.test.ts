import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

/**
 * Tests for the change detection module.
 * Supabase and GitHub API calls are mocked.
 */

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
const mockGetSha = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: mockSupabase }));
vi.mock("./github", () => ({ getExtensionRepoHeadSha: mockGetSha }));

import {
  getExtensionDocStatus,
  shouldRegenerateExtension,
  recordSuccessfulGeneration,
  recordFailedGeneration,
} from "./change-detection";

/** Build a mock Supabase query chain that resolves to { data, error }. */
function mockSelectResponse(data: unknown[] | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
    onConflict: vi.fn().mockReturnThis(),
  };
  (mockSupabase.from as Mock).mockReturnValue(chain);
  return chain;
}

/** Build a mock Supabase upsert chain that resolves to { error }. */
function mockUpsertResponse(error: unknown = null) {
  const chain = {
    upsert: vi.fn().mockResolvedValue({ error }),
  };
  (mockSupabase.from as Mock).mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getExtensionDocStatus", () => {
  it("returns the status when a row exists", async () => {
    mockSelectResponse([
      {
        owner: "jwunderl",
        repo: "arcade-sprite-util",
        last_commit_sha: "abc123",
        last_generated_at: "2026-08-01T00:00:00Z",
        last_pr_number: 15,
        last_pr_url: "https://github.com/test/pr/15",
        status: "in_progress",
        last_error: null,
      },
    ]);

    const status = await getExtensionDocStatus("jwunderl", "arcade-sprite-util");

    expect(status).toEqual({
      owner: "jwunderl",
      repo: "arcade-sprite-util",
      lastCommitSha: "abc123",
      lastGeneratedAt: "2026-08-01T00:00:00Z",
      lastPrNumber: 15,
      lastPrUrl: "https://github.com/test/pr/15",
      status: "in_progress",
      lastError: null,
    });
  });

  it("returns undefined when no row exists", async () => {
    mockSelectResponse([]);

    const status = await getExtensionDocStatus("unknown", "repo");
    expect(status).toBeUndefined();
  });

  it("throws on Supabase error", async () => {
    mockSelectResponse(null, { message: "connection refused" });

    await expect(getExtensionDocStatus("owner", "repo")).rejects.toThrow("connection refused");
  });
});

describe("shouldRegenerateExtension", () => {
  it("returns regenerate=true when never documented before", async () => {
    mockGetSha.mockResolvedValue("newsha");
    mockSelectResponse([]);

    const result = await shouldRegenerateExtension("owner", "repo");

    expect(result.regenerate).toBe(true);
    expect(result.currentSha).toBe("newsha");
    expect(result.storedSha).toBeNull();
  });

  it("returns regenerate=true when SHA has changed", async () => {
    mockGetSha.mockResolvedValue("newsha");
    mockSelectResponse([
      {
        owner: "owner",
        repo: "repo",
        last_commit_sha: "oldsha",
        last_generated_at: "2026-08-01T00:00:00Z",
        last_pr_number: 10,
        last_pr_url: "https://github.com/test/pr/10",
        status: "in_progress",
        last_error: null,
      },
    ]);

    const result = await shouldRegenerateExtension("owner", "repo");

    expect(result.regenerate).toBe(true);
    expect(result.currentSha).toBe("newsha");
    expect(result.storedSha).toBe("oldsha");
  });

  it("returns regenerate=false when SHA is unchanged", async () => {
    mockGetSha.mockResolvedValue("sameSHA");
    mockSelectResponse([
      {
        owner: "owner",
        repo: "repo",
        last_commit_sha: "sameSHA",
        last_generated_at: "2026-08-01T00:00:00Z",
        last_pr_number: 10,
        last_pr_url: "https://github.com/test/pr/10",
        status: "in_progress",
        last_error: null,
      },
    ]);

    const result = await shouldRegenerateExtension("owner", "repo");

    expect(result.regenerate).toBe(false);
    expect(result.currentSha).toBe("sameSHA");
    expect(result.storedSha).toBe("sameSHA");
  });

  it("returns regenerate=true when stored SHA is null", async () => {
    mockGetSha.mockResolvedValue("sha1");
    mockSelectResponse([
      {
        owner: "owner",
        repo: "repo",
        last_commit_sha: null,
        last_generated_at: null,
        last_pr_number: null,
        last_pr_url: null,
        status: "failed",
        last_error: "some error",
      },
    ]);

    const result = await shouldRegenerateExtension("owner", "repo");

    expect(result.regenerate).toBe(true);
    expect(result.storedSha).toBeNull();
  });
});

describe("recordSuccessfulGeneration", () => {
  it("upserts the status with the SHA and PR info", async () => {
    const chain = mockUpsertResponse(null);

    await recordSuccessfulGeneration("owner", "repo", "newsha", {
      number: 42,
      url: "https://github.com/test/pr/42",
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "owner",
        repo: "repo",
        last_commit_sha: "newsha",
        last_pr_number: 42,
        last_pr_url: "https://github.com/test/pr/42",
        status: "in_progress",
        last_error: null,
      }),
      { onConflict: "owner,repo" },
    );
  });

  it("throws on Supabase error", async () => {
    mockUpsertResponse({ message: "permission denied" });

    await expect(
      recordSuccessfulGeneration("owner", "repo", "sha", { number: 1, url: "url" }),
    ).rejects.toThrow("permission denied");
  });
});

describe("recordFailedGeneration", () => {
  it("upserts the status with failed state and error message", async () => {
    const chain = mockUpsertResponse(null);

    await recordFailedGeneration("owner", "repo", "sha", "Gemini API timeout");

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "owner",
        repo: "repo",
        last_commit_sha: "sha",
        status: "failed",
        last_error: "Gemini API timeout",
      }),
      { onConflict: "owner,repo" },
    );
  });
});
