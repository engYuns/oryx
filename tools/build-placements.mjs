import fs from "node:fs";
import path from "node:path";

function isLikelyPhoto(img) {
  if (!img || typeof img.width !== "number" || typeof img.height !== "number") return false;
  const area = img.width * img.height;
  if (area < 120_000) return false;

  const aspect = img.width / img.height;
  if (aspect > 2.6 || aspect < 0.35) return false;
  return true;
}

function byAreaDesc(a, b) {
  return b.width * b.height - a.width * a.height;
}

function pickSorted(images) {
  return images.filter(isLikelyPhoto).sort(byAreaDesc);
}

function pruneScaledDuplicates(imgs) {
  // Some PDFs contain a full-page composite image plus the individual photos.
  // Common pattern: composite is ~2x the width/height of the real photo.
  // Keep the smaller photos and drop the scaled composite.
  const keep = [];
  for (const img of imgs) {
    keep.push(img);
  }

  const isScaledVersionOf = (a, b) => {
    // returns true if a is ~2x b in both dimensions
    const rw = a.width / b.width;
    const rh = a.height / b.height;
    const near2 = (r) => Math.abs(r - 2) < 0.12;
    return near2(rw) && near2(rh);
  };

  // Iterate large -> small, remove large if it looks like a 2x composite of any smaller
  keep.sort(byAreaDesc);
  const result = [];
  for (const img of keep) {
    const hasSmallerMatch = keep.some((other) => {
      if (other === img) return false;
      const otherArea = other.width * other.height;
      const imgArea = img.width * img.height;
      if (otherArea >= imgArea) return false;
      return isScaledVersionOf(img, other);
    });

    if (!hasSmallerMatch) result.push(img);
  }

  return result;
}

function pickHero(images) {
  // Prefer page 1 first big photo.
  const p1 = images.filter((i) => i.page === 1).filter(isLikelyPhoto).sort(byAreaDesc);
  if (p1[0]) return p1[0].file;

  const any = images.filter(isLikelyPhoto).sort(byAreaDesc);
  return any[0]?.file || null;
}

function section(images, name) {
  return images.filter((i) => i.section === name);
}

function key(images, k) {
  return images.filter((i) => i.key === k);
}

function uniqueFiles(files) {
  const out = [];
  const seen = new Set();
  for (const f of files) {
    if (!f) continue;
    if (seen.has(f)) continue;
    seen.add(f);
    out.push(f);
  }
  return out;
}

function main() {
  const manifestPath = path.resolve("assets/profile/manifest.json");
  const raw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const images = Array.isArray(manifest.images) ? manifest.images : [];

  const placements = {
    hero: pickHero(images),
    about: uniqueFiles(pickSorted(section(images, "about")).map((i) => i.file)),
    services: uniqueFiles(pickSorted(section(images, "services")).map((i) => i.file)),
    portfolio: uniqueFiles(pickSorted(section(images, "portfolio")).map((i) => i.file)),
    otherWorks: uniqueFiles(pickSorted(section(images, "other-works")).map((i) => i.file)),
    contact: uniqueFiles(pickSorted(section(images, "contact")).map((i) => i.file)),
    projects: {
      "zogor-place": uniqueFiles(pruneScaledDuplicates(pickSorted(key(images, "zogor-place"))).map((i) => i.file)),
      "villa-dream-city": uniqueFiles(pruneScaledDuplicates(pickSorted(key(images, "villa-dream-city"))).map((i) => i.file)),
      "villa-ankawa": uniqueFiles(pruneScaledDuplicates(pickSorted(key(images, "villa-ankawa"))).map((i) => i.file)),
      "empire-square": uniqueFiles(pruneScaledDuplicates(pickSorted(key(images, "empire-square"))).map((i) => i.file)),
    },
  };

  const outPath = path.resolve("assets/profile/placements.json");
  fs.writeFileSync(outPath, JSON.stringify(placements, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
