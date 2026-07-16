import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "../lib/schema.js";
import { equipmentTypes } from "../lib/catalog.js";

function makeValidSubmission(overrides = {}) {
    return {
        submissionVersion: 1,
        submissionKey: "123e4567-e89b-12d3-a456-426614174000",
        startedAt: 1700000000000,
        website: "",
        turnstileToken: "token-abc",
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
        ...overrides,
    };
}

test("accepts a valid submission", () => {
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
