import path from "path";
import Busboy from "busboy";
import { put } from "@vercel/blob";
import { requireAdminOr401 } from "./_lib/auth.js";

function safeSlug(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function getExt(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  if (ext && ext.length <= 8) return ext;
  return ".jpg";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  if (!requireAdminOr401(req, res)) return;

  const scope = String(req.query?.scope || "uploads");
  const projectId = String(req.query?.projectId || "");

  // Vercel serverless functions have a relatively small request size limit.
  // Keep this conservative; for larger files you'd need client-side uploads.
  const bb = Busboy({ headers: req.headers, limits: { fileSize: 4 * 1024 * 1024, files: 1 } });

  let uploadPromise;

  bb.on("file", (_name, file, info) => {
    const originalName = info?.filename || "image";
    const base = safeSlug(path.basename(originalName, path.extname(originalName))) || "image";
    const ext = getExt(originalName);
    const stamp = Date.now().toString(36);

    let key = `uploads/${base}-${stamp}${ext}`;
    if (scope === "project" && projectId) {
      key = `jobs/${safeSlug(projectId)}/${base}-${stamp}${ext}`;
    }

    uploadPromise = put(key, file, {
      access: "public",
      contentType: info?.mimeType || undefined,
      addRandomSuffix: false,
    });
  });

  bb.on("error", () => {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "invalid_multipart" }));
  });

  bb.on("finish", async () => {
    if (!uploadPromise) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "missing_file" }));
    }

    try {
      const result = await uploadPromise;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, url: result.url }));
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "upload_failed" }));
    }
  });

  req.pipe(bb);
}
