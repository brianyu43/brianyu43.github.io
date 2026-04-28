import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const storyboardPath = path.join(appRoot, "public", "comic", "v01", "storyboard.json");
const finalDir = path.join(appRoot, "public", "comic", "v01", "final");
const proofDir = path.join(appRoot, "public", "comic", "v01", "proof");

const width = 1080;
const height = 1920;

async function main() {
  const storyboard = JSON.parse(await fs.readFile(storyboardPath, "utf8"));
  await fs.mkdir(finalDir, { recursive: true });
  await fs.mkdir(proofDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  try {
    for (const panel of storyboard.panels) {
      const basePath = path.join(appRoot, "public", panel.base);
      const outPng = path.join(proofDir, `${String(panel.index).padStart(3, "0")}.png`);
      const outWebp = path.join(finalDir, `${String(panel.index).padStart(3, "0")}.webp`);
      const imageData = await fs.readFile(basePath);
      const imageUrl = `data:image/png;base64,${imageData.toString("base64")}`;

      await page.setContent(renderPanel(panel, imageUrl), { waitUntil: "load" });
      await page.waitForFunction(() => document.fonts ? document.fonts.ready : true);
      await page.locator(".panel").screenshot({ path: outPng, animations: "disabled" });
      await sharp(outPng).webp({ quality: 92 }).toFile(outWebp);
      console.log(`composed ${path.relative(appRoot, outWebp)}`);
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    id: storyboard.id,
    title: storyboard.title,
    subtitle: storyboard.subtitle,
    totalPanels: storyboard.panels.length,
    panels: storyboard.panels.map((panel) => ({
      index: panel.index,
      title: panel.title,
      src: `/comic/v01/final/${String(panel.index).padStart(3, "0")}.webp`,
      base: panel.base,
      point: panel.point
    }))
  };
  await fs.writeFile(path.join(appRoot, "public", "comic", "v01", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function renderPanel(panel, imageUrl) {
  const dialogue = panel.dialogue.map((line) => `
    <div class="bubble">
      <b>${escapeHtml(line.speaker)}</b>
      <span>${escapeHtml(line.text)}</span>
    </div>
  `).join("");

  const bullets = panel.board.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; }
          html, body {
            width: ${width}px;
            height: ${height}px;
            margin: 0;
            background: #111;
            font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
          }
          .panel {
            position: relative;
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
            background: #111;
          }
          .art {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.04) 28%, rgba(0,0,0,0.12) 58%, rgba(0,0,0,0.68)),
              url("${imageUrl}");
            background-size: cover;
            background-position: center;
          }
          .episode {
            position: absolute;
            top: 34px;
            left: 42px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 13px 18px;
            border: 3px solid rgba(30, 30, 30, 0.92);
            border-radius: 18px;
            background: rgba(255, 250, 230, 0.94);
            color: #171717;
            box-shadow: 0 12px 28px rgba(0,0,0,0.28);
            font-size: 25px;
            font-weight: 900;
            letter-spacing: -0.02em;
          }
          .episode span {
            color: #c62828;
            font-family: "JetBrains Mono", "Menlo", monospace;
            font-size: 24px;
          }
          .board {
            position: absolute;
            left: 42px;
            right: 42px;
            top: 126px;
            padding: 30px 34px 32px;
            border: 5px solid #202020;
            border-radius: 24px;
            background:
              linear-gradient(0deg, rgba(255,255,255,0.84), rgba(255,255,255,0.84)),
              repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(40,130,100,0.09) 46px);
            color: #121212;
            box-shadow: 0 18px 46px rgba(0,0,0,0.32);
          }
          .board h1 {
            margin: 0 0 17px;
            display: inline;
            background: linear-gradient(transparent 60%, #fff176 60%);
            font-size: 48px;
            line-height: 1.12;
            letter-spacing: -0.04em;
          }
          .board ul {
            margin: 22px 0 0;
            padding-left: 0;
            display: grid;
            gap: 14px;
            list-style: none;
          }
          .board li {
            position: relative;
            padding-left: 34px;
            font-size: 33px;
            line-height: 1.28;
            font-weight: 820;
            letter-spacing: -0.035em;
          }
          .board li::before {
            position: absolute;
            left: 0;
            top: 5px;
            color: #1565c0;
            content: "✓";
            font-weight: 1000;
          }
          .dialogues {
            position: absolute;
            left: 42px;
            right: 42px;
            bottom: 206px;
            display: grid;
            gap: 16px;
          }
          .bubble {
            width: fit-content;
            max-width: 880px;
            padding: 20px 24px 22px;
            border: 4px solid #121212;
            border-radius: 26px;
            background: rgba(255,255,255,0.95);
            color: #171717;
            box-shadow: 0 12px 30px rgba(0,0,0,0.28);
          }
          .bubble:nth-child(even) {
            justify-self: end;
            background: rgba(236,248,255,0.96);
          }
          .bubble b {
            display: block;
            margin-bottom: 4px;
            color: #c62828;
            font-size: 24px;
            font-weight: 1000;
          }
          .bubble span {
            display: block;
            font-size: 36px;
            line-height: 1.2;
            font-weight: 900;
            letter-spacing: -0.04em;
          }
          .point {
            position: absolute;
            left: 42px;
            right: 42px;
            bottom: 42px;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 16px;
            align-items: start;
            padding: 20px 24px;
            border: 4px solid #222;
            border-radius: 20px;
            background: rgba(255, 245, 157, 0.96);
            color: #171717;
            box-shadow: 0 12px 32px rgba(0,0,0,0.3);
          }
          .point b {
            color: #0d47a1;
            font-size: 24px;
            font-weight: 1000;
            white-space: nowrap;
          }
          .point span {
            font-size: 29px;
            line-height: 1.25;
            font-weight: 880;
            letter-spacing: -0.035em;
          }
        </style>
      </head>
      <body>
        <section class="panel">
          <div class="art"></div>
          <div class="episode"><span>V01 · ${String(panel.index).padStart(2, "0")}</span> CUDA 첫 임무</div>
          <div class="board">
            <h1>${escapeHtml(panel.title)}</h1>
            <ul>${bullets}</ul>
          </div>
          <div class="dialogues">${dialogue}</div>
          <div class="point"><b>CUDA POINT</b><span>${escapeHtml(panel.point)}</span></div>
        </section>
      </body>
    </html>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
