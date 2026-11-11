import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompilersPage from "./page";
import { COMPILER_TOOLS } from "./compiler-tools";

describe("CompilersPage", () => {
  it("lists GitHub Repo to PNG last", () => {
    expect(COMPILER_TOOLS.at(-1)?.id).toBe("repo-to-png");
  });

  it("links each native target to the desktop compiler with its arch preselected", () => {
    render(<CompilersPage />);
    expect(
      screen.getByRole("link", { name: "Open PNG to x86 Native" }).getAttribute("href"),
    ).toBe("/compilers/desktop?arch=x86-64");
    expect(
      screen
        .getByRole("link", { name: "Open PNG to ARM Native (Raspberry Pi 3 or less)" })
        .getAttribute("href"),
    ).toBe("/compilers/desktop?arch=arm64");
    expect(
      screen.getByRole("link", { name: "Open PNG to EXE (Windows)" }).getAttribute("href"),
    ).toBe("/compilers/desktop?arch=win64");
  });

  it("links cabinet compilers to their setup guides", () => {
    render(<CompilersPage />);
    const guides = screen.getAllByRole("link", { name: "Chromium Kiosk (menu)" });
    expect(guides[0].getAttribute("href")).toBe(
      "https://cjweed.com/CreationStationArcade/chromium-kiosk/",
    );
  });
});
