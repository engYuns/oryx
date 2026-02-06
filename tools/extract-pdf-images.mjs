import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeWinPath(p) {
  return p.replaceAll("\\\\", "/");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeJsonString(s) {
  return String(s)
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");
}

function detectSection(text) {
  const t = text.toLowerCase();

  // Portfolio list pages often contain many client/project names.
  // Prefer mapping those pages to the portfolio section even if they mention project titles.
  if (
    t.includes("project portfolio") &&
    (t.includes("hiwa group") ||
      t.includes("apartment") ||
      t.includes("international fair") ||
      t.includes("booths") ||
      t.includes("rekar") ||
      t.includes("showroom") ||
      t.includes("restaurant"))
  ) {
    return { section: "portfolio" };
  }

  // Project-specific first
  if (t.includes("zogor place")) return { section: "projects", key: "zogor-place" };
  if (t.includes("villa in dream city")) return { section: "projects", key: "villa-dream-city" };
  if (t.includes("villa in ankawa") || t.includes("villa in ainkawa")) return { section: "projects", key: "villa-ankawa" };
  if (t.includes("empire square")) return { section: "projects", key: "empire-square" };

  // Section headings
  if (
    t.includes("contact") ||
    t.includes("phone") ||
    t.includes("email") ||
    t.includes("address") ||
    t.includes("@") ||
    t.includes("+964") ||
    t.includes("erbil")
  ) {
    return { section: "contact" };
  }
  if (t.includes("project portfolio") || t.includes("portfolio")) return { section: "portfolio" };
  // About can contain the word "services" (e.g. woodworking services), so detect About before Services.
  if (t.includes("about us") || t.includes("introduction") || t.includes("mission") || t.includes("vision")) return { section: "about" };
  if (t.includes("our services") || t.includes("services")) return { section: "services" };
  if (t.includes("other works")) return { section: "other-works" };

  return { section: "general" };
}

async function getTextForPage(page) {
  const textContent = await page.getTextContent();
  const strings = [];
  for (const item of textContent.items || []) {
    if (item && typeof item.str === "string") strings.push(item.str);
  }
  return strings.join(" ").replace(/\s+/g, " ").trim();
}

function pngFromRgba({ width, height, data }) {
  const png = new PNG({ width, height });
  // pngjs expects a Buffer
  png.data = Buffer.from(data);
  return PNG.sync.write(png);
}

function objGetAsync(objs, name) {
  return new Promise((resolve, reject) => {
    try {
      objs.get(name, (value) => resolve(value));
    } catch (err) {
      reject(err);
    }
  });
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node tools/extract-pdf-images.mjs <path-to-pdf>");
    process.exit(2);
  }

  const absPdf = path.resolve(inputPath);
  if (!fs.existsSync(absPdf)) {
    console.error(`PDF not found: ${absPdf}`);
    process.exit(2);
  }

  const outDir = path.resolve(__dirname, "..", "assets", "profile");
  ensureDir(outDir);

  const loadingTask = getDocument({
    url: new URL(`file:///${normalizeWinPath(absPdf)}`),
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const manifest = {
    sourcePdf: absPdf,
    extractedAt: new Date().toISOString(),
    pages: numPages,
    images: [],
  };

  let globalIndex = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const pageText = await getTextForPage(page);
    const mapping = detectSection(pageText);

    const opList = await page.getOperatorList();

    // Collect image object names from operator list
    const imageNames = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintJpegXObject ||
        fn === OPS.paintInlineImageXObject
      ) {
        const name = args?.[0];
        if (typeof name === "string") imageNames.push(name);
      }
    }

    // De-dupe while keeping order
    const seen = new Set();
    const uniqueImageNames = imageNames.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));

    let pageIndex = 0;
    for (const name of uniqueImageNames) {
      let img;
      try {
        img = await objGetAsync(page.objs, name);
      } catch {
        continue;
      }

      // pdf.js returns {width,height,data} for decoded RGBA images
      if (!img || typeof img.width !== "number" || typeof img.height !== "number" || !img.data) continue;

      // Skip tiny assets (icons, bullets)
      if (img.width * img.height < 18_000) continue;

      const buffer = pngFromRgba(img);

      const filename = `page-${String(pageNum).padStart(2, "0")}-img-${String(pageIndex).padStart(2, "0")}.png`;
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, buffer);

      manifest.images.push({
        id: `img_${globalIndex}`,
        file: `assets/profile/${filename}`,
        page: pageNum,
        indexOnPage: pageIndex,
        section: mapping.section,
        key: mapping.key || null,
        width: img.width,
        height: img.height,
        textSample: pageText ? pageText.slice(0, 220) : "",
      });

      pageIndex++;
      globalIndex++;
    }
  }

  const manifestPath = path.resolve(__dirname, "..", "assets", "profile", "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Extracted ${manifest.images.length} images from ${numPages} pages.`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error("Extraction failed:");
  console.error(err?.stack || String(err));
  process.exit(1);
});
