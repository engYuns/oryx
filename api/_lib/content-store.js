import fs from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";

const KV_KEY = "oryx:content:v1";

async function readSeedFromRepo() {
  const root = process.cwd();
  const seedPath = path.join(root, "data", "content.json");
  const raw = await fs.readFile(seedPath, "utf8");
  return JSON.parse(raw);
}

export async function getContent() {
  const fromKv = await kv.get(KV_KEY);
  if (fromKv && typeof fromKv === "object") return fromKv;

  const seed = await readSeedFromRepo();
  await kv.set(KV_KEY, seed);
  return seed;
}

export async function setContent(content) {
  await kv.set(KV_KEY, content);
}
