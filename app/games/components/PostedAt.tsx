export function formatPostedAt(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const yyyy = parsed.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function PostedAt({ date }: { date: string | null }) {
  const formatted = formatPostedAt(date);
  if (!formatted) return null;
  return (
    <time
      dateTime={date ?? undefined}
      className="font-sans text-xs font-bold text-makecode-brown"
      aria-label={`Posted ${formatted}`}
    >
      {formatted}
    </time>
  );
}
