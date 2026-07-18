import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { validatePark } from "./lib/park-validation.mjs";

const execFileAsync = promisify(execFile);

const BASE_SHA = process.env.BASE_SHA;
const HEAD_SHA = process.env.HEAD_SHA;
const HEAD_REF = process.env.HEAD_REF;

const SAFE_NAME = /^[a-z0-9][a-z0-9_-]{2,79}$/i;
const IMAGE_BASENAME = /^[a-z0-9_-]+$/;

function fail(message) {
    console.error(`Contribution diff check failed: ${message}`);
    process.exit(1);
}

function validateRef(headRef) {
    if (!/^contribution\/park-\d{8}-[a-f0-9]{8}$/.test(headRef || "")) {
        fail(`Unexpected contribution branch name: ${headRef}`);
    }
}

async function getDiff(base, head) {
    const { stdout } = await execFileAsync(
        "git",
        ["diff", "--no-renames", "--name-status", base, head],
        { maxBuffer: 10 * 1024 * 1024 }
    );

    return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [status, ...rest] = line.split("\t");
            return { status, path: rest.join("\t") };
        });
}

function parseImagePath(filePath) {
    const imageMatch =
        /^assets\/images\/parks\/([a-z0-9][a-z0-9_-]{2,79})\/(med|thumb)\/([a-z0-9_-]+)\.webp$/.exec(
            filePath
        );

    if (!imageMatch) return null;

    return {
        parkId: imageMatch[1],
        variant: imageMatch[2],
        basename: imageMatch[3],
    };
}

function parseParkJsonPath(filePath) {
    const match = /^data\/parks\/([a-z0-9][a-z0-9_-]{2,79})\.json$/.exec(filePath);
    if (!match) return null;
    return { parkId: match[1] };
}

async function main() {
    if (!BASE_SHA || !HEAD_SHA || !HEAD_REF) {
        fail("BASE_SHA, HEAD_SHA and HEAD_REF must be provided.");
    }

    validateRef(HEAD_REF);

    const changes = await getDiff(BASE_SHA, HEAD_SHA);

    let parkJsonChange = null;
    const imageChanges = [];
    const seenPaths = new Set();

    for (const change of changes) {
        const { status, path: filePath } = change;

        if (seenPaths.has(filePath)) {
            fail(`Duplicate path entry: ${filePath}`);
        }
        seenPaths.add(filePath);

        const parkMatch = parseParkJsonPath(filePath);
        if (parkMatch) {
            if (parkJsonChange) {
                fail(`Multiple park JSON files found: ${filePath}`);
            }
            parkJsonChange = { ...change, parkId: parkMatch.parkId };
            continue;
        }

        const image = parseImagePath(filePath);
        if (image) {
            if (!IMAGE_BASENAME.test(image.basename)) {
                fail(`Unsafe image basename: ${image.basename}`);
            }
            imageChanges.push({ ...change, ...image });
            continue;
        }

        fail(`Path not permitted on contribution branch: ${filePath}`);
    }

    if (!parkJsonChange) {
        fail("Expected exactly one park JSON file, found none.");
    }

    const jsonStatus = parkJsonChange.status[0];
    let mode;
    if (jsonStatus === "A") {
        mode = "create";
    } else if (jsonStatus === "M") {
        mode = "update";
    } else {
        fail(`Unsupported park JSON status: ${parkJsonChange.status}`);
    }

    const expectedId = parkJsonChange.parkId;

    // All image paths must belong to the same park id as the JSON.
    for (const image of imageChanges) {
        if (image.parkId !== expectedId) {
            fail(
                `Image path belongs to "${image.parkId}", expected "${expectedId}".`
            );
        }
    }

    if (mode === "create") {
        validateCreateDiff(parkJsonChange, imageChanges, expectedId);
    } else {
        await validateUpdateDiff(parkJsonChange, imageChanges, expectedId);
    }

    console.log(
        `Contribution diff OK (${mode}): 1 park JSON, ${imageChanges.length} image changes, path=${parkJsonChange.path}`
    );
}

