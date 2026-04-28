import { createHash } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..");
const sourceRoot = path.join(repoRoot, "cuda_onebooks");
const generatedRoot = path.join(appRoot, "public", "generated");
const manifestPath = path.join(generatedRoot, "manifest.json");

const changedOnly = process.argv.includes("--changed");
const capture = {
  format: "webp",
  quality: 92,
  deviceScaleFactor: 2,
  theme: "light",
  tint: "default",
  density: "normal",
  cols: "3"
};

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".woff2", "font/woff2"]
]);

async function main() {
  await ensureSource();
  await fs.mkdir(generatedRoot, { recursive: true });

  const volumeFiles = await discoverVolumes();
  const previousManifest = await readPreviousManifest();
  const server = await startStaticServer(repoRoot);

  let browser;
  const volumes = [];
  let globalIndex = 1;

  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      deviceScaleFactor: capture.deviceScaleFactor,
      viewport: { width: 1400, height: 1000 }
    });

    for (const file of volumeFiles) {
      const id = path.basename(file).match(/^V\d+/)?.[0] ?? "V??";
      const sourceFile = `cuda_onebooks/${path.basename(file)}`;
      const volumeDir = path.join(generatedRoot, id);
      const sourceHash = await hashVolumeSource(file);
      const oldVolume = previousManifest?.volumes.find((volume) => volume.id === id);
      const canReuse = changedOnly && oldVolume && oldVolume.sourceHash === sourceHash && await hasAllImages(oldVolume);

      if (canReuse) {
        const reusedPages = oldVolume.pages.map((page) => ({
          ...page,
          globalIndex: globalIndex++,
          sourceHash
        }));
        volumes.push({
          ...oldVolume,
          sourceHash,
          pages: reusedPages,
          pageCount: reusedPages.length
        });
        console.log(`reuse ${id} (${reusedPages.length} pages)`);
        continue;
      }

      await fs.rm(volumeDir, { recursive: true, force: true });
      await fs.mkdir(volumeDir, { recursive: true });

      const page = await context.newPage();
      try {
        const url = `http://127.0.0.1:${server.port}/cuda_onebooks/${path.basename(file)}`;
        await page.goto(url, { waitUntil: "load", timeout: 60_000 });
        await waitForFonts(page);
        await preparePageForCapture(page);

        const title = await getTitle(page);
        const sections = await page.locator(".page").elementHandles();
        if (sections.length === 0) {
          throw new Error(`${id}: no .page sections found`);
        }

        const pages = [];
        console.log(`capture ${id} (${sections.length} pages)`);

        for (let index = 0; index < sections.length; index += 1) {
          const localIndex = index + 1;
          const imageName = `${String(localIndex).padStart(3, "0")}.webp`;
          const imagePath = path.join(volumeDir, imageName);
          const label = await sections[index].getAttribute("data-screen-label") || `${String(localIndex).padStart(2, "0")} Page`;

          try {
            const screenshot = await sections[index].screenshot({
              type: "png",
              animations: "disabled",
              timeout: 60_000
            });
            await sharp(screenshot)
              .webp({ quality: capture.quality })
              .toFile(imagePath);
          } catch (error) {
            throw new Error(`${id} page ${localIndex} (${label}) screenshot failed: ${error.message}`);
          }

          const metadata = await sharp(imagePath).metadata();
          pages.push({
            globalIndex: globalIndex++,
            pageIndex: localIndex,
            label,
            src: `/generated/${id}/${imageName}`,
            width: metadata.width ?? 0,
            height: metadata.height ?? 0,
            sourceHash
          });
        }

        volumes.push({
          id,
          title,
          sourceFile,
          pageCount: pages.length,
          sourceHash,
          pages
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    await server.close();
  }

  const totalPages = volumes.reduce((sum, volume) => sum + volume.pageCount, 0);
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRoot: "cuda_onebooks",
    totalPages,
    capture,
    volumes
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`wrote ${path.relative(repoRoot, manifestPath)} (${totalPages} pages)`);
}

async function ensureSource() {
  const stat = await fs.stat(sourceRoot).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Missing source directory: ${sourceRoot}`);
  }
}

async function discoverVolumes() {
  const entries = await fs.readdir(sourceRoot);
  const volumeFiles = entries
    .filter((entry) => /^V\d{2}_.+\.html$/.test(entry))
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => path.join(sourceRoot, entry));

  if (volumeFiles.length !== 18) {
    throw new Error(`Expected 18 volume HTML files, found ${volumeFiles.length}`);
  }

  return volumeFiles;
}

async function readPreviousManifest() {
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

async function hasAllImages(volume) {
  for (const page of volume.pages) {
    const file = path.join(appRoot, "public", page.src);
    const stat = await fs.stat(file).catch(() => null);
    if (!stat || stat.size === 0) {
      return false;
    }
  }
  return true;
}

async function hashVolumeSource(file) {
  const hash = createHash("sha256");
  for (const source of [
    file,
    path.join(sourceRoot, "styles.css"),
    path.join(sourceRoot, "tweaks.js")
  ]) {
    hash.update(path.basename(source));
    hash.update(await fs.readFile(source));
  }
  hash.update(JSON.stringify(capture));
  return hash.digest("hex");
}

async function startStaticServer(root) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
      const filePath = path.resolve(root, safePath || "cuda_onebooks/index.html");

      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        response.writeHead(403);
        response.end("Directory listing disabled");
        return;
      }

      response.writeHead(200, {
        "content-type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
        "content-length": stat.size
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 12_000))
      ]);
    }
  });
}

async function preparePageForCapture(page) {
  await page.evaluate((settings) => {
    document.body.dataset.theme = settings.theme;
    document.body.dataset.tint = settings.tint;
    document.body.dataset.density = settings.density;
    document.body.dataset.cols = settings.cols;
  }, capture);

  await page.addStyleTag({
    content: `
      html, body {
        background: #fff !important;
      }
      .sheet-stack {
        padding: 0 !important;
        gap: 0 !important;
        align-items: flex-start !important;
      }
      .page {
        box-shadow: none !important;
      }
      #tweaks-panel,
      #tweak-toggle {
        display: none !important;
      }
    `
  });
}

async function getTitle(page) {
  const title = await page.title();
  return title
    .replace(/\s+—\s+\d+p\s*$/u, "")
    .replace(/\s+단권화\s*$/u, "")
    .trim();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
