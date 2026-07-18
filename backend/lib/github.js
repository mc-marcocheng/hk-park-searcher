import { randomBytes } from "node:crypto";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { districts } from "./catalog.js";
import { SAFE_BASENAME } from "./schema.js";

const REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const REPO_NAME = process.env.GITHUB_REPO_NAME;
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || "master";

let octokit = null;

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export function getRepositoryClient() {
    if (octokit) return octokit;

    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");

    octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: process.env.GITHUB_APP_ID,
            privateKey,
            installationId: process.env.GITHUB_APP_INSTALLATION_ID,
        },
    });

    return octokit;
}

export async function getBaseSha(kit) {
    const ref = await kit.git.getRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `heads/${BASE_BRANCH}`,
    });
    return ref.data.object.sha;
}

/* =========================================================
   Park id generation
   ========================================================= */

function slugifyAscii(value) {
    return String(value || "")
        .normalize("NFKD")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

function coordinateFallback(park) {
    const district = park.districtCode.replace(/_/g, "-");
    const lat = Math.abs(park.coords.lat).toFixed(4).replace(".", "");
    const lng = Math.abs(park.coords.lng).toFixed(4).replace(".", "");

    return `${district}-park-${lat}-${lng}`;
}

function buildParkIdBase(park) {
    return slugifyAscii(park.name.en) || slugifyAscii(park.address.en) || coordinateFallback(park);
}

async function generateUniqueParkId(kit, park, baseSha) {
    const base = buildParkIdBase(park);

    for (let index = 1; index <= 100; index++) {
        const candidate = index === 1 ? base : `${base}-${index}`;

        if (!(await repositoryPathExists(kit, `data/parks/${candidate}.json`, baseSha))) {
            return candidate;
        }
    }

    throw new HttpError(409, "Unable to generate a unique park id");
}

async function repositoryPathExists(kit, filePath, ref) {
    try {
        await kit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: filePath,
            ref,
        });

        return true;
    } catch (error) {
        if (error.status === 404) return false;
        throw error;
    }
}

/* =========================================================
   Image filename assignment
   ========================================================= */

function assignImageBasenames(images, reservedNames = new Set()) {
    const assigned = new Map();
    const counters = new Map();

    for (const image of images) {
        const prefix = image.role === "park" ? "overview" : image.equipmentType;

        let counter = counters.get(prefix) || 1;
        let basename;

        do {
            basename = `${prefix}_${counter}`;
            counter++;
        } while (reservedNames.has(basename));

        counters.set(prefix, counter);
        reservedNames.add(basename);
        assigned.set(image.clientId, basename);
    }

    return assigned;
}

