import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("hides the tooltip by default and reveals it via the opacity-100 class", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("opacity-0");
    expect(tooltip.className).not.toContain("opacity-100");
  });

  it("does not show the tooltip immediately on hover (waits for the delay)", () => {
    render(
      <PostedAtTooltip
        date="2026-08-09T13:24:00.000Z"
        title="My Game"
        titleClassName="truncate"
      />,
    );
    const group = screen.getByRole("tooltip").parentElement!;
    fireEvent.mouseEnter(group);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).not.toContain("opacity-100");
  });

  it("shows the tooltip after the 3-second hover delay", () => {
    vi.useFakeTimers();
    try {
      render(
        <PostedAtTooltip
          date="2026-08-09T13:24:00.000Z"
          title="My Game"
          titleClassName="truncate"
        />,
      );
      const group = screen.getByRole("tooltip").parentElement!;
      fireEvent.mouseEnter(group);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByRole("tooltip").className).toContain("opacity-100");
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides the tooltip immediately on mouse leave and cancels the pending show", () => {
    vi.useFakeTimers();
    try {
      render(
        <PostedAtTooltip
          date="2026-08-09T13:24:00.000Z"
          title="My Game"
          titleClassName="truncate"
        />,
      );
      const group = screen.getByRole("tooltip").parentElement!;
      fireEvent.mouseEnter(group);
      fireEvent.mouseLeave(group);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByRole("tooltip").className).not.toContain("opacity-100");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the tooltip after the 3-second focus delay", () => {
    vi.useFakeTimers();
    try {
      render(
        <PostedAtTooltip
          date="2026-08-09T13:24:00.000Z"
          title="My Game"
          titleClassName="truncate"
        />,
      );
      const heading = screen.getByRole("heading", { name: "My Game" });
      fireEvent.focus(heading);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByRole("tooltip").className).toContain("opacity-100");
    } finally {
      vi.useRealTimers();
    }
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
