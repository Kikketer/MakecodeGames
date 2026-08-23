import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SearchBox } from "./SearchBox";
import type { GameWithStats, ForumTopic, SearchGamesAndTopicsResult } from "@/app/games/actions";

const mockSearchGamesAndTopics = vi.hoisted(() => vi.fn());
const mockRecordClick = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockWindowOpen = vi.hoisted(() => vi.fn());

vi.mock("@/app/games/actions", () => ({
  searchGamesAndTopics: mockSearchGamesAndTopics,
  recordClick: mockRecordClick,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

function makeTopic(title: string, id: number): ForumTopic {
  return {
    forum_topic_id: id,
    title,
    category_name: "Games",
    reply_count: 5,
    view_count: 50,
  };
}

function makeResult(games: GameWithStats[], topics: ForumTopic[] = []): SearchGamesAndTopicsResult {
  return { topics, games };
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

  it("does not call searchGamesAndTopics for empty or whitespace input", async () => {
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "   " } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(mockSearchGamesAndTopics).not.toHaveBeenCalled();
  });

  it("debounces searchGamesAndTopics calls and uses the latest query", async () => {
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([]));
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "sp" } });
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(mockSearchGamesAndTopics).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "space" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(mockSearchGamesAndTopics).toHaveBeenCalledTimes(1);
    expect(mockSearchGamesAndTopics).toHaveBeenLastCalledWith("space", 4);
  });

  it("shows up to 4 dropdown games", async () => {
    mockSearchGamesAndTopics.mockResolvedValue(
      makeResult([
        makeGame("One", "g1"),
        makeGame("Two", "g2"),
        makeGame("Three", "g3"),
        makeGame("Four", "g4"),
        makeGame("Five", "g5"),
      ])
    );
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "game" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(4));
  });

  it("shows matching topics before games", async () => {
    const topic = makeTopic("Space Games", 101);
    const game = makeGame("Space Quest", "g1");
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([game], [topic]));

    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "space" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain("Space Games");
    expect(links[1].textContent).toContain("Space Quest");
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

  it("navigates to the topic page when a topic result is clicked", async () => {
    const topic = makeTopic("Space Games", 101);
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([], [topic]));
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "space" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const link = await screen.findByRole("link");
    fireEvent.click(link);

    expect(mockPush).toHaveBeenCalledWith("/games/search?topic=101");
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  });

  it("records a click when a game dropdown result is clicked", async () => {
    const game = makeGame("Space Game", "g1");
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([game]));
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
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([game]));
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "hall" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    const link = screen.getByRole("link");
    expect(link.className).not.toContain("bg-makecode-yellow");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(link.className).toContain("bg-makecode-yellow");
  });

  it("navigates to a topic with Enter on a highlighted topic", async () => {
    const topic = makeTopic("Hall of Fame", 101);
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([], [topic]));
    render(<SearchBox />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "hall" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/games/search?topic=101");
  });

  it("opens the highlighted game with Enter", async () => {
    const game = makeGame("Hall of Fame", "g1");
    mockSearchGamesAndTopics.mockResolvedValue(makeResult([game]));
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
    mockSearchGamesAndTopics.mockResolvedValue(makeResult(games));
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
    mockSearchGamesAndTopics.mockResolvedValue(makeResult(games));
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
