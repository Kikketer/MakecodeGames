import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

function imageString(fill: string) {
  const row = Array(16).fill(fill).join(" ");
  return Array(16).fill(row).join("\n");
}

function renderHtml(code: string, packageSpec: string): string {
  const rendererUrl = "https://arcade.makecode.com/--docs?render=1";
  const targetOrigin = "https://arcade.makecode.com";

  return `<!DOCTYPE html>
<html>
  <body>
    <script>
      const code = ${JSON.stringify(code)};
      const packageSpec = ${JSON.stringify(packageSpec)};
      const rendererUrl = ${JSON.stringify(rendererUrl)};
      const targetOrigin = ${JSON.stringify(targetOrigin)};

      const iframe = document.createElement("iframe");
      iframe.src = rendererUrl;
      iframe.style.position = "absolute";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);

      const timeout = setTimeout(() => {
        window.__renderError = "Timed out waiting for renderblocks response";
      }, 60000);

      function send() {
        if (!iframe.contentWindow) {
          window.__renderError = "Renderer iframe contentWindow not available";
          return;
        }
        iframe.contentWindow.postMessage(
          {
            type: "renderblocks",
            id: "distance-between",
            code,
            options: { package: packageSpec },
          },
          targetOrigin,
        );
      }

      window.addEventListener("message", (ev) => {
        if (ev.origin !== targetOrigin) return;
        const msg = ev.data;
        if (msg?.source !== "makecode") return;

        if (msg.type === "renderready") {
          send();
        } else if (msg.type === "renderblocks") {
          clearTimeout(timeout);
          if (msg.error) {
            window.__renderError = msg.error;
          } else if (msg.svg) {
            window.__renderedSvg = msg.svg;
          } else {
            window.__renderError = "No SVG returned";
          }
        }
      });
    </script>
  </body>
</html>`;
}

async function main() {
  const owner = "jwunderl";
  const repo = "arcade-sprite-util";
  const slug = "distance-between";
  const outPath = `public/extensions/${owner}/${repo}/${slug}.svg`;

  const code = `let mySprite = sprites.create(img\`${imageString("1")}\`, SpriteKind.Player)
let myEnemy = sprites.create(img\`${imageString("2")}\`, SpriteKind.Enemy)
let distance = spriteutils.distanceBetween(mySprite, myEnemy)
console.log(distance)`;

  const packageSpec = `arcade-sprite-util=github:${owner}/${repo}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(renderHtml(code, packageSpec));

  try {
    await page.waitForFunction(
      'typeof window.__renderedSvg === "string" || typeof window.__renderError === "string"',
      { timeout: 65000 },
    );

    const result = (await page.evaluate(
      '({ svg: window.__renderedSvg, error: window.__renderError })',
    )) as { svg?: string; error?: string };

    if (result.error || !result.svg) {
      throw new Error(result.error || "No SVG returned");
    }

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, result.svg, "utf-8");
    console.log(`Wrote ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
