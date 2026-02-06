import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function parseArgs(argv) {
  const args = { in: '', out: '', threshold: 246, softness: 18 };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!value) break;

    if (key === '--in') args.in = value;
    else if (key === '--out') args.out = value;
    else if (key === '--threshold') args.threshold = Number(value);
    else if (key === '--softness') args.softness = Number(value);
  }
  return args;
}

function computeAlpha(r, g, b, threshold, softness) {
  // Detect “near-white” regardless of hue: if all channels are high.
  const minChannel = Math.min(r, g, b);

  // Fully transparent when the darkest channel is above threshold.
  if (minChannel >= threshold) return 0;

  // Smooth edge: fade alpha as pixels approach white.
  const edgeStart = threshold - softness;
  if (minChannel <= edgeStart) return 255;

  const t = (minChannel - edgeStart) / Math.max(1, softness);
  return Math.round(255 * (1 - clamp01(t)));
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.in || 'assets/oryx-logo.png';
  const outputPath = args.out || 'assets/oryx-logo.png';

  const threshold = Number.isFinite(args.threshold) ? args.threshold : 246;
  const softness = Number.isFinite(args.softness) ? args.softness : 18;

  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath);
  const png = PNG.sync.read(raw);

  for (let idx = 0; idx < png.data.length; idx += 4) {
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];

    const newA = computeAlpha(r, g, b, threshold, softness);
    if (newA < png.data[idx + 3]) png.data[idx + 3] = newA;
  }

  const outBuffer = PNG.sync.write(png);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, outBuffer);

  console.log(`Wrote: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