function collectLocalImageBasenames(park) {
    const names = new Set();

    for (const reference of park.park_images || []) {
        if (!/^https?:\/\//i.test(reference)) names.add(reference);
    }

    for (const equipment of park.equipment || []) {
        for (const reference of equipment.images || []) {
            if (!/^https?:\/\//i.test(reference)) names.add(reference);
        }
    }

    return names;
}

/* =========================================================
   Park JSON builders
   ========================================================= */

function buildNewParkJson(submission, id, imageNames) {
    const { park, images } = submission;

    const parkImages = images
        .filter((image) => image.role === "park")
        .map((image) => imageNames.get(image.clientId));

    const equipment = park.equipment.map((type) => ({
        type,
        images: images
            .filter((image) => image.role === "equipment" && image.equipmentType === type)
            .map((image) => imageNames.get(image.clientId)),
    }));

    return {
        id,
        name: park.name,
        coords: park.coords,
        district: districts[park.districtCode],
        address: park.address,
        equipment,
        park_images: parkImages,
        metrics: {
            quality: park.metrics.quality,
        },
        comment: park.comment || "",
        comment_format: "plain",
        contributedAt: new Date().toISOString(),
    };
}

function buildUpdatedParkJson(submission, existingPark, imageNames) {
    const retainedParkImages = submission.retainedImages
        .filter((image) => image.role === "park")
        .map((image) => image.reference);

    const newParkImages = submission.images
        .filter((image) => image.role === "park")
        .map((image) => imageNames.get(image.clientId));

    const equipment = submission.park.equipment.map((type) => {
        const retained = submission.retainedImages
            .filter((image) => image.role === "equipment" && image.equipmentType === type)
            .map((image) => image.reference);

        const added = submission.images
            .filter((image) => image.role === "equipment" && image.equipmentType === type)
            .map((image) => imageNames.get(image.clientId));

        return {
            type,
            images: [...retained, ...added],
        };
    });

    return {
        ...existingPark,
        id: existingPark.id,
        name: submission.park.name,
        coords: submission.park.coords,
        district: districts[submission.park.districtCode],
        address: submission.park.address,
        equipment,
        park_images: [...retainedParkImages, ...newParkImages],
        metrics: {
            ...existingPark.metrics,
            quality: submission.park.metrics.quality,
        },
        comment: submission.park.comment || "",
        comment_format: "plain",
        updatedAt: new Date().toISOString(),
    };
}

/* =========================================================
   Retained image authentication
   ========================================================= */

function existingImageReferenceSet(park) {
    const references = new Set();

    for (const reference of park.park_images || []) {
        references.add(`park||${reference}`);
    }

    for (const equipment of park.equipment || []) {
        for (const reference of equipment.images || []) {
            references.add(`equipment|${equipment.type}|${reference}`);
        }
    }

    return references;
}

function validateRetainedReferences(submission, existingPark) {
    const allowed = existingImageReferenceSet(existingPark);

    for (const image of submission.retainedImages) {
        const key =
            image.role === "park"
                ? `park||${image.reference}`
                : `equipment|${image.equipmentType}|${image.reference}`;

        if (!allowed.has(key)) {
            throw new HttpError(400, `Unknown retained image reference: ${image.reference}`);
        }
    }
}

/* =========================================================
   Final park validation
   ========================================================= */

function validateFinalPark(park) {
    if (!SAFE_BASENAME.test(park.id)) {
        throw new HttpError(422, "Invalid park id in final record");
    }

    const allReferences = [
        ...(park.park_images || []),
        ...park.equipment.flatMap((e) => e.images || []),
    ];

    const seen = new Set();
    for (const reference of allReferences) {
        if (/^https?:\/\//i.test(reference)) continue;
        if (!SAFE_BASENAME.test(reference)) {
            throw new HttpError(422, `Invalid image basename: ${reference}`);
        }
        if (seen.has(reference)) {
            throw new HttpError(422, `Duplicate image reference: ${reference}`);
        }
        seen.add(reference);
    }

    if (!park.park_images || park.park_images.length === 0) {
        throw new HttpError(422, "At least one park environment image is required");
    }

    for (const type of park.equipment) {
        if (!type.images || type.images.length === 0) {
            throw new HttpError(422, `Equipment type ${type.type} has no resulting image`);
        }
    }
}

/* =========================================================
   Atomic commit + Pull Request
   ========================================================= */

async function createAtomicContributionCommit({
    kit,
    baseSha,
    branchName,
    message,
    files,
    deletedPaths = [],
}) {
    const baseCommit = await kit.git.getCommit({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        commit_sha: baseSha,
    });

    const treeEntries = [];

    for (const file of files) {
        const blob = await kit.git.createBlob({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            content: file.content.toString("base64"),
            encoding: "base64",
        });

        treeEntries.push({
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: blob.data.sha,
        });
    }

    for (const filePath of deletedPaths) {
        treeEntries.push({
            path: filePath,
            mode: "100644",
            type: "blob",
            sha: null,
        });
    }

    const tree = await kit.git.createTree({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        base_tree: baseCommit.data.tree.sha,
        tree: treeEntries,
    });

    const commit = await kit.git.createCommit({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        message,
        tree: tree.data.sha,
        parents: [baseSha],
    });

    await kit.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `refs/heads/${branchName}`,
        sha: commit.data.sha,
    });

    return commit.data.sha;
}

async function reencodeFromSubmission(variant, label) {
    const { reencodeImage } = await import("./images.js");
    return reencodeImage(variant.base64, label);
}

function dateStamp() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function randomHex() {
    return randomBytes(4).toString("hex");
}

function buildPrBody(submission, id, options = {}) {
    const { park } = submission;
    const lines = [
        `## 社區投稿 / Community Contribution`,
        ``,
        `**公園名稱 / Name:** ${park.name.zh}${park.name.en ? ` (${park.name.en})` : ""}`,
        `**地區 / District:** ${park.districtCode}`,
        `**地址 / Address:** ${park.address.zh}`,
        `**座標 / Coords:** ${park.coords.lat}, ${park.coords.lng}`,
        `**器材 / Equipment:** ${park.equipment.join(", ") || "無"}`,
        `**相片數量 / Images:** ${submission.images.length}`,
    ];

    if (submission.operation === "update") {
        lines.push(``);
        lines.push(`## 社區更新 / Community Update`);
        lines.push(``);
        lines.push(`**Park id:** \`${id}\``);
        lines.push(`**Name:** ${park.name.zh} (${park.name.en})`);
        lines.push(`**New images:** ${submission.images.length}`);
        lines.push(`**Removed images:** ${options.removedImages ?? 0}`);
        lines.push(`**Base blob:** \`${submission.baseBlobSha}\``);

        if (options.fieldSummary && options.fieldSummary.length) {
            lines.push(``);
            for (const line of options.fieldSummary) {
                lines.push(`- ${line}`);
            }
        }
    }

    lines.push(``);
    lines.push(`Submission key: \`${submission.submissionKey}\``);
    lines.push(`Park id: \`${id}\``);

    return lines.join("\n");
}

/* =========================================================
   Public entry point
   ========================================================= */

export async function createContributionPullRequest(submission) {
    const kit = getRepositoryClient();
    const baseSha = await getBaseSha(kit);

    const branchName = `contribution/park-${dateStamp()}-${randomHex()}`;

    let id;
    let parkJson;
    let imageNames;
    let deletedPaths = [];
    let removedImages = 0;
    let fieldSummary = [];

    if (submission.operation === "create") {
        id = await generateUniqueParkId(kit, submission.park, baseSha);
        imageNames = assignImageBasenames(submission.images);
        parkJson = buildNewParkJson(submission, id, imageNames);
    } else {
        const currentFile = await kit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: `data/parks/${submission.parkId}.json`,
            ref: baseSha,
        });

        if (Array.isArray(currentFile.data) || currentFile.data.type !== "file") {
            throw new HttpError(404, "Park not found");
        }

        if (currentFile.data.sha !== submission.baseBlobSha) {
            throw new HttpError(
                409,
                "This park changed after the form was loaded. Please reload it and try again."
            );
        }

        const existingPark = JSON.parse(
            Buffer.from(currentFile.data.content, "base64").toString("utf8")
        );

        if (existingPark.id !== submission.parkId) {
            throw new HttpError(409, "Park id does not match its source file");
        }

        validateRetainedReferences(submission, existingPark);

        id = submission.parkId;
        const reservedNames = collectLocalImageBasenames(existingPark);
        imageNames = assignImageBasenames(submission.images, reservedNames);
        parkJson = buildUpdatedParkJson(submission, existingPark, imageNames);

        const finalReferences = new Set([
            ...(parkJson.park_images || []),
            ...parkJson.equipment.flatMap((e) => e.images || []),
        ]);

        const existingReferences = collectLocalImageBasenames(existingPark);
        for (const reference of existingReferences) {
            if (!finalReferences.has(reference)) {
                deletedPaths.push(`assets/images/parks/${id}/med/${reference}.webp`);
                deletedPaths.push(`assets/images/parks/${id}/thumb/${reference}.webp`);
                removedImages++;
            }
        }

        fieldSummary = buildFieldSummary(submission, existingPark);
    }

    validateFinalPark(parkJson);

    const files = [
        {
            path: `data/parks/${id}.json`,
            content: Buffer.from(JSON.stringify(parkJson, null, 2)),
        },
    ];

    for (const image of submission.images) {
        const basename = imageNames.get(image.clientId);

        const [med, thumb] = await Promise.all([
            reencodeFromSubmission(image.med, "med"),
            reencodeFromSubmission(image.thumb, "thumb"),
        ]);

        files.push({
            path: `assets/images/parks/${id}/med/${basename}.webp`,
            content: med.buffer,
        });
        files.push({
            path: `assets/images/parks/${id}/thumb/${basename}.webp`,
            content: thumb.buffer,
        });
    }

    const title =
        submission.operation === "create"
            ? `社區投稿：新增 ${submission.park.name.zh}`
            : `社區投稿：更新 ${submission.park.name.zh}`;

    const message =
        submission.operation === "create"
            ? `Add contributed park: ${submission.park.name.zh}`
            : `Update contributed park: ${submission.park.name.zh}`;

    try {
        await createAtomicContributionCommit({
            kit,
            baseSha,
            branchName,
            message,
            files,
            deletedPaths,
        });
    } catch (error) {
        // Attempt to clean up the branch if commit creation fails.
        await kit.git
            .deleteRef({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                ref: `heads/${branchName}`,
            })
            .catch(() => {});
        throw error;
    }

    const pr = await kit.pulls.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        head: branchName,
        base: BASE_BRANCH,
        title,
        body: buildPrBody(submission, id, { removedImages, fieldSummary }),
    });

    return { pullRequestUrl: pr.data.html_url, branchName, parkId: id };
}

