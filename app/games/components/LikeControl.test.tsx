import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LikeControl } from "./LikeControl";
import type { GameWithStats } from "@/app/games/actions";
import type { User } from "@supabase/supabase-js";

const mockAddLike = vi.hoisted(() => vi.fn());
const mockSignIn = vi.hoisted(() => vi.fn());

vi.mock("@/app/games/actions", () => ({
  addLike: mockAddLike,
}));

vi.mock("@/lib/auth-client", () => ({
  signInWithMicrosoft: mockSignIn,
}));

function makeGame(likedByMe: boolean): GameWithStats {
  return { id: "game-1", likes: 5, likedByMe } as unknown as GameWithStats;
}

const user = { id: "user-1" } as unknown as User;

describe("LikeControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a sign-in button when there is no user", () => {
    const { container } = render(<LikeControl game={makeGame(false)} user={null} />);

    const button = screen.getByRole("button", { name: /♥ 5/i });
    expect(button).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();

    fireEvent.click(button);
    expect(mockSignIn).toHaveBeenCalled();
    expect(mockAddLike).not.toHaveBeenCalled();
  });

  it("shows a submit button in a form when the user has not liked the game", () => {
    const { container } = render(<LikeControl game={makeGame(false)} user={user} />);

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    const button = screen.getByRole("button", { name: /♥ 5/i });
    expect(button).not.toBeNull();
    expect(button.getAttribute("type")).toBe("submit");
  });

  it("shows a plain read-only heart when the user has already liked the game", () => {
    const { container } = render(<LikeControl game={makeGame(true)} user={user} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("form")).toBeNull();

    const heart = screen.getByText("♥ 5");
    expect(heart).not.toBeNull();
    expect(heart.tagName).toBe("SPAN");
  });
});
