import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "../lib/schema.js";
import { equipmentTypes } from "../lib/catalog.js";

function makeValidSubmission(overrides = {}) {
    const base = {
        submissionVersion: 2,
        submissionKey: "123e4567-e89b-12d3-a456-426614174000",
        startedAt: 1700000000000,
        website: "",
        turnstileToken: "token-abc",
        operation: "create",
        park: {
            name: { zh: "測試公園", en: "Test Park" },
            districtCode: "yau_tsim_mong",
            address: { zh: "測試路1號", en: "1 Test Road" },
            coords: { lat: 22.316, lng: 114.17 },
            equipment: ["high_pull_up_bar"],
            metrics: { quality: 4 },
            comment: "hello",
        },
        images: [
            {
                clientId: "123e4567-e89b-12d3-a456-426614174001",
                role: "park",
                equipmentType: null,
                med: {
                    mime: "image/webp",
                    width: 800,
                    height: 1200,
                    byteLength: 38,
                    base64: "UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=",
                },
                thumb: {
                    mime: "image/webp",
                    width: 200,
                    height: 300,
                    byteLength: 38,
                    base64: "UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=",
                },
            },
            {
                clientId: "123e4567-e89b-12d3-a456-426614174002",
                role: "equipment",
                equipmentType: "high_pull_up_bar",
                med: {
                    mime: "image/webp",
                    width: 800,
                    height: 1200,
                    byteLength: 38,
                    base64: "UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=",
                },
                thumb: {
                    mime: "image/webp",
                    width: 200,
                    height: 300,
                    byteLength: 38,
                    base64: "UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=",
                },
            },
        ],
        attestations: {
            accurate: true,
            imageRights: true,
            publicSubmission: true,
        },
    };

    // Deep merge overrides so nested park fields are preserved.
    const merged = structuredClone(base);
    for (const [key, value] of Object.entries(overrides)) {
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            merged[key] &&
            typeof merged[key] === "object"
        ) {
            merged[key] = { ...merged[key], ...value };
        } else {
            merged[key] = value;
        }
    }
    return merged;
}

test("accepts a valid version 2 create submission", () => {
    const result = validateSubmission(makeValidSubmission());
    assert.equal(result.success, true);
});

test("rejects unknown district", () => {
    const result = validateSubmission(makeValidSubmission({ park: { districtCode: "XXX" } }));
    assert.equal(result.success, false);
});

test("rejects unknown equipment type", () => {
    const result = validateSubmission(makeValidSubmission({ park: { equipment: ["未知器材"] } }));
    assert.equal(result.success, false);
});

test("rejects coords outside Hong Kong", () => {
    const result = validateSubmission(
        makeValidSubmission({ park: { coords: { lat: 0, lng: 0 } } })
    );
    assert.equal(result.success, false);
});

test("rejects missing attestations", () => {
    const result = validateSubmission(
        makeValidSubmission({
            attestations: { accurate: false, imageRights: true, publicSubmission: true },
        })
    );
    assert.equal(result.success, false);
});

test("rejects too many images", () => {
    const images = Array.from({ length: 9 }, (_, i) => ({
        clientId: `123e4567-e89b-12d3-a456-42661417400${i}`,
        role: "park",
        equipmentType: null,
        med: { mime: "image/webp", width: 800, height: 1200, byteLength: 2, base64: "AAA=" },
        thumb: { mime: "image/webp", width: 200, height: 300, byteLength: 2, base64: "AAA=" },
    }));
    const result = validateSubmission(makeValidSubmission({ images }));
    assert.equal(result.success, false);
});

test("rejects submission without a park environment image", () => {
    const submission = makeValidSubmission();
    submission.images = submission.images.filter((image) => image.role === "equipment");
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("accepts a valid update with zero new images", () => {
    const submission = makeValidSubmission({
        operation: "update",
        parkId: "cornwall-street-park",
        baseBlobSha: "a".repeat(40),
        retainedImages: [
            { reference: "overview_1", role: "park", equipmentType: null },
            {
                reference: "high_pull_up_bar_1",
                role: "equipment",
                equipmentType: "high_pull_up_bar",
            },
        ],
        images: [],
    });
    const result = validateSubmission(submission);
    assert.equal(result.success, true);
});

test("update requires parkId", () => {
    const submission = makeValidSubmission({ operation: "update", images: [] });
    delete submission.parkId;
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("update requires a 40-character blob SHA", () => {
    const submission = makeValidSubmission({
        operation: "update",
        parkId: "cornwall-street-park",
        baseBlobSha: "tooshort",
        retainedImages: [],
        images: [],
    });
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("create rejects retainedImages", () => {
    const submission = makeValidSubmission({
        retainedImages: [{ reference: "overview_1", role: "park", equipmentType: null }],
    });
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("update rejects malformed retained reference", () => {
    const submission = makeValidSubmission({
        operation: "update",
        parkId: "cornwall-street-park",
        baseBlobSha: "a".repeat(40),
        retainedImages: [
            { reference: "overview_1", role: "park", equipmentType: "high_pull_up_bar" },
        ],
        images: [],
    });
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("total new image size remains limited", () => {
    const images = Array.from({ length: 2 }, (_, i) => ({
        clientId: `123e4567-e89b-12d3-a456-42661417400${i}`,
        role: "park",
        equipmentType: null,
        med: {
            mime: "image/webp",
            width: 800,
            height: 1200,
            byteLength: 2 * 1024 * 1024,
            base64: "A".repeat(2_000_000),
        },
        thumb: {
            mime: "image/webp",
            width: 200,
            height: 300,
            byteLength: 2 * 1024 * 1024,
            base64: "A".repeat(2_000_000),
        },
    }));
    const result = validateSubmission(makeValidSubmission({ images }));
    assert.equal(result.success, false);
});

test("duplicate new client IDs are rejected", () => {
    const submission = makeValidSubmission();
    submission.images[1].clientId = submission.images[0].clientId;
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("rejects rating below 1", () => {
    const result = validateSubmission(makeValidSubmission({ park: { metrics: { quality: 0 } } }));
    assert.equal(result.success, false);
});

test("rejects rating above 5", () => {
    const result = validateSubmission(makeValidSubmission({ park: { metrics: { quality: 6 } } }));
    assert.equal(result.success, false);
});

test("rejects duplicate image UUIDs", () => {
    const submission = makeValidSubmission();
    submission.images[1].clientId = submission.images[0].clientId;
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("rejects equipment image not listed in park.equipment", () => {
    const submission = makeValidSubmission();
    submission.images[1].equipmentType = "low_bar";
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("rejects listed equipment without a corresponding image", () => {
    const submission = makeValidSubmission();
    submission.images = submission.images.filter((image) => image.role === "park");
    const result = validateSubmission(submission);
    assert.equal(result.success, false);
});

test("frontend and backend catalogues use the same equipment codes", () => {
    const expected = [
        "high_pull_up_bar",
        "low_bar",
        "parallel_bars",
        "monkey_bars",
        "sit_up_bench",
        "others",
    ];
    assert.deepEqual(equipmentTypes, expected);
});
