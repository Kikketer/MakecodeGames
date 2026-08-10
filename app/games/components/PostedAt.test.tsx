import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostedAt, formatPostedAt } from "./PostedAt";

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

describe("PostedAt", () => {
  it("renders the formatted date in a <time> element", () => {
    render(<PostedAt date="2026-08-09T13:24:00.000Z" />);
    const el = screen.getByText("08/09/2026");
    expect(el.tagName).toBe("TIME");
    expect(el.getAttribute("datetime")).toBe("2026-08-09T13:24:00.000Z");
  });

  it("exposes an accessible label", () => {
    render(<PostedAt date="2026-08-09T13:24:00.000Z" />);
    expect(screen.getByLabelText("Posted 08/09/2026")).not.toBeNull();
  });

  it("renders nothing when the date is null", () => {
    const { container } = render(<PostedAt date={null} />);
    expect(container.querySelector("time")).toBeNull();
  });

  it("renders nothing for an unparseable date", () => {
    const { container } = render(<PostedAt date="not-a-date" />);
    expect(container.querySelector("time")).toBeNull();
  });
});
