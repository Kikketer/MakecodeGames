import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayControl } from "./PlayControl";

const baseGame = {
  id: "g1",
  share_url: "https://arcade.makecode.com/1",
  makecode_id: "1",
  title: "Test Game",
  description: null,
  thumb_url: "",
  game_url: "https://arcade.makecode.com/1",
  author_username: "player",
  first_seen_at: "2026-08-01T00:00:00Z",
  last_seen_at: "2026-08-01T00:00:00Z",
  posted_at: null,
  likes: 5,
  clicks: 3,
  link_clicks: 2,
  plays: 5,
  forum_url: "",
  forum_topic_title: null,
  replies: 0,
  views: 0,
  post_cooked: null,
};

describe("PlayControl", () => {
  it("renders the play count in a pill", () => {
    render(<PlayControl game={{ ...baseGame, plays: 42 }} />);
    const pill = screen.getByLabelText("42 plays");
    expect(pill).not.toBeNull();
    expect(pill.textContent).toBe("42");
  });

  it("renders zero plays", () => {
    render(<PlayControl game={{ ...baseGame, plays: 0 }} />);
    const pill = screen.getByLabelText("0 plays");
    expect(pill).not.toBeNull();
    expect(pill.textContent).toBe("0");
  });

  it("uses a rounded pill style", () => {
    const { container } = render(<PlayControl game={{ ...baseGame, plays: 7 }} />);
    const pill = container.querySelector("span");
    expect(pill?.classList.contains("rounded-full")).toBe(true);
  });
});
