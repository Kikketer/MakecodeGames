import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockRenderer } from "./BlockRenderer";
import type { ExtensionTool } from "@/content/extensions/types";

const TARGET_ORIGIN = "https://arcade.makecode.com";

const mockTool: ExtensionTool = {
  slug: "camera-view-shake",
  title: "camera view shake",
  blockId: "camera_view_shake",
  blockString: "camera view $cameraView shake by $amplitude pixels for $duration ms",
  group: "Camera",
  weight: 50,
  problem: "Shakes the camera.",
  whatItDoes: "Shakes the camera view.",
  parameters: [],
  example: "camera.viewShake(10, 500)",
};

function makeTool(overrides: Partial<ExtensionTool> = {}): ExtensionTool {
  return { ...mockTool, ...overrides };
}

/**
 * Dispatch a synthetic message event on window, as if it came from the
 * MakeCode renderer iframe.
 */
function dispatchRendererMessage(data: Record<string, unknown>) {
  const event = new MessageEvent("message", {
    origin: TARGET_ORIGIN,
    data,
  });
  fireEvent(window, event);
}

describe("BlockRenderer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the blockString placeholder while loading", () => {
    render(<BlockRenderer packageSlug="github:riknoll/arcade-split-screen" repo="arcade-split-screen" tool={mockTool} />);

    expect(screen.getByText(mockTool.blockString)).toBeTruthy();
  });

  it("renders the SVG when a successful renderblocks response arrives", () => {
    const postMessageSpy = vi.fn();
    render(<BlockRenderer packageSlug="github:riknoll/arcade-split-screen" repo="arcade-split-screen" tool={mockTool} />);

    const iframe = document.querySelector("iframe")!;
    // Mock contentWindow.postMessage so we can verify the request
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    // Simulate the renderer becoming ready
    dispatchRendererMessage({ source: "makecode", type: "renderready" });

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "renderblocks",
        code: mockTool.example,
        options: { package: "arcade-split-screen=github:riknoll/arcade-split-screen" },
      }),
      TARGET_ORIGIN,
    );

    // Simulate the renderer returning an SVG
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect></rect></svg>';
    dispatchRendererMessage({
      source: "makecode",
      type: "renderblocks",
      id: postMessageSpy.mock.calls[0][0].id,
      svg,
    });

    // The SVG container should now be in the DOM
    const container = document.querySelector('[role="img"]');
    expect(container).not.toBeNull();
    expect(container?.innerHTML).toBe(svg);
    // The placeholder pre should be gone
    expect(screen.queryByText(mockTool.blockString)).toBeNull();
  });

  it("falls back to <pre> blockString when the render errors", () => {
    const postMessageSpy = vi.fn();
    render(<BlockRenderer packageSlug="github:riknoll/arcade-split-screen" repo="arcade-split-screen" tool={mockTool} />);

    const iframe = document.querySelector("iframe")!;
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    dispatchRendererMessage({ source: "makecode", type: "renderready" });

    // Simulate an error response
    dispatchRendererMessage({
      source: "makecode",
      type: "renderblocks",
      id: postMessageSpy.mock.calls[0][0].id,
      error: "Decompile failed",
    });

    // Should still show the blockString in a pre (the error fallback)
    expect(screen.getByText(mockTool.blockString)).toBeTruthy();
    // No SVG container
    expect(document.querySelector('[role="img"]')).toBeNull();
  });

  it("falls back to <pre> blockString on timeout", () => {
    render(<BlockRenderer packageSlug="github:riknoll/arcade-split-screen" repo="arcade-split-screen" tool={mockTool} />);

    // Advance past the 30s render timeout
    vi.advanceTimersByTime(31_000);

    // Should still show the blockString (now as the error fallback, not the loading placeholder)
    expect(screen.getByText(mockTool.blockString)).toBeTruthy();
    expect(document.querySelector('[role="img"]')).toBeNull();
  });

  it("ignores messages from other origins", () => {
    const postMessageSpy = vi.fn();
    render(<BlockRenderer packageSlug="github:riknoll/arcade-split-screen" repo="arcade-split-screen" tool={mockTool} />);

    const iframe = document.querySelector("iframe")!;
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    // Dispatch a renderready from a wrong origin
    const event = new MessageEvent("message", {
      origin: "https://evil.example.com",
      data: { source: "makecode", type: "renderready" },
    });
    fireEvent(window, event);

    // Should not have posted a renderblocks request
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("builds packageSpec as {repo}={packageSlug}", () => {
    const postMessageSpy = vi.fn();
    const tool = makeTool({ slug: "custom-tool" });
    render(<BlockRenderer packageSlug="github:jwunderl/arcade-sprite-util" repo="arcade-sprite-util" tool={tool} />);

    const iframe = document.querySelector("iframe")!;
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    dispatchRendererMessage({ source: "makecode", type: "renderready" });

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { package: "arcade-sprite-util=github:jwunderl/arcade-sprite-util" },
      }),
      TARGET_ORIGIN,
    );
  });
});
