import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mutable pathname so individual tests can simulate different routes.
let mockPathname = "/games";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { SiteNav } from "./SiteNav";

describe("SiteNav", () => {
  it.skip("renders a link to the One Minute Arcade tab", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    const link = screen.getByRole("link", { name: "One Minute Arcade" });
    expect(link.getAttribute("href")).toBe("/arcade");
  });

  it("renders all active nav tabs", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Games" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Extensions" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Compilers" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Utilities" })).toBeDefined();
    // expect(screen.getByRole("link", { name: "One Minute Arcade" })).toBeDefined();
  });

  it("renders a link to the Utilities tab", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    const link = screen.getByRole("link", { name: "Utilities" });
    expect(link.getAttribute("href")).toBe("/utilities");
  });

  it("highlights the utilities tab when on /utilities/png-to-img", () => {
    mockPathname = "/utilities/png-to-img";
    render(<SiteNav />);
    const utilitiesLink = screen.getByRole("link", { name: "Utilities" });
    expect(utilitiesLink.className).toContain("bg-makecode-red");
  });

  it("renders a link to the Compilers tab", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    const link = screen.getByRole("link", { name: "Compilers" });
    expect(link.getAttribute("href")).toBe("/compilers");
  });

  it("highlights the compilers tab when on /compilers/desktop", () => {
    mockPathname = "/compilers/desktop";
    render(<SiteNav />);
    const compilersLink = screen.getByRole("link", { name: "Compilers" });
    expect(compilersLink.className).toContain("bg-makecode-red");
  });

  it.skip("highlights the arcade tab when on /arcade", () => {
    mockPathname = "/arcade";
    render(<SiteNav />);
    const arcadeLink = screen.getByRole("link", { name: "One Minute Arcade" });
    expect(arcadeLink.className).toContain("bg-makecode-red");
  });

  it.skip("does not highlight the arcade tab when on /games", () => {
    mockPathname = "/games";
    render(<SiteNav />);
    const arcadeLink = screen.getByRole("link", { name: "One Minute Arcade" });
    expect(arcadeLink.className).not.toContain("bg-makecode-red");
  });
});
