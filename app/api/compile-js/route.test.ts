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

describe("POST /api/compile-js", () => {
  it("rejects with 403 when Turnstile verification fails", async () => {
    mockVerifyTurnstile.mockResolvedValue(false);
    const req = makeRequest({
      png: new Blob([new Uint8Array([1])]),
      turnstileToken: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Human verification");
  });

  it("returns 400 when no PNG is uploaded", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    const req = makeRequest({ turnstileToken: "ok" });
    const res = await POST(req);
    expect(res.status).toBe(400);
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

  it("forwards auth headers and returns JS on success", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "cf-id");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "cf-secret");

    const mockFetch = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://example.com/api/compile-js");
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer s3cret");
      expect(headers["CF-Access-Client-Id"]).toBe("cf-id");
      // The turnstile token must NOT be forwarded to the Chromebook.
      const body = init.body as FormData;
      expect(body.get("turnstileToken")).toBeNull();
      return new Response("console.log('game');", {
        status: 200,
        headers: {
          "Content-Type": "application/javascript",
          "X-Project-Name": "My Game",
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
    expect(res.headers.get("Content-Type")).toBe("application/javascript");
    expect(res.headers.get("X-Project-Name")).toBe("My Game");
    expect(await res.text()).toBe("console.log('game');");
  });

  it("surfaces the upstream error on a non-ok response", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "compile failed", log: ["x"] }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const req = makeRequest({
      png: new Blob([new Uint8Array([1])]),
      turnstileToken: "ok",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("compile failed");
  });
});
