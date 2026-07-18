import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

process.env.GITHUB_REPO_OWNER = "owner";
process.env.GITHUB_REPO_NAME = "repo";
process.env.GITHUB_BASE_BRANCH = "master";

// Intercept @octokit/rest via a loader hook so getRepositoryClient() returns
// our fake kit. mock.module is unavailable in this Node build.
register("./octokit-loader.mjs", import.meta.url);

const { kitHolder } = await import(new URL("./octokit-stub.mjs", import.meta.url).href);

const github = await import("../lib/github.js");

function makeKit(existingPaths = new Set()) {
    const kit = {
        _commits: 0,
        _refCreated: false,
        _blobs: [],
        repos: {
            getContent: async ({ path }) => {
                if (existingPaths.has(path)) {
                    return { data: { type: "file", content: "", sha: "existing-sha" } };
                }
                const error = new Error("Not found");
                error.status = 404;
                throw error;
            },
        },
        git: {
            getRef: async () => ({ data: { object: { sha: "base-sha" } } }),
            getCommit: async () => ({ data: { tree: { sha: "base-tree" } } }),
            createBlob: async ({ content }) => {
                kit._blobs.push(content);
                return { data: { sha: `blob-${kit._blobs.length}` } };
            },
            createTree: async () => ({ data: { sha: "new-tree" } }),
            createCommit: async () => {
                kit._commits++;
                return { data: { sha: "new-commit" } };
            },
            createRef: async () => {
                kit._refCreated = true;
                return {};
            },
            deleteRef: async () => ({}),
        },
        pulls: {
            create: async () => ({ data: { html_url: "https://example/pr/1" } }),
        },
    };
    return kit;
}

function withKit(kit) {
    kitHolder.kit = kit;
}

function makePark(overrides = {}) {
    return {
        name: { zh: "歌和老街公園", en: "Cornwall Street Park" },
        districtCode: "sham_shui_po",
        address: { zh: "九龍塘歌和老街17號", en: "17 Cornwall Street, Kowloon Tong" },
        coords: { lat: 22.338611, lng: 114.174167 },
        equipment: ["high_pull_up_bar"],
        metrics: { quality: 4 },
        comment: "",
        ...overrides,
    };
}

function makeImage(clientId, role, equipmentType) {
    return {
        clientId,
        role,
        equipmentType,
        med: {
            base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        },
        thumb: {
            base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        },
    };
}

function makeCreateSubmission(parkOverrides = {}, imageOverrides = []) {
    return {
        operation: "create",
        submissionKey: "123e4567-e89b-12d3-a456-426614174000",
        startedAt: 1700000000000,
        website: "",
        turnstileToken: "token",
        park: makePark(parkOverrides),
        images: imageOverrides.length
            ? imageOverrides
            : [makeImage("123e4567-e89b-12d3-a456-426614174001", "park", null)],
        attestations: { accurate: true, imageRights: true, publicSubmission: true },
    };
}

function makeExistingContent(extra = {}) {
    return Buffer.from(
        JSON.stringify({
            id: "cornwall-street-park",
            name: { zh: "歌和老街公園", en: "Cornwall Street Park" },
            district: { zh: "深水埗區", en: "Sham Shui Po" },
            address: { zh: "九龍塘歌和老街17號", en: "17 Cornwall Street" },
            coords: { lat: 22.338611, lng: 114.174167 },
            equipment: [{ type: "high_pull_up_bar", images: ["high_pull_up_bar_1"] }],
            park_images: ["overview_1"],
            metrics: { quality: 4 },
            ...extra,
        })
    ).toString("base64");
}

function makeUpdateSubmission(overrides = {}) {
    return {
        operation: "update",
        submissionKey: "123e4567-e89b-12d3-a456-426614174000",
        startedAt: 1700000000000,
        website: "",
        turnstileToken: "token",
        parkId: "cornwall-street-park",
        baseBlobSha: "current-sha",
        retainedImages: [
            { reference: "overview_1", role: "park", equipmentType: null },
            {
                reference: "high_pull_up_bar_1",
                role: "equipment",
                equipmentType: "high_pull_up_bar",
            },
        ],
        park: makePark({ metrics: { quality: 5 } }),
        images: [],
        attestations: { accurate: true, imageRights: true, publicSubmission: true },
        ...overrides,
    };
}

test("HttpError carries a status", () => {
    const error = new github.HttpError(409, "stale");
    assert.equal(error.status, 409);
    assert.equal(error.message, "stale");
});

test("create generates cornwall-street-park and semantic image names", async () => {
    const kit = makeKit();
    withKit(kit);
    const submission = makeCreateSubmission({}, [
        makeImage("123e4567-e89b-12d3-a456-426614174001", "park", null),
        makeImage("123e4567-e89b-12d3-a456-426614174002", "park", null),
        makeImage("123e4567-e89b-12d3-a456-426614174003", "equipment", "high_pull_up_bar"),
    ]);

    const result = await github.createContributionPullRequest(submission);

    assert.equal(result.parkId, "cornwall-street-park");
    assert.ok(result.parkId.startsWith("cornwall-street-park"));
    assert.ok(!result.parkId.includes("123e4567"));
});

