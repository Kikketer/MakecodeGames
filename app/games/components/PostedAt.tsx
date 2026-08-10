"use client";

import { useId, useRef, useState } from "react";

const TOOLTIP_SHOW_DELAY_MS = 3000;

export function formatPostedAt(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const yyyy = parsed.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function postedAtLabel(date: string | null): string | null {
  const formatted = formatPostedAt(date);
  if (!formatted) return null;
  return `Originally posted ${formatted}`;
}

export function PostedAtTooltip({
  date,
  title,
  titleClassName,
}: {
  date: string | null;
  title: string;
  titleClassName: string;
}) {
  const label = postedAtLabel(date);
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!label) {
    return <h3 className={titleClassName}>{title}</h3>;
  }

  const clearShowTimer = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  };

  const handleShow = () => {
    clearShowTimer();
    showTimer.current = setTimeout(() => {
      setVisible(true);
    }, TOOLTIP_SHOW_DELAY_MS);
  };

  const handleHide = () => {
    clearShowTimer();
    setVisible(false);
  };

  return (
    <div
      className="group relative"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
    >
      <h3
        className={titleClassName}
        tabIndex={0}
        aria-describedby={tooltipId}
        onFocus={handleShow}
        onBlur={handleHide}
      >
        {title}
      </h3>
      <span
        role="tooltip"
        id={tooltipId}
        className={`pointer-events-none absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded-sm border border-black bg-makecode-black px-2 py-1 font-sans text-xs font-bold text-white opacity-0 shadow-[2px_2px_0_#000000] transition-opacity duration-150${
          visible ? " opacity-100" : ""
        }`}
      >
        {label}
      </span>
    </div>
  );
}
