import { describe, it, expect } from "vitest";
import { parseArgs } from "./render-blocks";

describe("parseArgs", () => {
  it("returns no filters when no args are given", () => {
    expect(parseArgs([])).toEqual({});
  });

  it("parses --extension owner/repo", () => {
    expect(parseArgs(["--extension", "riknoll/arcade-split-screen"])).toEqual({
      extensionFilter: "riknoll/arcade-split-screen",
    });
  });

  it("parses -e shorthand for --extension", () => {
    expect(parseArgs(["-e", "jwunderl/arcade-sprite-util"])).toEqual({
      extensionFilter: "jwunderl/arcade-sprite-util",
    });
  });

  it("parses --slug", () => {
    expect(parseArgs(["--slug", "camera-view-shake"])).toEqual({
      slugFilter: "camera-view-shake",
    });
  });

  it("parses -s shorthand for --slug", () => {
    expect(parseArgs(["-s", "distance-between"])).toEqual({
      slugFilter: "distance-between",
    });
  });

  it("treats a bare positional arg as a slug (backwards compat)", () => {
    expect(parseArgs(["distance-between"])).toEqual({
      slugFilter: "distance-between",
    });
  });

  it("parses both --extension and --slug together", () => {
    expect(
      parseArgs(["--extension", "riknoll/arcade-split-screen", "--slug", "camera-view-shake"]),
    ).toEqual({
      extensionFilter: "riknoll/arcade-split-screen",
      slugFilter: "camera-view-shake",
    });
  });

  it("throws when --extension lacks a slash", () => {
    expect(() => parseArgs(["--extension", "arcade-split-screen"])).toThrow(
      /--extension expects "owner\/repo"/,
    );
  });
});
