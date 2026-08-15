"use client";

import styles from "./tv-panel.module.css";
import TvPanelButton from "./tv-panel-button";

export default function TvPanel({ duration }: { duration: number }) {
  const initMinutes = Math.floor(duration / 60);
  const initSeconds = duration % 60;
  const initSecondsStr = initSeconds.toString().padStart(2, "0");

  return (
    <div className={styles.panel}>
      <div className="digital-timer" id="timer" data-duration={duration}>
        <span className="digit">{initMinutes}</span>
        <span className="colon">:</span>
        <span className="digit">{initSecondsStr[0]}</span>
        <span className="digit">{initSecondsStr[1]}</span>
      </div>

      <div className={styles.buttonGroup}>
        <section className={styles.group}>
          <span className={styles.groupLabel}>POWER</span>
          <TvPanelButton id="reset-button" title="Reset Current Game" />
        </section>

        <section className={styles.group}>
          <span className={styles.groupLabel}>VOLUME</span>
          <div className={styles.row}>
            <TvPanelButton label="−" />
            <TvPanelButton label="+" />
          </div>
        </section>

        <section className={styles.group}>
          <span className={styles.groupLabel}>CHANNEL</span>
          <div className={styles.row}>
            <TvPanelButton label="▼" />
            <TvPanelButton label="▲" />
          </div>
        </section>
      </div>

      <div className={styles.footer}></div>
    </div>
  );
}
