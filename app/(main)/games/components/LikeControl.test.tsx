import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LikeControl } from "./LikeControl";
import type { GameWithStats } from "@/app/games/actions";

function makeGame(likes: number): GameWithStats {
  return { id: "game-1", likes } as unknown as GameWithStats;
}

describe("LikeControl", () => {
  it("shows a read-only heart with the reaction count", () => {
    const { container } = render(<LikeControl game={makeGame(5)} />);

    const heart = screen.getByText("♥ 5");
    expect(heart).not.toBeNull();
    expect(heart.tagName).toBe("SPAN");
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a zero count when there are no reactions", () => {
    render(<LikeControl game={makeGame(0)} />);
    expect(screen.getByText("♥ 0")).not.toBeNull();
  });
});
