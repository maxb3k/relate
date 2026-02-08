import { NextRequest } from "next/server";

type RateLimitEntry = { hits: number[] };

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

const RATE_LIMIT_BUCKETS: Map<string, RateLimitEntry> =
  (globalThis as { __voiceRateLimitBuckets?: Map<string, RateLimitEntry> }).__voiceRateLimitBuckets || new Map();

(globalThis as { __voiceRateLimitBuckets?: Map<string, RateLimitEntry> }).__voiceRateLimitBuckets = RATE_LIMIT_BUCKETS;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  return realIp || "unknown";
}

export function requireSharedSecret(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.API_SHARED_SECRET;
  if (!expected) return { ok: true };

  const authHeader = req.headers.get("authorization") || "";
  const xApiKey = req.headers.get("x-api-key") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const presented = bearerToken || xApiKey;

  if (!presented || presented !== expected) {
    return { ok: false, reason: "Unauthorized. Missing or invalid API shared secret." };
  }

  return { ok: true };
}

export function checkRateLimit(req: NextRequest): RateLimitResult {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 12);

  const now = Date.now();
  const ip = getClientIp(req);
  const key = `voice-turn:${ip}`;

  const bucket = RATE_LIMIT_BUCKETS.get(key) || { hits: [] };
  bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs);

  if (bucket.hits.length >= maxRequests) {
    const retryMs = Math.max(0, windowMs - (now - bucket.hits[0]));
    RATE_LIMIT_BUCKETS.set(key, bucket);
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      retryAfterSec: Math.ceil(retryMs / 1000)
    };
  }

  bucket.hits.push(now);
  RATE_LIMIT_BUCKETS.set(key, bucket);

  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - bucket.hits.length),
    retryAfterSec: 0
  };
}
