import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "./SiteHeader";

vi.mock("./AuthButton", () => ({
  AuthButton: () => <div data-testid="auth-button">AuthButton</div>,
}));

vi.mock("./SiteNav", () => ({
  SiteNav: () => <nav data-testid="site-nav">SiteNav</nav>,
}));

vi.mock("@/app/games/components/SearchBox", () => ({
  SearchBox: () => <div data-testid="search-box">SearchBox</div>,
}));

describe("SiteHeader", () => {
  it("renders a single h1 heading", () => {
    render(<SiteHeader user={null} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "MakeCode Games!"
    );
  });

  it("renders the SearchBox", () => {
    render(<SiteHeader user={null} />);
    expect(screen.getByTestId("search-box")).toBeDefined();
  });

  it("does not render the AuthButton (login is hidden)", () => {
    render(<SiteHeader user={null} />);
    expect(screen.queryByTestId("auth-button")).toBeNull();
  });

  it("renders the SiteNav", () => {
    render(<SiteHeader user={null} />);
    expect(screen.getByTestId("site-nav")).toBeDefined();
  });

  it("uses the community library subtitle (not the Microsoft disclaimer)", () => {
    render(<SiteHeader user={null} />);
    expect(screen.getByText(/fan-made community library/i)).toBeDefined();
    expect(screen.queryByText(/not affiliated with Microsoft/i)).toBeNull();
  });

  it("links to MakeCode Arcade from the subtitle", () => {
    render(<SiteHeader user={null} />);
    const link = screen.getByRole("link", { name: "MakeCode Arcade" });
    expect(link.getAttribute("href")).toBe("https://arcade.makecode.com");
  });
});
