import { buildCookieAttrs } from "./_lib/cookies.js";
import { cookieName } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  res.setHeader(
    "Set-Cookie",
    `${cookieName()}=; ${buildCookieAttrs(req, { maxAgeSeconds: 0 })}`
  );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true }));
}
