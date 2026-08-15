"use client";

import styles from "./tv-panel-button.module.css";

interface TvPanelButtonProps {
  id?: string;
  label?: string;
  children?: React.ReactNode;
  wide?: boolean;
  title?: string;
  disabled?: boolean;
}

export default function TvPanelButton({
  id,
  label,
  children,
  wide = false,
  title,
  disabled,
}: TvPanelButtonProps) {
  return (
    <div className={`${styles.wrap} ${wide ? styles.wide : ""}`}>
      {label && <span className={styles.label}>{label}</span>}
      <button
        id={id}
        className={styles.button}
        title={title}
        disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
}
