"use client";

import Script from "next/script";
import "./tv.css";
import TvPanel from "./tv-panel";

interface TvProps {
  duration: number;
  gameName: string;
}

export default function Tv({ duration, gameName }: TvProps) {
  return (
    <div className="arcade-root">
      <main className="crt-tv">
        <div className="screen">
          <div className="click-to-start" id="click-to-start">
            CLICK TO START
          </div>
          <iframe id="makecode-frame" allow="autoplay; fullscreen"></iframe>
          <div className="upload-error" id="upload-error">
            Unable to load game,
            <br />
            try blowing on it
          </div>
          <div className="game-not-found" id="game-not-found">
            <span id="game-not-found-name"></span>
            <br />
            that game isn&apos;t loaded,
            <br />
            <a href="#" id="game-not-found-link">
              click here to play a random game
            </a>
          </div>
          <div className="bezel"></div>
        </div>
        <div className="controls">
          <input type="hidden" id="requested-game" value={gameName} />
          <TvPanel duration={duration} />
        </div>
      </main>

      <Script
        src="/arcade/arcade.js"
        strategy="afterInteractive"
        type="module"
      />
    </div>
  );
}
