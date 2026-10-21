/**
 * Shared Cloudflare Turnstile global type and `window.turnstile`
 * augmentation. Declared once here so every client component that renders a
 * Turnstile widget uses the same shape (TS errors on conflicting subsequent
 * `Window.turnstile` declarations).
 */

export interface TurnstileGlobal {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}
