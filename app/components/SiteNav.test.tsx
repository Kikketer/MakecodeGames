import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mutable pathname so individual tests can simulate different routes.
let mockPathname = "/games";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { SiteNav } from "./SiteNav";

describe("SiteNav", () => {
  it("renders a link to the One Minute Arcade tab", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    const link = screen.getByRole("link", { name: "One Minute Arcade" });
    expect(link.getAttribute("href")).toBe("/arcade");
  });

  it("renders all three nav tabs", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Games" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Extensions" })).toBeDefined();
    expect(screen.getByRole("link", { name: "One Minute Arcade" })).toBeDefined();
  });

  it("highlights the arcade tab when on /arcade", () => {
    mockPathname = "/arcade";
    render(<SiteNav />);
    const arcadeLink = screen.getByRole("link", { name: "One Minute Arcade" });
    expect(arcadeLink.className).toContain("bg-makecode-red");
  });

  it("does not highlight the arcade tab when on /games", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    const arcadeLink = screen.getByRole("link", { name: "One Minute Arcade" });
    expect(arcadeLink.className).not.toContain("bg-makecode-red");
  });
});
