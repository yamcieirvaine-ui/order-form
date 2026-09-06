const memory = globalThis.__yvaineStore || (globalThis.__yvaineStore = new Map());

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command, ...args]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

export async function get(key, fallback = null) {
  try {
    const result = await redis("GET", key);
    if (result !== null) return JSON.parse(result);
  } catch (e) {
    console.error("store get:", e.message);
  }
  if (memory.has(key)) return memory.get(key);
  return fallback;
}

export async function set(key, value, ttlSeconds = null) {
  memory.set(key, value);
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) await redis("SETEX", key, ttlSeconds, payload);
    else await redis("SET", key, payload);
  } catch (e) {
    console.error("store set:", e.message);
  }
  return value;
}

export async function del(key) {
  memory.delete(key);
  try { await redis("DEL", key); } catch (e) { console.error("store del:", e.message); }
}

export async function incr(key) {
  try {
    const n = await redis("INCR", key);
    if (typeof n === "number") return n;
  } catch (e) {
    console.error("store incr:", e.message);
  }
  const next = Number(memory.get(key) || 1000) + 1;
  memory.set(key, next);
  return next;
}

export async function listSet(key) {
  try {
    const result = await redis("SMEMBERS", key);
    if (Array.isArray(result)) return result;
  } catch (e) {
    console.error("store smembers:", e.message);
  }
  return [...(memory.get(key) || new Set())];
}

export async function addSet(key, value) {
  const current = new Set(memory.get(key) || []);
  current.add(String(value));
  memory.set(key, current);
  try { await redis("SADD", key, String(value)); } catch (e) { console.error("store sadd:", e.message); }
}

export async function removeSet(key, value) {
  const current = new Set(memory.get(key) || []);
  current.delete(String(value));
  memory.set(key, current);
  try { await redis("SREM", key, String(value)); } catch (e) { console.error("store srem:", e.message); }
}

export const persistent = Boolean(REDIS_URL && REDIS_TOKEN);
