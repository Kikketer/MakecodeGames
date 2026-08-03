import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SearchBox } from "./SearchBox";
import type { GameWithStats } from "@/app/games/actions";

const mockSearchGames = vi.hoisted(() => vi.fn());
const mockRecordClick = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());

vi.mock("@/app/games/actions", () => ({
  searchGames: mockSearchGames,
  recordClick: mockRecordClick,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/image", () => ({
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    return <div data-src={src} data-alt={alt} />;
  },
}));

function makeGame(title: string, id: string): GameWithStats {
  return {
    id,
    title,
    thumb_url: "https://cdn.makecode.com/t.png",
    game_url: "https://example.com/game",
    first_seen_at: "2026-08-01T00:00:00Z",
  } as unknown as GameWithStats;
}

describe("SearchBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call searchGames for empty or whitespace input", async () => {
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "   " } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(mockSearchGames).not.toHaveBeenCalled();
  });

  it("debounces searchGames calls and uses the latest query", async () => {
    mockSearchGames.mockResolvedValue([]);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "sp" } });
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(mockSearchGames).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "space" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(mockSearchGames).toHaveBeenCalledTimes(1);
    expect(mockSearchGames).toHaveBeenLastCalledWith("space");
  });

  it("shows up to 4 dropdown results", async () => {
    mockSearchGames.mockResolvedValue([
      makeGame("One", "g1"),
      makeGame("Two", "g2"),
      makeGame("Three", "g3"),
      makeGame("Four", "g4"),
      makeGame("Five", "g5"),
    ]);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "game" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(4));
  });

  it("navigates to the search results page on submit", async () => {
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");
    const button = screen.getByRole("button", { name: /search/i });

    fireEvent.change(input, { target: { value: "space" } });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/games/search?q=space");
  });

  it("does not navigate on submit when the query is empty", async () => {
    render(<SearchBox />);
    const button = screen.getByRole("button", { name: /search/i });

    fireEvent.click(button);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("records a click when a dropdown result is clicked", async () => {
    const game = makeGame("Space Game", "g1");
    mockSearchGames.mockResolvedValue([game]);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "space" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const link = await screen.findByRole("link");
    fireEvent.click(link);

    expect(mockRecordClick).toHaveBeenCalledWith("g1");
  });
});
