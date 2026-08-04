import { chromium, type Browser } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { extensions } from "../content/extensions";
import type { ExtensionDoc, ExtensionTool } from "../content/extensions/types";

const RENDERER_URL = "https://arcade.makecode.com/--docs?render=1";
const TARGET_ORIGIN = "https://arcade.makecode.com";

function renderHtml(code: string, packageSpec: string, id: string): string {
  return `<!DOCTYPE html>
<html>
  <body>
    <script>
      const code = ${JSON.stringify(code)};
      const packageSpec = ${JSON.stringify(packageSpec)};
      const rendererUrl = ${JSON.stringify(RENDERER_URL)};
      const targetOrigin = ${JSON.stringify(TARGET_ORIGIN)};

      const iframe = document.createElement("iframe");
      iframe.src = rendererUrl;
      iframe.style.position = "absolute";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);

      const timeout = setTimeout(() => {
        window.__renderError = "Timed out waiting for renderblocks response";
      }, 30000);

      function send() {
        if (!iframe.contentWindow) {
          window.__renderError = "Renderer iframe contentWindow not available";
          return;
        }
        iframe.contentWindow.postMessage(
          {
            type: "renderblocks",
            id: ${JSON.stringify(id)},
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

async function renderTool(browser: Browser, extension: ExtensionDoc, tool: ExtensionTool): Promise<boolean> {
  const outPath = `public/extensions/${extension.owner}/${extension.repo}/${tool.slug}.svg`;
  const packageSpec = `${extension.repo}=${extension.packageSlug}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(renderHtml(tool.example, packageSpec, tool.slug));

    await page.waitForFunction(
      'typeof window.__renderedSvg === "string" || typeof window.__renderError === "string"',
      { timeout: 35000 },
    );

    const result = (await page.evaluate(
      '({ svg: window.__renderedSvg, error: window.__renderError })',
    )) as { svg?: string; error?: string };

    if (result.error || !result.svg) {
      console.warn(`Skipped ${extension.repo}/${tool.slug}: ${result.error || "no SVG returned"}`);
      return false;
    }

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, result.svg, "utf-8");
    console.log(`Wrote ${outPath}`);
    return true;
  } catch (err) {
    console.warn(`Skipped ${extension.repo}/${tool.slug}:`, err instanceof Error ? err.message : err);
    return false;
  } finally {
    await context.close();
  }
}

async function main() {
  const onlySlug = process.argv[2];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const extension of extensions) {
      for (const tool of extension.tools) {
        if (onlySlug && tool.slug !== onlySlug) continue;
        await renderTool(browser, extension, tool);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
