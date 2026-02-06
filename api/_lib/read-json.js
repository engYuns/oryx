export async function readJsonBody(req, { limitBytes = 2 * 1024 * 1024 } = {}) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      const err = new Error("payload_too_large");
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("invalid_json");
    err.statusCode = 400;
    throw err;
  }
}
