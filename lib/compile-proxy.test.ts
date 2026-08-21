import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ingestAuthHeaders,
  getIngestUrl,
  normalizeArch,
  checkTurnstile,
  proxyCompileNative,
} from "./compile-proxy";

const mockVerifyTurnstile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: mockVerifyTurnstile,
  isTurnstileEnabled: vi.fn(() => false),
}));

beforeEach(() => {
  vi.resetAllMocks();
  // Default: Turnstile skipped (localhost behavior — no secret)
  mockVerifyTurnstile.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ingestAuthHeaders", () => {
  it("builds Bearer + CF Access headers from env vars", () => {
    vi.stubEnv("INGEST_SECRET", "s3cret");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "cf-id");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "cf-secret");
    expect(ingestAuthHeaders()).toEqual({
      Authorization: "Bearer s3cret",
      "CF-Access-Client-Id": "cf-id",
      "CF-Access-Client-Secret": "cf-secret",
    });
  });

  it("uses empty strings when env vars are missing", () => {
    vi.stubEnv("INGEST_SECRET", "");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "");
    expect(ingestAuthHeaders()).toEqual({
      Authorization: "Bearer ",
      "CF-Access-Client-Id": "",
      "CF-Access-Client-Secret": "",
    });
  });
});

describe("getIngestUrl", () => {
  it("returns the url (trailing slash stripped) when url + secret are set", () => {
    vi.stubEnv("INGEST_URL", "https://makecode.touchtypeordie.com/");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    expect(getIngestUrl()).toBe("https://makecode.touchtypeordie.com");
  });

  it("returns null when INGEST_URL is missing", () => {
    vi.stubEnv("INGEST_URL", "");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    expect(getIngestUrl()).toBeNull();
  });

  it("returns null when INGEST_SECRET is missing", () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "");
    expect(getIngestUrl()).toBeNull();
  });
});

describe("normalizeArch", () => {
  it("passes through arm64 and win64", () => {
    expect(normalizeArch("arm64")).toBe("arm64");
    expect(normalizeArch("win64")).toBe("win64");
  });

  it("defaults unrecognized values to x86-64", () => {
    expect(normalizeArch("x86-64")).toBe("x86-64");
    expect(normalizeArch(null)).toBe("x86-64");
    expect(normalizeArch("mips")).toBe("x86-64");
  });
});

describe("checkTurnstile", () => {
  it("delegates to verifyTurnstileToken", async () => {
    mockVerifyTurnstile.mockResolvedValue(true);
    expect(await checkTurnstile("token")).toBe(true);
    expect(mockVerifyTurnstile).toHaveBeenCalledWith("token");
  });

  it("returns false when verification fails", async () => {
    mockVerifyTurnstile.mockResolvedValue(false);
    expect(await checkTurnstile("bad")).toBe(false);
  });
});

describe("proxyCompileNative", () => {
  function makeForm(png: Blob | null, arch?: string) {
    const form = new FormData();
    if (png) form.append("png", png, "upload.png");
    if (arch) form.append("arch", arch);
    return form;
  }

  it("returns a config error when INGEST_URL is not set", async () => {
    vi.stubEnv("INGEST_URL", "");
    vi.stubEnv("INGEST_SECRET", "");
    const form = makeForm(new Blob([new Uint8Array([1, 2, 3])]), "x86-64");
    const res = await proxyCompileNative(form, "x86-64");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("not configured");
  });

  it("returns an error when no PNG is present", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    const res = await proxyCompileNative(new FormData(), "x86-64");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("No PNG file uploaded");
  });

  it("forwards auth headers + arch and returns the upstream JSON on success", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "cf-id");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "cf-secret");

    const mockFetch = vi.fn(async (url: string, init: RequestInit) => {
      // Verify the auth headers were forwarded.
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer s3cret");
      expect(headers["CF-Access-Client-Id"]).toBe("cf-id");
      expect(headers["CF-Access-Client-Secret"]).toBe("cf-secret");
      // Verify the arch was appended to the upstream form.
      const body = init.body as FormData;
      expect(body.get("arch")).toBe("arm64");
      expect(url).toBe("https://example.com/api/compile-native");
      return new Response(
        JSON.stringify({
          ok: true,
          base64: "AAAA",
          projectName: "My Game",
          filename: "My_Game.tar.gz",
          log: ["built"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", mockFetch);

    const form = makeForm(new Blob([new Uint8Array([1, 2, 3])]), "arm64");
    const res = await proxyCompileNative(form, "arm64");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.base64).toBe("AAAA");
      expect(res.filename).toBe("My_Game.tar.gz");
      expect(res.projectName).toBe("My Game");
      expect(res.log).toEqual(["built"]);
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces the upstream error message on a non-ok response", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false, error: "build failed", log: ["boom"] }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const form = makeForm(new Blob([new Uint8Array([1])]), "x86-64");
    const res = await proxyCompileNative(form, "x86-64");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("build failed");
      expect(res.log).toEqual(["boom"]);
    }
  });

  it("returns a diagnostic error when the upstream returns invalid JSON", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("not json", {
            status: 502,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );

    const form = makeForm(new Blob([new Uint8Array([1])]), "x86-64");
    const res = await proxyCompileNative(form, "x86-64");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("status 502");
      expect(res.error).toContain("text/plain");
      expect(res.error).toContain("not json");
    }
  });

  it("includes content-type and body preview for HTML challenge responses", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");

    const html = "<!DOCTYPE html><html><body>Access denied</body></html>";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(html, {
            status: 403,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );

    const form = makeForm(new Blob([new Uint8Array([1])]), "x86-64");
    const res = await proxyCompileNative(form, "x86-64");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("status 403");
      expect(res.error).toContain("text/html");
      expect(res.error).toContain("Access denied");
    }
  });

  it("returns a network error when fetch throws", async () => {
    vi.stubEnv("INGEST_URL", "https://example.com");
    vi.stubEnv("INGEST_SECRET", "s3cret");

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("connection reset");
    }));

    const form = makeForm(new Blob([new Uint8Array([1])]), "x86-64");
    const res = await proxyCompileNative(form, "x86-64");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("connection reset");
  });
});
