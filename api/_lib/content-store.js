import { kv } from "@vercel/kv";
import seed from "./seed-content.json" with { type: "json" };

const KV_KEY = "oryx:content:v1";

function ensureKvConfigured() {
  const url = String(process.env.KV_REST_API_URL || "").trim();
  const token = String(process.env.KV_REST_API_TOKEN || "").trim();
  if (!url || !token) throw new Error("missing_kv_env");
}

export async function getContent() {
  ensureKvConfigured();
  const fromKv = await kv.get(KV_KEY);
  if (fromKv && typeof fromKv === "object") return fromKv;

  await kv.set(KV_KEY, seed);
  return seed;
}

export async function setContent(content) {
  ensureKvConfigured();
  await kv.set(KV_KEY, content);
}
