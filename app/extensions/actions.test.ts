import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchExtensionTools } from "./actions";

const mockSearch = vi.hoisted(() => vi.fn());
const mockGetAlgoliaSearchClient = vi.hoisted(() =>
  vi.fn<() => { search: typeof mockSearch } | null>(() => null),
);

vi.mock("@/lib/algolia", () => ({
  getAlgoliaSearchClient: mockGetAlgoliaSearchClient,
  EXTENSION_TOOLS_INDEX: "extension_tools",
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockGetAlgoliaSearchClient.mockReturnValue(null);
});

describe("searchExtensionTools", () => {
  it("returns no matches for an empty/whitespace query", async () => {
    const result = await searchExtensionTools("   ");
    expect(result.matches).toEqual([]);
    expect(result.note).toBeUndefined();
    expect(mockGetAlgoliaSearchClient).not.toHaveBeenCalled();
  });

  it("falls back to a local text search when Algolia is not configured", async () => {
    const result = await searchExtensionTools("distance between two sprites");

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.map((m) => m.id)).toContain(
      "jwunderl/arcade-sprite-util/distance-between",
    );
  });

  it("uses Algolia and re-attaches real tool fields when configured", async () => {
    mockGetAlgoliaSearchClient.mockReturnValue({ search: mockSearch });
    mockSearch.mockResolvedValue({
      results: [
        {
          hits: [
            {
              owner: "jwunderl",
              repo: "arcade-sprite-util",
              slug: "distance-between",
              title: "distance between",
            },
          ],
        },
      ],
    });

    const result = await searchExtensionTools("distance");

    expect(result.matches).toHaveLength(1);
    const match = result.matches[0];
    expect(match.id).toBe("jwunderl/arcade-sprite-util/distance-between");
    expect(match.title).toBe("distance between");
    expect(match.docUrl).toBe(
      "/extensions/jwunderl/arcade-sprite-util/distance-between",
    );
    expect(match.blurb).toBeTruthy();
    expect(match.extensionDisplayName).toBe("Sprite Utils");

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: [
          expect.objectContaining({
            indexName: "extension_tools",
            query: "distance",
            hitsPerPage: 10,
          }),
        ],
      }),
    );
  });

  it("returns the no-match note when Algolia returns no hits", async () => {
    mockGetAlgoliaSearchClient.mockReturnValue({ search: mockSearch });
    mockSearch.mockResolvedValue({
      results: [{ hits: [] }],
    });

    const result = await searchExtensionTools("tell me a joke");

    expect(result.matches).toEqual([]);
    expect(result.note).toContain("didn't find an extension");
  });

  it("drops Algolia hits that do not resolve to a real tool", async () => {
    mockGetAlgoliaSearchClient.mockReturnValue({ search: mockSearch });
    mockSearch.mockResolvedValue({
      results: [
        {
          hits: [
            {
              owner: "fake",
              repo: "fake-repo",
              slug: "fake-tool",
              title: "fake tool",
            },
          ],
        },
      ],
    });

    const result = await searchExtensionTools("something");

    expect(result.matches).toEqual([]);
    expect(result.note).toContain("didn't find an extension");
  });

  it("truncates queries longer than 400 characters before searching", async () => {
    mockGetAlgoliaSearchClient.mockReturnValue({ search: mockSearch });
    mockSearch.mockResolvedValue({
      results: [{ hits: [] }],
    });
    const longQuery = "a".repeat(500);

    await searchExtensionTools(longQuery);

    const sentQuery = mockSearch.mock.calls[0][0].requests[0].query;
    expect(sentQuery.length).toBe(400);
  });
});
