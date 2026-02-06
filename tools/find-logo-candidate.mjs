import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function brightness(r, g, b) {
  // perceived luminance
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function analyzePng(filePath) {
  const buf = fs.readFileSync(filePath);
  const png = PNG.sync.read(buf);

  const { width, height, data } = png;
  let opaque = 0;
  let dark = 0;
  let bright = 0;

  let brightXSum = 0;
  let brightYSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const a = data[idx + 3];
      if (a < 10) continue;
      opaque++;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const l = brightness(r, g, b);

      if (l < 0.12) dark++;
      if (l > 0.86) {
        bright++;
        brightXSum += x;
        brightYSum += y;
      }
    }
  }

  if (opaque === 0) return null;
  const darkRatio = dark / opaque;
  const brightRatio = bright / opaque;

  const cx = bright ? brightXSum / bright / width : 0.5;
  const cy = bright ? brightYSum / bright / height : 0.5;

  // Logo-like heuristic: mostly dark background + some bright pixels + bright pixels in lower half
  const score = (darkRatio ** 1.2) * (brightRatio ** 0.8) * (0.6 + 0.8 * cy) * (0.7 + 0.3 * (1 - Math.abs(cx - 0.5) * 2));

  return {
    file: filePath,
    width,
    height,
    opaque,
    darkRatio,
    brightRatio,
    brightCentroid: { x: cx, y: cy },
    score,
  };
}

function main() {
  const dir = path.resolve("assets/profile");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));

  const results = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const r = analyzePng(full);
    if (!r) continue;

    // pre-filter to reduce noise
    if (r.darkRatio < 0.55) continue;
    if (r.brightRatio < 0.002) continue;

    results.push(r);
  }

  results.sort((a, b) => b.score - a.score);

  const top = results.slice(0, 10).map((r) => ({
    file: r.file.replace(/\\/g, "/"),
    w: r.width,
    h: r.height,
    dark: Number(r.darkRatio.toFixed(3)),
    bright: Number(r.brightRatio.toFixed(4)),
    cy: Number(r.brightCentroid.y.toFixed(3)),
    score: Number(r.score.toFixed(6)),
  }));

  console.log(JSON.stringify(top, null, 2));
}

main();
