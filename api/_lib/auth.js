import crypto from "crypto";
import { parseCookies } from "./cookies.js";

const COOKIE_NAME = "oryx_admin_token";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function unbase64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function hmacSha256(secret, data) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function createAdminToken({ secret, ttlSeconds = 60 * 60 * 24 * 7 } = {}) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = JSON.stringify({ exp });
  const payloadB64 = base64url(payload);
  const sig = base64url(hmacSha256(secret, payloadB64));
  return `${payloadB64}.${sig}`;
}

export function verifyAdminToken(token, { secret } = {}) {
  if (!token || typeof token !== "string") return false;
  const idx = token.indexOf(".");
  if (idx === -1) return false;
  const payloadB64 = token.slice(0, idx);
  const sigB64 = token.slice(idx + 1);
  if (!payloadB64 || !sigB64) return false;

  const expected = base64url(hmacSha256(secret, payloadB64));
  if (!timingSafeEqual(expected, sigB64)) return false;

  let payload;
  try {
    payload = JSON.parse(unbase64url(payloadB64).toString("utf8"));
  } catch {
    return false;
  }
  const exp = Number(payload?.exp || 0);
  if (!exp) return false;
  if (Math.floor(Date.now() / 1000) > exp) return false;
  return true;
}

export function getAdminTokenFromReq(req) {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[COOKIE_NAME];
}

export function requireAdminOr401(req, res) {
  const secret = String(process.env.ORYX_ADMIN_TOKEN_SECRET || "").trim();
  if (!secret) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "missing_token_secret" }));
    return false;
  }
  const token = getAdminTokenFromReq(req);
  if (verifyAdminToken(token, { secret })) return true;

  res.statusCode = 401;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "unauthorized" }));
  return false;
}

export function cookieName() {
  return COOKIE_NAME;
}
