import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

function parseArgs(argv) {
  const args = { in: '', out: '', size: 64, invert: false };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!value) break;
    if (key === '--in') args.in = value;
    else if (key === '--out') args.out = value;
    else if (key === '--size') args.size = Number(value);
    else if (key === '--invert') args.invert = value === '1' || value === 'true' || value === 'yes';
  }
  return args;
}

function clampInt(value, min, max) {
  const n = Math.round(value);
  return Math.max(min, Math.min(max, n));
}

function getOpaqueBounds(ctx, width, height) {
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return { x: 0, y: 0, w: width, h: height };
  }

  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function invertCanvas(ctx, size) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  ctx.putImageData(imageData, 0, 0);
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.in || 'assets/oryx-logo.png';
  const outputPath = args.out || 'assets/favicon.png';
  const size = Number.isFinite(args.size) ? clampInt(args.size, 16, 512) : 64;

  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(1);
  }

  const img = await loadImage(fs.readFileSync(inputPath));

  // Step 1: draw source into a temp canvas to find the real opaque bounds.
  const tempCanvas = createCanvas(img.width, img.height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.clearRect(0, 0, img.width, img.height);
  tempCtx.drawImage(img, 0, 0);
  const bounds = getOpaqueBounds(tempCtx, img.width, img.height);

  // Step 2: favicons need a square mark; take the left-most square within bounds.
  const cropSize = Math.max(1, Math.min(bounds.h, bounds.w));
  const cropX = bounds.x;
  const cropY = bounds.y + Math.round((bounds.h - cropSize) / 2);

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const pad = Math.round(size * 0.12);
  const drawSize = size - pad * 2;
  ctx.drawImage(img, cropX, cropY, cropSize, cropSize, pad, pad, drawSize, drawSize);

  if (args.invert) invertCanvas(ctx, size);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));

  console.log(`Wrote: ${outputPath} (${size}x${size})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
