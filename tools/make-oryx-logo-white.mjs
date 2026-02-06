import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function findBrightBox(png, { yMin = 0, yMax = 1, lMin = 0.78 } = {}) {
  const { width, height, data } = png;

  const startY = Math.floor(height * yMin);
  const endY = Math.floor(height * yMax);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const a = data[idx + 3];
      if (a < 10) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const l = luminance(r, g, b);

      if (l < lMin) continue;

      count++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!count) return null;
  return { minX, minY, maxX, maxY, count };
}

function crop(png, box) {
  const { width, height } = png;
  const x0 = clamp(box.minX, 0, width - 1);
  const y0 = clamp(box.minY, 0, height - 1);
  const x1 = clamp(box.maxX, 0, width - 1);
  const y1 = clamp(box.maxY, 0, height - 1);

  const outW = x1 - x0 + 1;
  const outH = y1 - y0 + 1;

  const out = new PNG({ width: outW, height: outH });

  for (let y = 0; y < outH; y++) {
    const srcY = y0 + y;
    for (let x = 0; x < outW; x++) {
      const srcX = x0 + x;
      const srcIdx = (png.width * srcY + srcX) << 2;
      const dstIdx = (outW * y + x) << 2;
      out.data[dstIdx] = png.data[srcIdx];
      out.data[dstIdx + 1] = png.data[srcIdx + 1];
      out.data[dstIdx + 2] = png.data[srcIdx + 2];
      out.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return out;
}

function expandBox(box, pad, width, height) {
  return {
    minX: clamp(box.minX - pad, 0, width - 1),
    minY: clamp(box.minY - pad, 0, height - 1),
    maxX: clamp(box.maxX + pad, 0, width - 1),
    maxY: clamp(box.maxY + pad, 0, height - 1),
  };
}

function main() {
  const src = path.resolve("assets/profile/page-01-img-01.png");
  const dst = path.resolve("assets/oryx-logo-white.png");

  if (!fs.existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(2);
  }

  const png = PNG.sync.read(fs.readFileSync(src));

  // Prefer the lower half (white logo). If nothing found, widen the search.
  const boxLower = findBrightBox(png, { yMin: 0.55, yMax: 0.98, lMin: 0.78 });
  const boxAll = boxLower || findBrightBox(png, { yMin: 0.0, yMax: 1.0, lMin: 0.82 });

  if (!boxAll) {
    console.error("Could not find a bright region to crop.");
    process.exit(1);
  }

  const padded = expandBox(boxAll, 26, png.width, png.height);
  const out = crop(png, padded);

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, PNG.sync.write(out));

  console.log(`Wrote ${dst} (${out.width}x${out.height})`);
}

main();
