import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function normalizeWinPath(p) {
  return p.replaceAll("\\", "/");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function renderPageToPng({ pdf, pageNum, outFile, scale }) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");

  // PDF pages often have transparent background; fill with near-black so we see intended contrast.
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const buf = canvas.toBuffer("image/png");
  fs.writeFileSync(outFile, buf);
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node tools/render-pdf-pages.mjs <path-to-pdf> [pages] [scale]");
    console.error("Example: node tools/render-pdf-pages.mjs C:/path/file.pdf 1,2 1.5");
    process.exit(2);
  }

  const pagesArg = process.argv[3] || "1,2";
  const scale = Number(process.argv[4] || "1.6");

  const pages = pagesArg
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const absPdf = path.resolve(inputPath);
  if (!fs.existsSync(absPdf)) {
    console.error(`PDF not found: ${absPdf}`);
    process.exit(2);
  }

  const outDir = path.resolve("assets", "profile_latest");
  ensureDir(outDir);

  const loadingTask = getDocument({
    url: new URL(`file:///${normalizeWinPath(absPdf)}`),
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;

  for (const pageNum of pages) {
    const outFile = path.join(outDir, `profile-page-${String(pageNum).padStart(2, "0")}.png`);
    await renderPageToPng({ pdf, pageNum, outFile, scale });
    console.log(`Rendered page ${pageNum} -> ${outFile}`);
  }
}

main().catch((err) => {
  console.error("Render failed:");
  console.error(err?.stack || String(err));
  process.exit(1);
});
