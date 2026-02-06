import { kv } from "@vercel/kv";
import seed from "./seed-content.json" with { type: "json" };

const KV_KEY = "oryx:content:v1";

export async function getContent() {
  const fromKv = await kv.get(KV_KEY);
  if (fromKv && typeof fromKv === "object") return fromKv;

  await kv.set(KV_KEY, seed);
  return seed;
}

export async function setContent(content) {
  await kv.set(KV_KEY, content);
}
