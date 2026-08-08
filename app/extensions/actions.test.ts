import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchExtensionTools } from "./actions";

const mockGenerateJson = vi.hoisted(() => vi.fn());
const mockVerifyTurnstile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/extension-docs/gemini", () => ({
  generateJson: mockGenerateJson,
  DEFAULT_MODEL: "gemini-flash-latest",
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: mockVerifyTurnstile,
  isTurnstileEnabled: vi.fn(() => false),
}));

beforeEach(() => {
  vi.resetAllMocks();
  // Default: Turnstile skipped (localhost behavior — no secret)
  mockVerifyTurnstile.mockResolvedValue(true);
});

describe("searchExtensionTools", () => {
  it("returns no matches and no Gemini call for empty/whitespace query", async () => {
    const result = await searchExtensionTools("   ", "");
    expect(result.matches).toEqual([]);
    expect(result.note).toBeUndefined();
    expect(mockGenerateJson).not.toHaveBeenCalled();
  });

  it("returns verification-failed note when Turnstile rejects the token", async () => {
    mockVerifyTurnstile.mockResolvedValue(false);
    const result = await searchExtensionTools("distance between two sprites", "bad-token");
    expect(result.matches).toEqual([]);
    expect(result.note).toContain("Verification failed");
    expect(mockGenerateJson).not.toHaveBeenCalled();
  });

  it("surfaces a matching tool and re-attaches real fields by id", async () => {
    mockGenerateJson.mockResolvedValue({
      matches: [
        { id: "jwunderl/arcade-sprite-util/distance-between", blurb: "Use this to get the pixel distance between two sprites." },
      ],
    });

    const result = await searchExtensionTools("calculate the distance from one sprite to another", "");

    expect(result.matches).toHaveLength(1);
    const match = result.matches[0];
    expect(match.id).toBe("jwunderl/arcade-sprite-util/distance-between");
    expect(match.title).toBe("distance between"); // re-attached from catalog, not from model
    expect(match.blurb).toBe("Use this to get the pixel distance between two sprites.");
    expect(match.docUrl).toBe("/extensions/jwunderl/arcade-sprite-util/distance-between");
    expect(match.extensionDisplayName).toBe("Sprite Utils");
    expect(match.blockString).toContain("distance between");
  });

  it("returns the no-match note for off-topic queries (zero matches from model)", async () => {
    mockGenerateJson.mockResolvedValue({ matches: [] });

    const result = await searchExtensionTools("tell me a joke", "");

    expect(result.matches).toEqual([]);
    expect(result.note).toContain("didn't find an extension");
  });

  it("drops model-returned ids that don't resolve to a real tool (hallucination guard)", async () => {
    mockGenerateJson.mockResolvedValue({
      matches: [
        { id: "jwunderl/arcade-sprite-util/distance-between", blurb: "Real tool." },
        { id: "fake/fake-repo/fake-tool", blurb: "Hallucinated tool." },
      ],
    });

    const result = await searchExtensionTools("something", "");

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].id).toBe("jwunderl/arcade-sprite-util/distance-between");
  });

  it("truncates queries longer than 400 characters before sending to Gemini", async () => {
    mockGenerateJson.mockResolvedValue({ matches: [] });
    const longQuery = "a".repeat(500);

    await searchExtensionTools(longQuery, "");

    const sentText = mockGenerateJson.mock.calls[0][0].contents[0].parts[0].text;
    expect(sentText.length).toBe(400);
  });

  it("returns the no-match note when all model matches are hallucinated", async () => {
    mockGenerateJson.mockResolvedValue({
      matches: [{ id: "fake/fake/fake", blurb: "Nope" }],
    });

    const result = await searchExtensionTools("something", "");

    expect(result.matches).toEqual([]);
    expect(result.note).toContain("didn't find an extension");
  });
});
