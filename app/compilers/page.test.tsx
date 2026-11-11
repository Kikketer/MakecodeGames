import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompilersPage from "./page";
import { COMPILER_TOOLS } from "./compiler-tools";

describe("CompilersPage", () => {
  it("lists GitHub Repo to PNG last", () => {
    expect(COMPILER_TOOLS.at(-1)?.id).toBe("repo-to-png");
  });

  it("links each native target to its own route", () => {
    render(<CompilersPage />);
    expect(
      screen.getByRole("link", { name: "Open PNG to x86 Native" }).getAttribute("href"),
    ).toBe("/compilers/native-x86");
    expect(
      screen
        .getByRole("link", { name: "Open PNG to ARM Native (Raspberry Pi 3 or less)" })
        .getAttribute("href"),
    ).toBe("/compilers/native-arm");
    expect(
      screen.getByRole("link", { name: "Open PNG to EXE (Windows)" }).getAttribute("href"),
    ).toBe("/compilers/windows");
  });

  it("links cabinet compilers to their setup guides", () => {
    render(<CompilersPage />);
    const guides = screen.getAllByRole("link", { name: "Chromium Kiosk (menu)" });
    expect(guides[0].getAttribute("href")).toBe(
      "https://cjweed.com/CreationStationArcade/chromium-kiosk/",
    );
  });
});
