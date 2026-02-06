import fs from "node:fs";
import { PNG } from "pngjs";

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function quantize(r, g, b, step = 16) {
  const q = (n) => Math.min(255, Math.max(0, Math.round(n / step) * step));
  return [q(r), q(g), q(b)];
}

function topColors(png, { sampleStride = 2, step = 16, minAlpha = 32 } = {}) {
  const { width: w, height: h, data } = png;
  const counts = new Map();

  for (let y = 0; y < h; y += sampleStride) {
    for (let x = 0; x < w; x += sampleStride) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < minAlpha) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const [qr, qg, qb] = quantize(r, g, b, step);
      const key = (qr << 16) | (qg << 8) | qb;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 12).map(([key, count]) => {
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    return { hex: rgbToHex(r, g, b), rgb: [r, g, b], lum: Math.round(luminance(r, g, b)), count };
  });

  return top;
}

function edgeAverages(png, { band = 24 } = {}) {
  const { width: w, height: h, data } = png;

  const sample = [];

  function pushPixel(x, y) {
    const i = (y * w + x) * 4;
    const a = data[i + 3];
    if (a < 32) return;
    sample.push([data[i], data[i + 1], data[i + 2]]);
  }

  // Top band
  for (let y = 0; y < Math.min(band, h); y++) {
    for (let x = 0; x < w; x += 2) pushPixel(x, y);
  }
  // Left band
  for (let x = 0; x < Math.min(band, w); x++) {
    for (let y = 0; y < h; y += 2) pushPixel(x, y);
  }

  if (!sample.length) return null;

  let r = 0,
    g = 0,
    b = 0;
  for (const px of sample) {
    r += px[0];
    g += px[1];
    b += px[2];
  }
  r = Math.round(r / sample.length);
  g = Math.round(g / sample.length);
  b = Math.round(b / sample.length);

  return { hex: rgbToHex(r, g, b), rgb: [r, g, b], lum: Math.round(luminance(r, g, b)) };
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node tools/palette-from-png.mjs <path-to-png>");
    process.exit(2);
  }

  const buf = fs.readFileSync(file);
  const png = PNG.sync.read(buf);

  const edges = edgeAverages(png);
  const top = topColors(png);

  console.log(JSON.stringify({ file, width: png.width, height: png.height, edgeAvg: edges, topColors: top }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
