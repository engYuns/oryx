import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "data", "content.json");
const UPLOADS_DIR = path.join(ROOT, "assets", "uploads");
const JOBS_DIR = path.join(ROOT, "assets", "jobs");

const PORT = Number(process.env.PORT || 5173);
const ADMIN_PASSWORD = String(process.env.ORYX_ADMIN_PASSWORD || "").trim();
const IS_PROD = process.env.NODE_ENV === "production";

if (!ADMIN_PASSWORD) {
  console.error("Missing ORYX_ADMIN_PASSWORD. Create a .env file or set the environment variable before starting the server.");
  console.error("Example: ORYX_ADMIN_PASSWORD=your-strong-password");
  process.exit(1);
}

const sessions = new Set();

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  const parts = String(header).split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.oryx_admin_token;
  if (token && sessions.has(token)) return next();
  res.status(401).json({ error: "unauthorized" });
}

async function readContent() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeContent(json) {
  const raw = JSON.stringify(json, null, 2) + "\n";
  await fs.writeFile(DATA_FILE, raw, "utf8");
}

function safeSlug(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "2mb" }));

function isRequestSecure(req) {
  if (req.secure) return true;
  const xfProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  return xfProto === "https";
}

function cookieAttrs(req, { maxAgeSeconds } = {}) {
  const parts = ["Path=/", "SameSite=Lax", "HttpOnly"];
  if (typeof maxAgeSeconds === "number") parts.push(`Max-Age=${maxAgeSeconds}`);
  if (IS_PROD && isRequestSecure(req)) parts.push("Secure");
  return parts.join("; ");
}

// Public: content for the site
app.get("/api/content", async (_req, res) => {
  try {
    const json = await readContent();
    res.setHeader("Cache-Control", "no-store");
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: "failed_to_read" });
  }
});

// Admin login
app.post("/api/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_password" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  sessions.add(token);
  res.setHeader(
    "Set-Cookie",
    `oryx_admin_token=${encodeURIComponent(token)}; ${cookieAttrs(req)}`
  );
  res.json({ ok: true });
});

// Admin: status check (requires valid session)
app.get("/api/admin/status", requireAdmin, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.oryx_admin_token;
  if (token) sessions.delete(token);
  res.setHeader(
    "Set-Cookie",
    `oryx_admin_token=; ${cookieAttrs(req, { maxAgeSeconds: 0 })}`
  );
  res.json({ ok: true });
});

// Admin: write full content JSON
app.put("/api/content", requireAdmin, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") return res.status(400).json({ error: "invalid_json" });

  const portfolio = Array.isArray(body.portfolio) ? body.portfolio : [];
  const detailedProjects = Array.isArray(body.detailedProjects) ? body.detailedProjects : [];

  const recentlyDeletedRaw = body.recentlyDeleted && typeof body.recentlyDeleted === "object" ? body.recentlyDeleted : null;
  const recentlyDeleted = {
    portfolio: Array.isArray(recentlyDeletedRaw?.portfolio) ? recentlyDeletedRaw.portfolio : [],
    detailedProjects: Array.isArray(recentlyDeletedRaw?.detailedProjects) ? recentlyDeletedRaw.detailedProjects : [],
  };

  // Minimal validation (no dropdowns on UI; still keep data sane)
  const ids = new Set();
  for (const p of portfolio) {
    if (!p || typeof p !== "object") return res.status(400).json({ error: "invalid_portfolio" });
    if (!p.id || !p.title || !p.category) return res.status(400).json({ error: "portfolio_missing_fields" });
    if (ids.has(p.id)) return res.status(400).json({ error: "duplicate_id" });
    ids.add(p.id);
  }

  for (const p of recentlyDeleted.portfolio) {
    if (!p || typeof p !== "object") return res.status(400).json({ error: "invalid_deleted_portfolio" });
    if (!p.id || !p.title || !p.category) return res.status(400).json({ error: "deleted_portfolio_missing_fields" });
  }

  const projIds = new Set();
  for (const pr of detailedProjects) {
    if (!pr || typeof pr !== "object") return res.status(400).json({ error: "invalid_projects" });
    if (!pr.id || !pr.title) return res.status(400).json({ error: "projects_missing_fields" });
    if (projIds.has(pr.id)) return res.status(400).json({ error: "duplicate_project_id" });
    projIds.add(pr.id);
  }

  for (const pr of recentlyDeleted.detailedProjects) {
    if (!pr || typeof pr !== "object") return res.status(400).json({ error: "invalid_deleted_projects" });
    if (!pr.id || !pr.title) return res.status(400).json({ error: "deleted_projects_missing_fields" });
  }

  try {
    await writeContent({ portfolio, detailedProjects, recentlyDeleted });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "failed_to_write" });
  }
});

const storage = multer.diskStorage({
  async destination(req, _file, cb) {
    try {
      const scope = String(req.query.scope || "uploads");
      const projectId = String(req.query.projectId || "");
      let dest = UPLOADS_DIR;

      if (scope === "project" && projectId) {
        dest = path.join(JOBS_DIR, safeSlug(projectId));
      }

      await ensureDir(dest);
      cb(null, dest);
    } catch (e) {
      cb(e);
    }
  },
  filename(req, file, cb) {
    const original = String(file.originalname || "");
    const ext = path.extname(original).toLowerCase() || ".jpg";
    const base = safeSlug(path.basename(original, path.extname(original))) || "image";
    const stamp = Date.now().toString(36);
    cb(null, `${base}-${stamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Admin: upload image, returns a site-relative URL
app.post("/api/upload", requireAdmin, upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "missing_file" });

  const scope = String(req.query.scope || "uploads");
  const projectId = String(req.query.projectId || "");

  let url;
  if (scope === "project" && projectId) {
    url = `/assets/jobs/${safeSlug(projectId)}/${file.filename}`;
  } else {
    url = `/assets/uploads/${file.filename}`;
  }

  res.json({ ok: true, url });
});

// Static site
app.use(
  "/assets",
  express.static(path.join(ROOT, "assets"), {
    fallthrough: false,
    maxAge: IS_PROD ? "7d" : 0,
  })
);

const PUBLIC_FILES = new Set([
  "/index.html",
  "/admin.html",
  "/mapper.html",
  "/styles.css",
  "/script.js",
  "/admin.js",
  "/robots.txt",
  "/sitemap.xml",
]);

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get(Object.freeze(Array.from(PUBLIC_FILES)), (req, res) => {
  res.sendFile(path.join(ROOT, req.path));
});

async function main() {
  await ensureDir(path.dirname(DATA_FILE));
  await ensureDir(UPLOADS_DIR);

  app.listen(PORT, () => {
    console.log(`oryx server running on http://localhost:${PORT}`);
    console.log("admin password env: ORYX_ADMIN_PASSWORD");
  });
}

main().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});
