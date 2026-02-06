import crypto from "crypto";
import { buildCookieAttrs } from "./_lib/cookies.js";
import { cookieName, createAdminToken } from "./_lib/auth.js";
import { readJsonBody } from "./_lib/read-json.js";

function timingSafeEqualsString(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  const adminPassword = String(process.env.ORYX_ADMIN_PASSWORD || "").trim();
  const tokenSecret = String(process.env.ORYX_ADMIN_TOKEN_SECRET || "").trim();

  if (!adminPassword) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "missing_admin_password" }));
  }
  if (!tokenSecret) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "missing_token_secret" }));
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    res.statusCode = e.statusCode || 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: e.message || "invalid_json" }));
  }

  const password = String(body?.password || "");
  if (!password || !timingSafeEqualsString(password, adminPassword)) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "invalid_password" }));
  }

  const token = createAdminToken({ secret: tokenSecret });
  res.setHeader(
    "Set-Cookie",
    `${cookieName()}=${encodeURIComponent(token)}; ${buildCookieAttrs(req)}`
  );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true }));
}
