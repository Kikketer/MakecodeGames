import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render } from "@testing-library/react";

vi.mock("next/script", () => ({
  // onReady fires on every mount, including after client-side navigation.
  default: function MockScript({ onReady }: { onReady?: () => void }) {
    useEffect(() => onReady?.(), [onReady]);
    return null;
  },
}));

vi.mock("@/lib/turnstile-client", () => ({
  useTurnstileEnabled: () => true,
  turnstileSiteKey: () => "test-site-key",
}));

import { useTurnstile } from "./use-turnstile";

function Harness() {
  const turnstile = useTurnstile();
  return <>{turnstile.widget}</>;
}

describe("useTurnstile", () => {
  const renderWidget = vi.fn(() => "widget-1");
  const removeWidget = vi.fn();

  beforeEach(() => {
    renderWidget.mockClear();
    removeWidget.mockClear();
    window.turnstile = { render: renderWidget, reset: vi.fn(), remove: removeWidget };
  });

  it("renders the widget on mount, before any file is chosen", () => {
    render(<Harness />);
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(renderWidget).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sitekey: "test-site-key" }),
    );
  });

  it("re-renders the widget when remounted with the script already loaded", () => {
    const first = render(<Harness />);
    first.unmount();
    expect(removeWidget).toHaveBeenCalledWith("widget-1");
    render(<Harness />);
    expect(renderWidget).toHaveBeenCalledTimes(2);
  });
});
