export function parseCookies(header) {
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

export function isProd() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

export function isSecureRequest(req) {
  try {
    const xfProto = String(req.headers?.["x-forwarded-proto"] || "").toLowerCase();
    if (xfProto === "https") return true;
    return false;
  } catch {
    return false;
  }
}

export function buildCookieAttrs(req, { maxAgeSeconds } = {}) {
  const parts = ["Path=/", "SameSite=Lax", "HttpOnly"];
  if (typeof maxAgeSeconds === "number") parts.push(`Max-Age=${maxAgeSeconds}`);
  if (isProd() && isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}
