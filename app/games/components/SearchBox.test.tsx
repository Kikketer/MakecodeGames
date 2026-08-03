import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SearchBox } from "./SearchBox";
import type { GameWithStats } from "@/app/games/actions";

const mockSearchGames = vi.hoisted(() => vi.fn());
const mockRecordClick = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockWindowOpen = vi.hoisted(() => vi.fn());

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
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    windowOpenSpy = vi.spyOn(window, "open").mockImplementation(mockWindowOpen);
  });

  afterEach(() => {
    vi.useRealTimers();
    windowOpenSpy.mockRestore();
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

  it("highlights the first dropdown result with ArrowDown", async () => {
    const game = makeGame("Hall of Fame", "g1");
    mockSearchGames.mockResolvedValue([game]);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "hall" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const link = screen.getByRole("link");
    expect(link.className).not.toContain("bg-makecode-yellow");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(link.className).toContain("bg-makecode-yellow");
  });

  it("opens the highlighted result with Enter", async () => {
    const game = makeGame("Hall of Fame", "g1");
    mockSearchGames.mockResolvedValue([game]);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "hall" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockWindowOpen).toHaveBeenCalledWith(
      game.game_url,
      "_blank",
      "noopener,noreferrer"
    );
    expect(mockRecordClick).toHaveBeenCalledWith("g1");
  });

  it("moves the highlight up and down with arrow keys", async () => {
    const games = [makeGame("One", "g1"), makeGame("Two", "g2")];
    mockSearchGames.mockResolvedValue(games);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "game" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const links = screen.getAllByRole("link");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(links[0].className).toContain("bg-makecode-yellow");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(links[1].className).toContain("bg-makecode-yellow");
    expect(links[0].className).not.toContain("bg-makecode-yellow");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(links[0].className).toContain("bg-makecode-yellow");
  });

  it("updates the highlighted result on mouse hover", async () => {
    const games = [makeGame("One", "g1"), makeGame("Two", "g2")];
    mockSearchGames.mockResolvedValue(games);
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "game" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const links = screen.getAllByRole("link");
    fireEvent.mouseEnter(links[1]);
    expect(links[1].className).toContain("bg-makecode-yellow");
    expect(links[0].className).not.toContain("bg-makecode-yellow");
  });
});
