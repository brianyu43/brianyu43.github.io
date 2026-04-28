import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..");
const sourceRoot = path.join(repoRoot, "cuda_onebooks");
const generatedRoot = path.join(appRoot, "public", "generated");
const manifestPath = path.join(generatedRoot, "manifest.json");
const expectedTotalPages = 321;
const expectedRatio = 297 / 210;

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const failures = [];
  const sourceCounts = await getSourcePageCounts();

  if (manifest.totalPages !== expectedTotalPages) {
    failures.push(`manifest totalPages is ${manifest.totalPages}, expected ${expectedTotalPages}`);
  }

  if (manifest.volumes.length !== 18) {
    failures.push(`manifest has ${manifest.volumes.length} volumes, expected 18`);
  }

  for (const volume of manifest.volumes) {
    const sourceCount = sourceCounts.get(volume.id);
    if (sourceCount === undefined) {
      failures.push(`${volume.id}: no matching source HTML`);
      continue;
    }

    if (volume.pageCount !== sourceCount) {
      failures.push(`${volume.id}: manifest pageCount ${volume.pageCount}, source has ${sourceCount}`);
    }

    if (volume.pages.length !== volume.pageCount) {
      failures.push(`${volume.id}: pages array has ${volume.pages.length}, pageCount is ${volume.pageCount}`);
    }

    for (const page of volume.pages) {
      const imagePath = path.join(appRoot, "public", page.src);
      const stat = await fs.stat(imagePath).catch(() => null);
      if (!stat || stat.size === 0) {
        failures.push(`${volume.id} page ${page.pageIndex}: image missing or empty at ${page.src}`);
        continue;
      }

      const metadata = await sharp(imagePath).metadata();
      if (metadata.width !== page.width || metadata.height !== page.height) {
        failures.push(`${volume.id} page ${page.pageIndex}: manifest size ${page.width}x${page.height}, actual ${metadata.width}x${metadata.height}`);
      }

      const ratio = (metadata.width ?? 0) / (metadata.height ?? 1);
      if (Math.abs(ratio - expectedRatio) > 0.03) {
        failures.push(`${volume.id} page ${page.pageIndex}: ratio ${ratio.toFixed(3)} is not A4 landscape-like`);
      }

      const blank = await looksBlank(imagePath);
      if (blank) {
        failures.push(`${volume.id} page ${page.pageIndex}: image looks blank`);
      }
    }
  }

  const sourceTotal = [...sourceCounts.values()].reduce((sum, count) => sum + count, 0);
  if (sourceTotal !== expectedTotalPages) {
    failures.push(`source page total is ${sourceTotal}, expected ${expectedTotalPages}`);
  }

  if (failures.length > 0) {
    console.error("verify failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`verify ok: ${manifest.volumes.length} volumes, ${manifest.totalPages} pages`);
}

async function getSourcePageCounts() {
  const counts = new Map();
  const entries = await fs.readdir(sourceRoot);
  for (const entry of entries.filter((name) => /^V\d{2}_.+\.html$/.test(name)).sort()) {
    const html = await fs.readFile(path.join(sourceRoot, entry), "utf8");
    const id = entry.match(/^V\d+/)?.[0];
    if (id) {
      counts.set(id, (html.match(/<section\s+class="page/g) ?? []).length);
    }
  }
  return counts;
}

async function looksBlank(imagePath) {
  const { data, info } = await sharp(imagePath)
    .resize(32, 32, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let sumSquares = 0;
  const pixelCount = info.width * info.height;

  for (let index = 0; index < data.length; index += info.channels) {
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    sum += luminance;
    sumSquares += luminance * luminance;
  }

  const mean = sum / pixelCount;
  const variance = sumSquares / pixelCount - mean * mean;
  const stddev = Math.sqrt(Math.max(variance, 0));
  return stddev < 2.5 && (mean > 245 || mean < 10);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

