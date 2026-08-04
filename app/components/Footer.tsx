export function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-makecode-white bg-makecode-brown px-6 py-4 text-left text-sm text-makecode-tan">
      <div className="mx-auto max-w-7xl space-y-2">
        <p>
          This website is not developed, affiliated, or endorsed by Microsoft, the owner of MakeCode
          Arcade. Microsoft and MakeCode Arcade are trademarks of the Microsoft group of companies.
        </p>
        <p>
          Envisioned and Agentic Engineered by{" "}
          <a
            href="https://github.com/Kikketer"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-makecode-white hover:underline"
          >
            Chris Weed (Kikketer)
          </a>
        </p>
      </div>
    </footer>
  );
}
