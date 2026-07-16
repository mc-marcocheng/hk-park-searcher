import { randomBytes } from "node:crypto";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { districts } from "./catalog.js";

const REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const REPO_NAME = process.env.GITHUB_REPO_NAME;
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || "master";

let octokit = null;

function getOctokit() {
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

function generateParkId(park) {
    const slug = (park.name.en || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);

    const suffix = randomBytes(4).toString("hex");
    return `contrib-${slug || "park"}-${suffix}`;
}

export async function createContributionPullRequest(submission) {
    const kit = getOctokit();
    const id = generateParkId(submission.park);

    const branchName = `contribution/park-${dateStamp()}-${randomHex()}`;
    const baseSha = await getBaseSha(kit);

    await kit.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
    });

    const parkJson = buildParkJson(submission, id);
    await kit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        branch: branchName,
        path: `data/parks/${id}.json`,
        message: `Add contributed park: ${submission.park.name.zh}`,
        content: Buffer.from(JSON.stringify(parkJson, null, 2)).toString("base64"),
    });

    for (const image of submission.images) {
        const [med, thumb] = await Promise.all([
            reencodeFromSubmission(image.med, "med"),
            reencodeFromSubmission(image.thumb, "thumb"),
        ]);

        await kit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            branch: branchName,
            path: `assets/images/parks/${id}/med/${image.clientId}.webp`,
            message: `Add med image for ${id}`,
            content: med.buffer.toString("base64"),
        });

        await kit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            branch: branchName,
            path: `assets/images/parks/${id}/thumb/${image.clientId}.webp`,
            message: `Add thumb image for ${id}`,
            content: thumb.buffer.toString("base64"),
        });
    }

    const pr = await kit.pulls.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        head: branchName,
        base: BASE_BRANCH,
        title: `社區投稿：${submission.park.name.zh}`,
        body: buildPrBody(submission, id),
    });

    return { pullRequestUrl: pr.data.html_url, branchName, parkId: id };
}

async function getBaseSha(kit) {
    const ref = await kit.git.getRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `heads/${BASE_BRANCH}`,
    });
    return ref.data.object.sha;
}

function buildParkJson(submission, id) {
    const { park, images } = submission;

    const parkImages = images
        .filter((image) => image.role === "park")
        .map((image) => image.clientId);

    const equipment = park.equipment.map((type) => ({
        type,
        images: images
            .filter((image) => image.role === "equipment" && image.equipmentType === type)
            .map((image) => image.clientId),
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

function buildPrBody(submission, id) {
    const { park } = submission;
    return [
        `## 社區投稿 / Community Contribution`,
        ``,
        `**公園名稱 / Name:** ${park.name.zh}${park.name.en ? ` (${park.name.en})` : ""}`,
        `**地區 / District:** ${park.districtCode}`,
        `**地址 / Address:** ${park.address.zh}`,
        `**座標 / Coords:** ${park.coords.lat}, ${park.coords.lng}`,
        `**器材 / Equipment:** ${park.equipment.join(", ") || "無"}`,
        `**相片數量 / Images:** ${submission.images.length}`,
        ``,
        `Submission key: \`${submission.submissionKey}\``,
        `Park id: \`${id}\``,
    ].join("\n");
}

function dateStamp() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function randomHex() {
    return randomBytes(4).toString("hex");
}

async function reencodeFromSubmission(variant, label) {
    const { reencodeImage } = await import("./images.js");
    return reencodeImage(variant.base64, label);
}