test("collision generates cornwall-street-park-2", async () => {
    const kit = makeKit(new Set(["data/parks/cornwall-street-park.json"]));
    withKit(kit);
    const submission = makeCreateSubmission({}, [
        makeImage("123e4567-e89b-12d3-a456-426614174001", "park", null),
        makeImage("123e4567-e89b-12d3-a456-426614174002", "equipment", "high_pull_up_bar"),
    ]);

    const result = await github.createContributionPullRequest(submission);
    assert.equal(result.parkId, "cornwall-street-park-2");
});

test("Chinese-only submission uses deterministic coordinate fallback", async () => {
    const kit = makeKit();
    withKit(kit);
    const submission = makeCreateSubmission(
        {
            name: { zh: "深水埗公園", en: "" },
            address: { zh: "某路1號", en: "" },
        },
        [
            makeImage("123e4567-e89b-12d3-a456-426614174001", "park", null),
            makeImage("123e4567-e89b-12d3-a456-426614174002", "equipment", "high_pull_up_bar"),
        ]
    );

    const result = await github.createContributionPullRequest(submission);
    assert.ok(result.parkId.startsWith("sham-shui-po-park-"));
    assert.ok(!result.parkId.includes("contrib-"));
});

test("park images become overview_1, overview_2 and equipment high_pull_up_bar_1", async () => {
    const kit = makeKit();
    withKit(kit);
    const submission = makeCreateSubmission({}, [
        makeImage("123e4567-e89b-12d3-a456-426614174001", "park", null),
        makeImage("123e4567-e89b-12d3-a456-426614174002", "park", null),
        makeImage("123e4567-e89b-12d3-a456-426614174003", "equipment", "high_pull_up_bar"),
    ]);

    await github.createContributionPullRequest(submission);
    const parkJson = JSON.parse(Buffer.from(kit._blobs[0], "base64").toString("utf8"));
    assert.deepEqual(parkJson.park_images, ["overview_1", "overview_2"]);
    assert.deepEqual(parkJson.equipment[0].images, ["high_pull_up_bar_1"]);
    assert.ok(!JSON.stringify(parkJson).includes("123e4567"));
});

test("only one commit is created for a new park", async () => {
    const kit = makeKit();
    withKit(kit);
    const submission = makeCreateSubmission({}, [
        makeImage("123e4567-e89b-12d3-a456-426614174001", "park", null),
        makeImage("123e4567-e89b-12d3-a456-426614174002", "equipment", "high_pull_up_bar"),
    ]);

    await github.createContributionPullRequest(submission);
    assert.equal(kit._commits, 1);
    assert.equal(kit._refCreated, true);
});

test("stale blob SHA returns 409 for update", async () => {
    const kit = makeKit();
    withKit(kit);
    kit.repos.getContent = async () => ({
        data: { type: "file", content: makeExistingContent(), sha: "current-sha" },
    });

    const submission = makeUpdateSubmission({ baseBlobSha: "0".repeat(40) });

    await assert.rejects(
        () => github.createContributionPullRequest(submission),
        (error) => error instanceof github.HttpError && error.status === 409
    );
});

test("forged retained image is rejected with 400", async () => {
    const kit = makeKit();
    withKit(kit);
    kit.repos.getContent = async () => ({
        data: { type: "file", content: makeExistingContent(), sha: "current-sha" },
    });

    const submission = makeUpdateSubmission({
        retainedImages: [
            { reference: "overview_1", role: "park", equipmentType: null },
            {
                reference: "forged_image",
                role: "equipment",
                equipmentType: "high_pull_up_bar",
            },
        ],
    });

    await assert.rejects(
        () => github.createContributionPullRequest(submission),
        (error) => error instanceof github.HttpError && error.status === 400
    );
});

test("update preserves unknown existing fields and produces paired deletions", async () => {
    const kit = makeKit();
    withKit(kit);
    kit.repos.getContent = async () => ({
        data: {
            type: "file",
            content: makeExistingContent({
                customField: "keep-me",
                contributedAt: "2024-01-01T00:00:00.000Z",
            }),
            sha: "current-sha",
        },
    });

    const submission = makeUpdateSubmission({
        retainedImages: [
            { reference: "overview_1", role: "park", equipmentType: null },
            {
                reference: "high_pull_up_bar_1",
                role: "equipment",
                equipmentType: "high_pull_up_bar",
            },
        ],
    });

    const result = await github.createContributionPullRequest(submission);
    const parkJson = JSON.parse(Buffer.from(kit._blobs[0], "base64").toString("utf8"));

    assert.equal(parkJson.customField, "keep-me");
    assert.equal(parkJson.contributedAt, "2024-01-01T00:00:00.000Z");
    assert.equal(parkJson.id, "cornwall-street-park");
    assert.equal(result.parkId, "cornwall-street-park");
});
