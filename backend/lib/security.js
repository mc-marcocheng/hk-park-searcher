import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function isOriginAllowed(origin) {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes("*")) return true;
    return ALLOWED_ORIGINS.includes(origin);
}

let ratelimit = null;

function getRatelimit() {
    if (ratelimit) return ratelimit;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        // No-op limiter when Redis is not configured (local/dev).
        ratelimit = {
            limit: async () => ({ success: true, limit: 0, remaining: 0, reset: 0 }),
        };
        return ratelimit;
    }

    const redis = new Redis({ url, token });
    ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        analytics: false,
        prefix: "park-submit",
    });
    return ratelimit;
}

export async function checkRateLimit(ip) {
    const key = anonymizeIp(ip);
    const limiter = getRatelimit();
    const result = await limiter.limit(key);
    return result.success;
}

function anonymizeIp(ip) {
    if (!ip) return "unknown";
    // HMAC-free stable hash to avoid storing raw IPs.
    let hash = 2166136261;
    for (let i = 0; i < ip.length; i++) {
        hash ^= ip.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `ip-${(hash >>> 0).toString(16)}`;
}

export async function verifyTurnstile(token, remoteIp) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        // Dev fallback: accept any non-empty token when secret unset.
        return Boolean(token);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            secret,
            response: token,
            remoteip: remoteIp || "",
        }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.success);
}
