import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const comicRoot = path.join(appRoot, "public", "comic", "v01_landscape");
const storyboardPath = path.join(comicRoot, "storyboard.json");
const finalDir = path.join(comicRoot, "final");
const proofDir = path.join(comicRoot, "proof");

const width = 1664;
const height = 936;

async function main() {
  const storyboard = JSON.parse(await fs.readFile(storyboardPath, "utf8"));
  await fs.mkdir(finalDir, { recursive: true });
  await fs.mkdir(proofDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  try {
    for (const panel of storyboard.panels) {
      const name = `${String(panel.index).padStart(3, "0")}`;
      const basePath = path.join(comicRoot, "base", `${name}.png`);
      const outPng = path.join(proofDir, `${name}.png`);
      const outWebp = path.join(finalDir, `${name}.webp`);
      const baseData = await fs.readFile(basePath);
      const baseUrl = `data:image/png;base64,${baseData.toString("base64")}`;

      await page.setContent(renderPage(panel, baseUrl), { waitUntil: "load" });
      await page.evaluate(() => document.fonts?.ready);
      await page.locator(".page").screenshot({ path: outPng, animations: "disabled" });
      await sharp(outPng).webp({ quality: 93 }).toFile(outWebp);
      console.log(`composed public/comic/v01_landscape/final/${name}.webp`);
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    id: storyboard.id,
    title: storyboard.title,
    subtitle: storyboard.subtitle,
    format: storyboard.format,
    totalPanels: storyboard.panels.length,
    panels: storyboard.panels.map((panel) => ({
      index: panel.index,
      title: panel.title,
      src: `/comic/v01_landscape/final/${String(panel.index).padStart(3, "0")}.webp`,
      base: `/comic/v01_landscape/base/${String(panel.index).padStart(3, "0")}.png`,
      takeaway: panel.takeaway
    }))
  };
  await fs.writeFile(path.join(comicRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function renderPage(panel, baseUrl) {
  return `<!doctype html>
  <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <style>${css()}</style>
    </head>
    <body>
      <section class="page">
        <div class="bg" style="background-image: linear-gradient(90deg, rgba(6,8,12,.25), rgba(6,8,12,.06) 42%, rgba(6,8,12,.2)), url('${baseUrl}')"></div>
        <div class="paper">
          <div class="top-band">
            <span>V01 · ${String(panel.index).padStart(2, "0")}</span>
            <strong>${escapeHtml(panel.title)}</strong>
          </div>
          <div class="question">${escapeHtml(panel.question)}</div>
          <div class="diagram">${diagram(panel.kind)}</div>
          <div class="callouts">${panel.callouts.map((item, index) => `<div class="callout c${index + 1}">${escapeHtml(item)}</div>`).join("")}</div>
          <div class="flow">${panel.flow.map((item) => `<div>${escapeHtml(item)}</div>`).join("<b>→</b>")}</div>
        </div>
        <div class="side side-left">
          <b>LEAD</b>
          <span>${leadLine(panel.kind)}</span>
        </div>
        <div class="side side-right">
          <b>CHECK</b>
          <span>${checkLine(panel.kind)}</span>
        </div>
        <div class="takeaway"><b>핵심 계약</b><span>${escapeHtml(panel.takeaway)}</span></div>
      </section>
    </body>
  </html>`;
}

function css() {
  return `
    * { box-sizing: border-box; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      overflow: hidden;
      background: #111;
      font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
    }
    .page {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #111;
      color: #111;
    }
    .bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: saturate(1.06) contrast(1.02);
    }
    .paper {
      position: absolute;
      left: 270px;
      top: 28px;
      width: 1124px;
      height: 735px;
      padding: 18px;
      border: 4px solid #141414;
      background:
        linear-gradient(rgba(255,255,255,.92), rgba(255,255,255,.92)),
        repeating-linear-gradient(0deg, transparent 0 31px, rgba(13,71,161,.07) 32px);
      box-shadow: 0 16px 46px rgba(0,0,0,.38);
    }
    .paper::before {
      content: "";
      position: absolute;
      inset: 8px;
      border: 1px solid rgba(0,0,0,.12);
      pointer-events: none;
    }
    .top-band {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 16px;
      height: 52px;
      padding: 0 16px;
      border: 3px solid #111;
      background: #fff;
    }
    .top-band span {
      color: #c62828;
      font-family: "JetBrains Mono", "Menlo", monospace;
      font-size: 22px;
      font-weight: 1000;
    }
    .top-band strong {
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 30px;
      font-weight: 1000;
      letter-spacing: -0.04em;
    }
    .question {
      margin: 16px 0 14px;
      padding: 12px 18px 14px;
      border: 3px solid #111;
      background: #fff7de;
      font-size: 33px;
      font-weight: 1000;
      line-height: 1.15;
      letter-spacing: -0.045em;
    }
    .diagram {
      position: relative;
      height: 418px;
      border: 3px solid #111;
      background: rgba(255,255,255,.94);
      overflow: hidden;
    }
    .diagram svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .callouts {
      position: absolute;
      right: 30px;
      top: 182px;
      display: grid;
      gap: 10px;
      width: 272px;
      z-index: 4;
    }
    .callout {
      min-height: 58px;
      display: flex;
      align-items: center;
      padding: 9px 12px;
      border: 3px solid #111;
      background: #fff;
      font-size: 20px;
      line-height: 1.16;
      font-weight: 920;
      letter-spacing: -0.035em;
    }
    .callout.c1 { border-color: #0288d1; }
    .callout.c2 { border-color: #c62828; }
    .callout.c3 { border-color: #222; }
    .flow {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 18px;
      height: 78px;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .flow div {
      flex: 1 1 0;
      min-width: 0;
      height: 58px;
      display: grid;
      place-items: center;
      border: 3px solid #111;
      background: #fff;
      font-size: 21px;
      font-weight: 1000;
      letter-spacing: -0.035em;
      text-align: center;
    }
    .flow b {
      flex: 0 0 38px;
      color: #0288d1;
      font-size: 36px;
      text-align: center;
    }
    .side {
      position: absolute;
      width: 248px;
      min-height: 116px;
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      border: 4px solid #111;
      background: rgba(255,255,255,.94);
      box-shadow: 0 10px 26px rgba(0,0,0,.3);
    }
    .side-left {
      left: 22px;
      bottom: 162px;
    }
    .side-right {
      right: 22px;
      top: 48px;
    }
    .side b {
      color: #c62828;
      font-size: 18px;
      font-weight: 1000;
      letter-spacing: .08em;
    }
    .side span {
      font-size: 24px;
      line-height: 1.16;
      font-weight: 950;
      letter-spacing: -0.04em;
    }
    .takeaway {
      position: absolute;
      left: 28px;
      right: 28px;
      bottom: 24px;
      min-height: 96px;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 18px;
      padding: 18px 22px;
      border: 4px solid #111;
      background: #fff59d;
      box-shadow: 0 10px 28px rgba(0,0,0,.32);
    }
    .takeaway b {
      color: #0d47a1;
      font-size: 24px;
      font-weight: 1000;
      white-space: nowrap;
      letter-spacing: .02em;
    }
    .takeaway span {
      font-size: 31px;
      line-height: 1.18;
      font-weight: 1000;
      letter-spacing: -0.045em;
    }
    .label {
      font-size: 24px;
      font-weight: 1000;
      letter-spacing: -0.035em;
      fill: #111;
    }
    .small {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -0.03em;
      fill: #333;
    }
    .mono {
      font-family: "JetBrains Mono", "Menlo", monospace;
      font-weight: 900;
    }
  `;
}

function diagram(kind) {
  const generators = {
    manyTasks,
    cpuGpu,
    spmd,
    lifecycle,
    hierarchy,
    index,
    warp,
    divergence,
    occupancy,
    memory,
    coalescing,
    tiling,
    bank,
    stencil,
    reduction,
    scan,
    histogram,
    summary,
    next,
    cliff
  };
  return generators[kind]?.() ?? manyTasks();
}

function svg(body, defs = "") {
  return `<svg viewBox="0 0 1088 418" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0288d1"/></marker>
      <marker id="arrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c62828"/></marker>
      ${defs}
    </defs>
    ${body}
  </svg>`;
}

function rect(x, y, w, h, color = "#fff", stroke = "#111", sw = 3, rx = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${color}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function text(x, y, value, cls = "label", anchor = "middle") {
  return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${escapeHtml(value)}</text>`;
}

function arrow(x1, y1, x2, y2, color = "#0288d1") {
  const marker = color === "#c62828" ? "arrowRed" : "arrowBlue";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="8" marker-end="url(#${marker})"/>`;
}

function dots(x, y, cols, rows, gap = 18, r = 5, color = "#111") {
  let out = "";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      out += `<circle cx="${x + col * gap}" cy="${y + row * gap}" r="${r}" fill="${color}"/>`;
    }
  }
  return out;
}

function manyTasks() {
  let tasks = "";
  for (let i = 0; i < 36; i += 1) {
    const x = 62 + (i % 12) * 24;
    const y = 74 + Math.floor(i / 12) * 24;
    tasks += rect(x, y, 16, 16, "#fff", "#111", 2);
  }
  let workers = "";
  for (let i = 0; i < 64; i += 1) {
    const x = 560 + (i % 16) * 20;
    const y = 48 + Math.floor(i / 16) * 28;
    workers += `<circle cx="${x}" cy="${y}" r="6" fill="#0288d1"/>`;
  }
  return svg(`
    ${text(208, 42, "큰 문제를 작은 조각으로")}
    ${tasks}
    ${arrow(370, 110, 515, 110)}
    ${text(675, 42, "많은 thread가 동시에")}
    ${workers}
    ${rect(548, 190, 345, 76, "#e3f2fd", "#0288d1", 4, 8)}
    ${text(720, 238, "thread마다 자기 조각 처리")}
    ${arrow(720, 272, 720, 335)}
    ${rect(575, 338, 290, 44, "#fff59d", "#111", 3, 6)}
    ${text(720, 367, "결과를 다시 모은다", "small")}
  `);
}

function cpuGpu() {
  let lanes = "";
  for (let i = 0; i < 9; i += 1) {
    lanes += `<line x1="548" y1="${68 + i * 30}" x2="918" y2="${68 + i * 30}" stroke="#90caf9" stroke-width="9"/>`;
  }
  return svg(`
    ${text(230, 44, "CPU: 강한 일꾼 몇 명")}
    ${rect(90, 92, 270, 64, "#fff", "#111", 3, 8)}
    ${arrow(120, 124, 330, 124, "#c62828")}
    ${text(225, 198, "긴 길을 빠르게", "small")}
    ${text(720, 44, "GPU: 단순한 일꾼 다수")}
    ${lanes}
    ${dots(565, 205, 16, 4, 22, 5, "#0288d1")}
    ${text(742, 338, "처리량 throughput이 목표", "label")}
  `);
}

function spmd() {
  let tiles = "";
  for (let i = 0; i < 40; i += 1) {
    const x = 505 + (i % 10) * 42;
    const y = 70 + Math.floor(i / 10) * 42;
    tiles += rect(x, y, 30, 30, i % 2 ? "#e3f2fd" : "#fffde7", "#111", 2);
  }
  return svg(`
    ${rect(74, 126, 250, 118, "#fff59d", "#111", 4, 10)}
    ${text(199, 174, "하나의 kernel")}
    ${text(199, 212, "same code", "small")}
    ${arrow(340, 185, 470, 185)}
    ${text(700, 44, "각 thread는 좌표로 다른 데이터 선택")}
    ${tiles}
    ${arrow(715, 260, 715, 340)}
    ${rect(560, 342, 310, 44, "#e8f5e9", "#2e7d32", 3, 6)}
    ${text(715, 371, "Single Program, Multiple Data", "small")}
  `);
}

function lifecycle() {
  const steps = ["할당", "H→D 복사", "kernel 실행", "D→H 복사", "해제"];
  return svg(steps.map((step, i) => {
    const x = 70 + i * 195;
    return `${rect(x, 116, 145, 90, i === 2 ? "#fff59d" : "#fff", "#111", 3, 8)}
      ${text(x + 72, 168, step)}
      ${i < steps.length - 1 ? arrow(x + 152, 161, x + 188, 161) : ""}`;
  }).join("") + `
    ${text(544, 62, "GPU 작전은 순서가 생명")}
    ${rect(92, 275, 904, 68, "#e3f2fd", "#0288d1", 4, 8)}
    ${text(544, 318, "allocate → copy → launch → copy → free", "label")}
  `);
}

function hierarchy() {
  let blocks = "";
  for (let b = 0; b < 4; b += 1) {
    const x = 155 + b * 205;
    blocks += rect(x, 108, 145, 112, "#ffebee", "#c62828", 4, 4);
    blocks += dots(x + 25, 132, 5, 3, 22, 4, "#111");
  }
  return svg(`
    ${rect(90, 68, 860, 210, "#e3f2fd", "#0288d1", 5, 4)}
    ${blocks}
    ${text(520, 44, "grid 안에 block, block 안에 thread")}
    ${text(520, 306, "grid", "label")}
    ${text(235, 250, "block", "small")}
    ${text(235, 184, "thread dots", "small")}
  `);
}

function index() {
  let arr = "";
  for (let i = 0; i < 24; i += 1) arr += rect(120 + i * 32, 232, 28, 42, i === 10 ? "#fff59d" : "#fff", "#111", 2);
  return svg(`
    ${rect(130, 64, 820, 82, "#fff", "#111", 4, 8)}
    ${text(540, 116, "i = blockIdx.x × blockDim.x + threadIdx.x", "label")}
    ${arrow(285, 148, 285, 224)}
    ${text(285, 190, "block offset", "small")}
    ${arrow(470, 148, 470, 224)}
    ${text(470, 190, "block size", "small")}
    ${arrow(650, 148, 650, 224)}
    ${text(650, 190, "local seat", "small")}
    ${arr}
    ${text(520, 314, "계산된 i가 배열 원소를 가리킨다")}
  `);
}

function warp() {
  let lanes = "";
  for (let i = 0; i < 32; i += 1) {
    const x = 100 + (i % 16) * 52;
    const y = 104 + Math.floor(i / 16) * 78;
    lanes += rect(x, y, 36, 44, "#fff", "#111", 2, 3);
  }
  return svg(`
    ${text(544, 52, "warp = 32 threads")}
    ${lanes}
    ${arrow(170, 270, 910, 270)}
    ${rect(260, 310, 560, 56, "#e3f2fd", "#0288d1", 4, 8)}
    ${text(540, 347, "같은 instruction 흐름이 가장 빠르다", "label")}
  `);
}

function divergence() {
  return svg(`
    ${text(544, 52, "같은 warp가 다른 길로 갈라진다")}
    ${rect(120, 150, 160, 70, "#e3f2fd", "#111", 4, 8)}
    ${text(200, 194, "warp")}
    ${arrow(290, 185, 460, 118)}
    ${arrow(290, 185, 460, 250)}
    ${rect(468, 75, 205, 70, "#ffebee", "#c62828", 4, 8)}
    ${text(570, 119, "if path A")}
    ${rect(468, 220, 205, 70, "#fffde7", "#c62828", 4, 8)}
    ${text(570, 264, "else path B")}
    ${arrow(682, 110, 865, 185, "#c62828")}
    ${arrow(682, 255, 865, 185, "#c62828")}
    ${rect(870, 150, 120, 70, "#e8f5e9", "#111", 4, 8)}
    ${text(930, 194, "join")}
    ${text(544, 350, "갈라지면 일부 thread는 기다린다", "label")}
  `);
}

function occupancy() {
  let qs = "";
  for (let i = 0; i < 5; i += 1) qs += rect(95, 74 + i * 55, 190, 38, "#fff", "#111", 2, 5) + text(190, 99 + i * 55, `warp ${i + 1}`, "small");
  return svg(`
    ${text(560, 44, "한 warp가 기다릴 때 다른 warp를 실행")}
    ${qs}
    ${arrow(305, 185, 470, 185)}
    ${rect(475, 116, 190, 138, "#e3f2fd", "#0288d1", 4, 10)}
    ${text(570, 170, "SM scheduler")}
    ${text(570, 208, "swap")}
    ${arrow(675, 185, 850, 185)}
    ${rect(855, 126, 145, 118, "#fff59d", "#111", 4, 10)}
    ${text(928, 176, "memory")}
    ${text(928, 214, "latency", "small")}
    ${text(544, 346, "resident warp가 많으면 긴 대기를 숨기기 쉽다", "label")}
  `);
}

function memory() {
  const levels = [
    ["register", "가장 빠름 / thread 개인", "#fff59d"],
    ["shared", "block 협업 공간", "#e3f2fd"],
    ["L2", "GPU 전체 cache", "#e8f5e9"],
    ["global HBM", "큼 / bandwidth 중요", "#f3e5f5"]
  ];
  return svg(levels.map((level, i) => {
    const y = 64 + i * 72;
    return `${rect(205 + i * 38, y, 640 - i * 76, 52, level[2], "#111", 3, 6)}
      ${text(524, y + 34, `${level[0]} — ${level[1]}`, "label")}`;
  }).join("") + `
    ${arrow(120, 78, 120, 290)}
    ${text(120, 325, "가까울수록 빠름", "small")}
    ${arrow(960, 300, 960, 92, "#c62828")}
    ${text(960, 342, "멀수록 큼", "small")}
  `);
}

function coalescing() {
  let scattered = "";
  for (let i = 0; i < 12; i += 1) scattered += rect(110 + i * 34, 120 + (i % 3) * 26, 22, 22, "#ffebee", "#c62828", 2);
  let aligned = "";
  for (let i = 0; i < 12; i += 1) aligned += rect(640 + i * 30, 142, 24, 24, "#e3f2fd", "#0288d1", 2);
  return svg(`
    ${text(260, 70, "흩어진 주소")}
    ${scattered}
    ${text(770, 70, "연속 주소")}
    ${aligned}
    ${arrow(470, 150, 590, 150)}
    ${rect(150, 270, 250, 48, "#ffebee", "#c62828", 3, 6)}
    ${text(275, 301, "transaction 증가", "small")}
    ${rect(680, 270, 250, 48, "#e3f2fd", "#0288d1", 3, 6)}
    ${text(805, 301, "bandwidth 절약", "small")}
  `);
}

function tiling() {
  return svg(`
    ${rect(80, 110, 190, 115, "#f3e5f5", "#111", 4, 8)}
    ${text(175, 160, "global")}
    ${text(175, 198, "memory", "small")}
    ${arrow(280, 168, 430, 168)}
    ${rect(435, 92, 220, 152, "#fff59d", "#111", 4, 8)}
    ${text(545, 150, "shared tile")}
    ${text(545, 188, "reuse × many", "small")}
    ${arrow(665, 168, 825, 168)}
    ${rect(830, 110, 180, 115, "#e8f5e9", "#111", 4, 8)}
    ${text(920, 160, "output")}
    ${text(544, 306, "한 번 가져와 여러 번 쓰는 것이 핵심", "label")}
  `);
}

function bank() {
  let banks = "";
  for (let i = 0; i < 16; i += 1) banks += rect(95 + i * 48, 115, 34, 92, i === 4 ? "#ffebee" : "#fff", i === 4 ? "#c62828" : "#111", 2);
  let reqs = "";
  for (let i = 0; i < 8; i += 1) reqs += arrow(190 + i * 36, 290, 112 + 4 * 48, 215, "#c62828");
  return svg(`
    ${text(544, 60, "같은 bank에 몰리면 직렬화")}
    ${banks}
    ${reqs}
    ${rect(650, 280, 290, 54, "#e3f2fd", "#0288d1", 4, 8)}
    ${text(795, 315, "padding / layout 변경", "small")}
  `);
}

function stencil() {
  let grid = "";
  for (let r = 0; r < 7; r += 1) for (let c = 0; c < 10; c += 1) grid += rect(155 + c * 42, 78 + r * 36, 34, 28, "#fff", "#111", 1);
  return svg(`
    ${grid}
    ${rect(234, 144, 118, 100, "rgba(255,241,118,.55)", "#c62828", 5)}
    ${arrow(430, 190, 640, 190)}
    ${rect(675, 124, 190, 120, "#e3f2fd", "#0288d1", 4, 8)}
    ${text(770, 178, "output cell")}
    ${text(770, 216, "주변 입력 반영", "small")}
    ${text(544, 335, "window가 움직이며 neighbor를 반복 참조", "label")}
  `);
}

function reduction() {
  return svg(`
    ${dots(150, 84, 12, 1, 50, 9, "#0288d1")}
    ${arrow(230, 130, 290, 190)}
    ${arrow(330, 130, 290, 190)}
    ${arrow(430, 130, 490, 190)}
    ${arrow(530, 130, 490, 190)}
    ${dots(270, 205, 6, 1, 100, 12, "#2e7d32")}
    ${arrow(340, 230, 440, 285)}
    ${arrow(540, 230, 440, 285)}
    ${dots(420, 305, 3, 1, 100, 14, "#f9a825")}
    ${arrow(515, 320, 620, 350)}
    ${circle(690, 350, 28, "#c62828")}
    ${text(544, 52, "pairwise로 줄여 하나로")}
  `);
}

function scan() {
  const vals = ["3", "1", "4", "2", "5", "1"];
  return svg(vals.map((v, i) => {
    const x = 150 + i * 120;
    return `${rect(x, 110, 74, 54, "#fff", "#111", 3, 6)}${text(x + 37, 146, v)}${i < vals.length - 1 ? arrow(x + 84, 137, x + 112, 137) : ""}`;
  }).join("") + `
    ${text(544, 58, "앞의 누적값으로 자기 위치를 정한다")}
    ${rect(170, 245, 740, 62, "#e3f2fd", "#0288d1", 4, 8)}
    ${text(540, 285, "0, 3, 4, 8, 10, 15 ...", "label")}
  `);
}

function histogram() {
  let bins = "";
  for (let i = 0; i < 5; i += 1) bins += rect(620 + i * 70, 120, 48, 150, i === 2 ? "#ffebee" : "#fff", i === 2 ? "#c62828" : "#111", 3);
  let tokens = "";
  for (let i = 0; i < 18; i += 1) tokens += `<circle cx="${125 + (i % 6) * 45}" cy="${110 + Math.floor(i / 6) * 50}" r="14" fill="${["#0288d1", "#c62828", "#f9a825"][i % 3]}"/>`;
  return svg(`
    ${text(544, 55, "같은 bin 갱신은 충돌을 만든다")}
    ${tokens}
    ${arrow(395, 180, 585, 180, "#c62828")}
    ${bins}
    ${rect(160, 295, 750, 50, "#e8f5e9", "#2e7d32", 4, 8)}
    ${text(535, 328, "block-local로 먼저 모은 뒤 global에 합친다", "small")}
  `);
}

function summary() {
  return svg(`
    ${rect(445, 160, 210, 80, "#fff59d", "#111", 4, 8)}${text(550, 209, "CUDA 실행 그림")}
    ${node(180, 80, "index")}
    ${node(850, 80, "warp")}
    ${node(190, 300, "memory")}
    ${node(850, 300, "primitive")}
    ${arrow(285, 115, 435, 180)}
    ${arrow(780, 115, 665, 180)}
    ${arrow(300, 300, 435, 220)}
    ${arrow(785, 300, 665, 220)}
  `);
}

function next() {
  return svg(`
    ${rect(100, 105, 260, 160, "#fffde7", "#111", 4, 8)}${text(230, 188, "V01: 모델")}
    ${arrow(380, 185, 520, 185)}
    ${rect(535, 80, 240, 210, "#e3f2fd", "#0288d1", 5, 12)}${text(655, 173, "SM 내부")}
    ${text(655, 213, "실행 무대", "small")}
    ${arrow(790, 185, 930, 185)}
    ${rect(940, 105, 105, 160, "#ffebee", "#c62828", 4, 8)}${text(992, 190, "V02")}
    ${text(544, 338, "좌표 다음에는 실행 장소를 본다", "label")}
  `);
}

function cliff() {
  return svg(`
    ${text(544, 72, "V01이 끝나도 질문은 남는다")}
    ${rect(170, 130, 200, 80, "#fff", "#111", 4, 8)}${text(270, 180, "thread")}
    ${arrow(380, 170, 500, 170)}
    ${rect(510, 130, 200, 80, "#fff59d", "#111", 4, 8)}${text(610, 180, "warp")}
    ${arrow(720, 170, 840, 170)}
    ${rect(850, 130, 160, 80, "#e3f2fd", "#0288d1", 4, 8)}${text(930, 180, "SM")}
    ${rect(255, 285, 590, 54, "#ffebee", "#c62828", 4, 8)}
    ${text(550, 320, "SM은 어떻게 이들을 계속 먹여 살릴까?", "label")}
  `);
}

function node(x, y, label) {
  return `${rect(x, y, 170, 62, "#fff", "#111", 4, 8)}${text(x + 85, y + 40, label)}`;
}

function circle(x, y, r, fill) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#111" stroke-width="3"/>`;
}

function leadLine(kind) {
  const lines = {
    manyTasks: "질문을 잘게 쪼개면 실행자가 보인다.",
    cpuGpu: "빠른 한 명보다 많은 동시성이 이기는 장면.",
    spmd: "명령은 하나, 데이터는 여러 개.",
    lifecycle: "GPU 작전에는 순서가 있다.",
    hierarchy: "좌표계는 CUDA의 지도다.",
    index: "감이 아니라 공식으로 내 자리를 찾는다.",
    warp: "32명이 한 박자로 움직인다.",
    divergence: "갈라지면 기다리는 thread가 생긴다.",
    occupancy: "기다림을 다른 warp로 숨긴다.",
    memory: "가까운 기억은 빠르고 작다.",
    coalescing: "메모리도 줄 맞춰 읽어야 한다.",
    tiling: "작업대에 올려두고 재사용한다.",
    bank: "빠른 창구도 몰리면 줄 선다.",
    stencil: "주변을 보는 window 패턴.",
    reduction: "많은 값을 하나로 줄인다.",
    scan: "앞의 누적값이 내 위치다.",
    histogram: "같은 bin에는 안전한 갱신이 필요하다.",
    summary: "실행 그림을 한 장으로 묶는다.",
    next: "다음은 SM 내부다.",
    cliff: "thread의 무대는 SM이다."
  };
  return lines[kind] ?? lines.manyTasks;
}

function checkLine(kind) {
  const lines = {
    index: "항상 i < N을 확인하자.",
    divergence: "같은 warp의 branch 방향을 의식하자.",
    occupancy: "register 사용량이 occupancy를 깎을 수 있다.",
    bank: "주소 stride가 bank를 어떻게 고르는지 보자.",
    histogram: "atomic은 안전하지만 공짜가 아니다.",
    tiling: "__syncthreads 위치는 uniform해야 한다."
  };
  return lines[kind] ?? "핵심은 ‘실행자·좌표·데이터 위치’를 같이 보는 것.";
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
