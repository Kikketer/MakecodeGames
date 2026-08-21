import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  isLocalhostClient,
  computeTurnstileEnabled,
  useTurnstileEnabled,
} from "./turnstile-client";

describe("isLocalhostClient", () => {
  it("returns true for localhost", () => {
    expect(isLocalhostClient("localhost")).toBe(true);
  });

  it("returns true for 127.0.0.1 and ::1", () => {
    expect(isLocalhostClient("127.0.0.1")).toBe(true);
    expect(isLocalhostClient("::1")).toBe(true);
  });

  it("returns true for subdomains of .localhost", () => {
    expect(isLocalhostClient("app.localhost")).toBe(true);
  });

  it("returns false for production hostnames", () => {
    expect(isLocalhostClient("makecodegames.com")).toBe(false);
    expect(isLocalhostClient("example.vercel.app")).toBe(false);
  });
});

describe("computeTurnstileEnabled", () => {
  it("is disabled on localhost even with a site key", () => {
    expect(computeTurnstileEnabled("0x4AAAAAAEKX-f-G0toVsaPW", "localhost")).toBe(false);
    expect(computeTurnstileEnabled("0x4AAAAAAEKX-f-G0toVsaPW", "127.0.0.1")).toBe(false);
  });

  it("is disabled on a production host when no site key is configured", () => {
    expect(computeTurnstileEnabled(undefined, "makecodegames.com")).toBe(false);
    expect(computeTurnstileEnabled("", "makecodegames.com")).toBe(false);
  });

  it("is enabled on a production host when a site key is configured", () => {
    expect(computeTurnstileEnabled("0x4AAAAAAEKX-f-G0toVsaPW", "makecodegames.com")).toBe(true);
  });
});

describe("useTurnstileEnabled", () => {
  it("is disabled on the jsdom default localhost hostname", () => {
    const { result } = renderHook(() => useTurnstileEnabled());
    expect(result.current).toBe(false);
  });
});