function buildFieldSummary(submission, existingPark) {
    const summary = [];

    if (
        existingPark.coords.lat !== submission.park.coords.lat ||
        existingPark.coords.lng !== submission.park.coords.lng
    ) {
        summary.push("Coordinates changed");
    }

    const oldQuality = existingPark.metrics?.quality;
    const newQuality = submission.park.metrics.quality;
    if (oldQuality !== newQuality) {
        summary.push(`Quality changed from ${oldQuality} to ${newQuality}`);
    }

    const oldEquipment = new Set((existingPark.equipment || []).map((e) => e.type));
    for (const type of submission.park.equipment) {
        if (!oldEquipment.has(type)) {
            summary.push(`Added ${type}`);
        }
    }

    const newEquipment = new Set(submission.park.equipment);
    for (const equipment of existingPark.equipment || []) {
        if (!newEquipment.has(equipment.type)) {
            summary.push(`Removed ${equipment.type} entirely`);
            continue;
        }
        for (const reference of equipment.images || []) {
            const stillRetained = submission.retainedImages.some(
                (image) =>
                    image.role === "equipment" &&
                    image.equipmentType === equipment.type &&
                    image.reference === reference
            );
            if (!stillRetained) {
                summary.push(`Removed ${equipment.type} image ${reference}`);
            }
        }
    }

    return summary;
}
