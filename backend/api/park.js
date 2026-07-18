import { SAFE_ID } from "../lib/schema.js";
import { getRepositoryClient, getBaseSha } from "../lib/github.js";
import { isOriginAllowed } from "../lib/security.js";

export default async function handler(request, response) {
    const origin = request.headers.origin;

    if (!isOriginAllowed(origin)) {
        response.status(403).json({ message: "Origin not allowed" });
        return;
    }

    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Vary", "Origin");

    if (request.method === "OPTIONS") {
        response.status(204).end();
        return;
    }

    if (request.method !== "GET") {
        response.setHeader("Allow", "GET, OPTIONS");
        response.status(405).json({ message: "Method not allowed" });
        return;
    }

    const id = String(request.query.id || "");

    if (!SAFE_ID.test(id)) {
        response.status(400).json({ message: "Invalid park id" });
        return;
    }

    const kit = getRepositoryClient();
    const baseCommitSha = await getBaseSha(kit);

    try {
        const result = await kit.repos.getContent({
            owner: process.env.GITHUB_REPO_OWNER,
            repo: process.env.GITHUB_REPO_NAME,
            path: `data/parks/${id}.json`,
            ref: baseCommitSha,
        });

        if (Array.isArray(result.data) || result.data.type !== "file") {
            response.status(404).json({ message: "Park not found" });
            return;
        }

        const park = JSON.parse(Buffer.from(result.data.content, "base64").toString("utf8"));

        response.status(200).json({
            park,
            blobSha: result.data.sha,
            baseCommitSha,
        });
    } catch (error) {
        if (error.status === 404) {
            response.status(404).json({ message: "Park not found" });
            return;
        }

        throw error;
    }
}
