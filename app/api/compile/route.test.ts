import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const mockVerifyTurnstile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: mockVerifyTurnstile,
  isTurnstileEnabled: vi.fn(() => false),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockVerifyTurnstile.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function makeRequest(parts: Record<string, string | Blob>): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(parts)) {
    form.append(key, value);
  }
  // Return a minimal Request-like object whose `formData()` resolves to the
  // same-realm FormData. Round-tripping through `new Request(body: form)` in
  // jsdom re-parses the Blob into a different realm, which breaks the
  // `instanceof Blob` check the route handler relies on (a test-only artifact;
  // production Node has a single Blob realm).
  return { formData: async () => form } as unknown as Request;
}

describe("POST /api/compile (ELF)", () => {
  it("rejects with 403 when Turnstile verification fails", async () => {
    mockVerifyTurnstile.mockResolvedValue(false);
    const req = makeRequest({
      png: new Blob([new Uint8Array([1])]),
      turnstileToken: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 503 when INGEST_URL is not configured", async () => {
    vi.stubEnv("INGEST_URL", "");
    vi.stubEnv("INGEST_SECRET", "");
    const req = makeRequest({
      png: new Blob([new Uint8Array([1])]),
      turnstileToken: "ok",
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("forwards auth headers and returns the ELF binary on success", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "cf-id");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "cf-secret");

    const elfBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    const mockFetch = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://example.com/api/compile");
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer s3cret");
      expect(headers["CF-Access-Client-Id"]).toBe("cf-id");
      const body = init.body as FormData;
      expect(body.get("turnstileToken")).toBeNull();
      return new Response(elfBytes, {
        status: 200,
        headers: {
          "content-type": "application/octet-stream",
          "content-disposition": 'attachment; filename="game.elf"',
          "x-project-name": "My Game",
        },
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = makeRequest({
      png: new Blob([new Uint8Array([1])]),
      turnstileToken: "ok",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Disposition")).toContain("game.elf");
    expect(res.headers.get("X-Project-Name")).toBe("My Game");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf[0]).toBe(0x7f);
  });
});
