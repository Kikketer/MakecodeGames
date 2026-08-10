import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostedAtTooltip, formatPostedAt, postedAtLabel } from "./PostedAt";

describe("formatPostedAt", () => {
  it("formats an ISO date as mm/dd/yyyy using UTC", () => {
    expect(formatPostedAt("2026-08-09T13:24:00.000Z")).toBe("08/09/2026");
  });

  it("pads single-digit months and days", () => {
    expect(formatPostedAt("2026-01-05T00:00:00.000Z")).toBe("01/05/2026");
  });

  it("handles a date string at the UTC day boundary without shifting", () => {
    expect(formatPostedAt("2026-12-31T23:59:59.000Z")).toBe("12/31/2026");
  });

  it("returns null when the date is null", () => {
    expect(formatPostedAt(null)).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(formatPostedAt("not-a-date")).toBeNull();
  });
});

describe("postedAtLabel", () => {
  it("builds an 'Originally posted' label from a date", () => {
    expect(postedAtLabel("2026-08-09T13:24:00.000Z")).toBe(
      "Originally posted 08/09/2026",
    );
  });

  it("returns null when the date is null", () => {
    expect(postedAtLabel(null)).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(postedAtLabel("not-a-date")).toBeNull();
  });
});

describe("PostedAtTooltip", () => {
  it("renders the title in an h3 with the provided className", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate font-sans text-base font-bold"
      />,
    );
    const heading = screen.getByRole("heading", { name: "My Game" });
    expect(heading.tagName).toBe("H3");
    expect(heading.className).toBe(
      "truncate font-sans text-base font-bold",
    );
  });

  it("renders a tooltip with the 'Originally posted' label", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toBe("Originally posted 08/09/2026");
  });

  it("links the heading to the tooltip via aria-describedby", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    const heading = screen.getByRole("heading", { name: "My Game" });
    const tooltip = screen.getByRole("tooltip");
    expect(heading.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(tooltip.getAttribute("role")).toBe("tooltip");
  });

  it("hides the tooltip by default and shows it on hover/focus classes", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("opacity-0");
    expect(tooltip.className).toContain("group-hover:opacity-100");
    expect(tooltip.className).toContain("group-focus-within:opacity-100");
  });

  it("makes the heading focusable when a tooltip is present", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    expect(screen.getByRole("heading", { name: "My Game" }).getAttribute("tabindex")).toBe("0");
  });

  it("renders only the heading (no tooltip) when the date is null", () => {
    render(
      <PostedAtTooltip date={null} title="My Game" titleClassName="truncate" />,
    );
    expect(screen.getByRole("heading", { name: "My Game" })).not.toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders only the heading (no tooltip) for an unparseable date", () => {
    render(
      <PostedAtTooltip
        date="not-a-date"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    expect(screen.getByRole("heading", { name: "My Game" })).not.toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("does not make the heading focusable when there is no tooltip", () => {
    render(
      <PostedAtTooltip date={null} title="My Game" titleClassName="truncate" />,
    );
    expect(screen.getByRole("heading", { name: "My Game" }).getAttribute("tabindex")).toBeNull();
  });
});
