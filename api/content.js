import { getContent, setContent } from "./_lib/content-store.js";
import { requireAdminOr401 } from "./_lib/auth.js";
import { readJsonBody } from "./_lib/read-json.js";
import { validateAndNormalizeContent } from "./_lib/validate-content.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const content = await getContent();
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(content));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "failed_to_read",
          details: e?.message ? String(e.message).slice(0, 160) : undefined,
        })
      );
    }
  }

  if (req.method === "PUT") {
    if (!requireAdminOr401(req, res)) return;

    let body;
    try {
      body = await readJsonBody(req);
    } catch (e) {
      res.statusCode = e.statusCode || 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: e.message || "invalid_json" }));
    }

    const validated = validateAndNormalizeContent(body);
    if (!validated.ok) {
      res.statusCode = validated.status;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: validated.error }));
    }

    try {
      await setContent(validated.value);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "failed_to_write",
          details: e?.message ? String(e.message).slice(0, 160) : undefined,
        })
      );
    }
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
}