function validateCreateDiff(parkJsonChange, imageChanges, expectedId) {
    // Create mode: only additions are allowed.
    for (const change of imageChanges) {
        if (change.status[0] !== "A") {
            fail(`Create mode only allows added images: ${change.path}`);
        }
    }

    const medNames = new Set();
    const thumbNames = new Set();

    for (const image of imageChanges) {
        if (image.variant === "med") medNames.add(image.basename);
        else thumbNames.add(image.basename);
    }

    if (medNames.size !== thumbNames.size) {
        fail("Every med image must have a matching thumb image.");
    }

    for (const name of medNames) {
        if (!thumbNames.has(name)) {
            fail(`Missing thumb for med image: ${name}`);
        }
    }

    if (medNames.size > 8 || imageChanges.length > 16) {
        fail("Too many submitted images; maximum is 8 med/thumb pairs.");
    }

    validateParkReferences(parkJsonChange, medNames, thumbNames, expectedId);
}

async function validateUpdateDiff(parkJsonChange, imageChanges, expectedId) {
    const medNames = new Set();
    const thumbNames = new Set();
    const addedNames = new Set();
    const deletedNames = new Set();

    for (const image of imageChanges) {
        if (image.variant === "med") medNames.add(image.basename);
        else thumbNames.add(image.basename);

        const status = image.status[0];
        if (status === "A") addedNames.add(image.basename);
        else if (status === "D") deletedNames.add(image.basename);
        else if (status === "M") {
            fail(`Modified existing image path is not allowed: ${image.path}`);
        }
    }

    // Added images must appear in med/thumb pairs.
    for (const name of addedNames) {
        if (!medNames.has(name) || !thumbNames.has(name)) {
            fail(`Added image "${name}" must be added as a med/thumb pair.`);
        }
    }

    // Deleted images must appear in med/thumb pairs.
    for (const name of deletedNames) {
        if (!medNames.has(name) || !thumbNames.has(name)) {
            fail(`Deleted image "${name}" must be deleted as a med/thumb pair.`);
        }
    }

    if (medNames.size > 8) {
        fail("Too many images; maximum is 8 med/thumb pairs.");
    }

    // Load the final park JSON.
    const parkJsonFullPath = path.join(process.cwd(), parkJsonChange.path);
    const finalPark = JSON.parse(await fs.readFile(parkJsonFullPath, "utf8"));

    if (finalPark.id !== expectedId) {
        fail(`Park JSON id "${finalPark.id}" does not match filename "${expectedId}".`);
    }

    validatePark(finalPark, { fail });

    const finalReferences = new Set([
        ...(finalPark.park_images || []),
        ...finalPark.equipment.flatMap((e) => e.images || []),
    ]);

    // Deleted images must not be referenced in the final JSON.
    for (const name of deletedNames) {
        if (finalReferences.has(name)) {
            fail(`Deleted image "${name}" is still referenced in final JSON.`);
        }
    }

    // Added images must be referenced in the final JSON.
    for (const name of addedNames) {
        if (!finalReferences.has(name)) {
            fail(`Added image "${name}" is not referenced in final JSON.`);
        }
    }

    // Retained references must exist in the checked-out HEAD.
    const { stdout: headCat } = await execFileAsync(
        "git",
        ["show", `${BASE_SHA}:${parkJsonChange.path}`],
        { maxBuffer: 10 * 1024 * 1024 }
    ).catch(() => ({ stdout: "" }));

    if (headCat) {
        const headPark = JSON.parse(headCat);
        const headReferences = new Set([
            ...(headPark.park_images || []),
            ...headPark.equipment.flatMap((e) => e.images || []),
        ]);

        for (const reference of finalReferences) {
            if (/^https?:\/\//i.test(reference)) continue;
            if (!headReferences.has(reference) && !addedNames.has(reference)) {
                fail(
                    `Retained image "${reference}" does not exist in the checked-out HEAD.`
                );
            }
        }
    }
}

function validateParkReferences(parkJsonChange, medNames, thumbNames, expectedId) {
    const parkJsonFullPath = path.join(process.cwd(), parkJsonChange.path);
    const park = JSON.parse(fs.readFileSync(parkJsonFullPath, "utf8"));

    if (park.id !== expectedId) {
        fail(`Park JSON id "${park.id}" does not match filename "${expectedId}".`);
    }

    validatePark(park, { fail });

    const referenced = new Set([
        ...(park.park_images || []),
        ...park.equipment.flatMap((e) => e.images || []),
    ]);

    for (const name of referenced) {
        if (!medNames.has(name) || !thumbNames.has(name)) {
            fail(`JSON references missing image: ${name}`);
        }
    }

    for (const name of medNames) {
        if (!referenced.has(name)) {
            fail(`Unreferenced image present: ${name}`);
        }
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
