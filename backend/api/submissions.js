import { validateSubmission } from "../lib/schema.js";
import { isOriginAllowed, checkRateLimit, verifyTurnstile } from "../lib/security.js";
import { createContributionPullRequest } from "../lib/github.js";

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

export default async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ message: "Method not allowed" });
        return;
    }

    const origin = request.headers.origin;
    if (!isOriginAllowed(origin)) {
        response.status(403).json({ message: "Origin not allowed" });
        return;
    }

    response.setHeader("Access-Control-Allow-Origin", origin || "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
        response.status(204).end();
        return;
    }

    const clientIp =
        request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        request.socket?.remoteAddress ||
        "";

    const allowed = await checkRateLimit(clientIp);
    if (!allowed) {
        response.status(429).json({ message: "Too many requests. Please try again later." });
        return;
    }

    let body;
    try {
        body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    } catch {
        response.status(400).json({ message: "Invalid JSON body" });
        return;
    }

    const parsed = validateSubmission(body);
    if (!parsed.success) {
        response.status(400).json({
            message: "Validation failed",
            issues: parsed.error.issues,
        });
        return;
    }

    const data = parsed.data;

    // Honeypot
    if (data.website && data.website.length > 0) {
        response.status(400).json({ message: "Submission rejected" });
        return;
    }

    const turnstileOk = await verifyTurnstile(data.turnstileToken, clientIp);
    if (!turnstileOk) {
        response.status(403).json({ message: "Human verification failed" });
        return;
    }

    // Idempotency lock
    const lockKey = `submission:${data.submissionKey}`;
    const acquired = await acquireLock(lockKey, IDEMPOTENCY_TTL_MS);
    if (!acquired) {
        response.status(409).json({ message: "Duplicate submission detected" });
        return;
    }

    try {
        const result = await createContributionPullRequest(data);
        response.status(201).json(result);
    } catch (error) {
        await releaseLock(lockKey);
        response.status(500).json({ message: "Failed to create contribution" });
    }
}

async function acquireLock(key, ttlMs) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return true; // No Redis: skip lock in dev

    const res = await fetch(`${url}/set/${key}/1?NX&PX=${ttlMs}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json.result === "OK";
}

async function releaseLock(key) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return;

    await fetch(`${url}/del/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}
