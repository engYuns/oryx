import fs from "fs/promises";
import path from "path";
import process from "process";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function main() {
  const pdfPath = process.argv[2];
  const outPath = process.argv[3];

  if (!pdfPath) {
    console.error('Usage: node tools/extract-pdf-text.mjs "path/to/file.pdf" [out.json]');
    process.exit(2);
  }

  const data = new Uint8Array(await fs.readFile(pdfPath));
  const doc = await getDocument({ data }).promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // Preserve approximate reading order via y desc, x asc.
    const items = (content.items || [])
      .map((it) => {
        const str = (it.str || "").replace(/\s+/g, " ").trim();
        const tx = it.transform || [1, 0, 0, 1, 0, 0];
        const x = tx[4] ?? 0;
        const y = tx[5] ?? 0;
        return { str, x, y };
      })
      .filter((it) => it.str);

    items.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

    const lines = [];
    let buf = [];
    let lastY = null;
    for (const it of items) {
      if (lastY === null) {
        lastY = it.y;
        buf.push(it.str);
        continue;
      }
      if (Math.abs(it.y - lastY) <= 2) {
        buf.push(it.str);
      } else {
        lines.push(buf.join(" ").replace(/\s+/g, " ").trim());
        buf = [it.str];
        lastY = it.y;
      }
    }
    if (buf.length) lines.push(buf.join(" ").replace(/\s+/g, " ").trim());

    const text = lines.join("\n");
    pages.push({ page: pageNum, lines, text });
  }

  const out = { file: path.resolve(pdfPath), pages, numPages: pages.length };
  const raw = JSON.stringify(out, null, 2);

  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, raw + "\n", "utf8");
  } else {
    process.stdout.write(raw + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
