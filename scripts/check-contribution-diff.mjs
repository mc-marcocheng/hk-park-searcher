import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

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
    const { stdout } = await execFileAsync("git", ["diff", "--name-status", base, head], {
        maxBuffer: 10 * 1024 * 1024,
    });

    return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [status, ...rest] = line.split("\t");
            return { status, path: rest.join("\t") };
        });
}

async function main() {
    if (!BASE_SHA || !HEAD_SHA || !HEAD_REF) {
        fail("BASE_SHA, HEAD_SHA and HEAD_REF must be provided.");
    }

    validateRef(HEAD_REF);

    const changes = await getDiff(BASE_SHA, HEAD_SHA);

    let parkJsonPath = null;
    const imageFiles = [];
    const seenPaths = new Set();

    for (const change of changes) {
        const { status, path: filePath } = change;

        if (!status.startsWith("A")) {
            fail(`Contribution files must be newly added: ${filePath}`);
        }

        if (seenPaths.has(filePath)) {
            fail(`Duplicate path entry: ${filePath}`);
        }
        seenPaths.add(filePath);

        const parkMatch = /^data\/parks\/([a-z0-9][a-z0-9_-]{2,79})\.json$/.exec(filePath);
        if (parkMatch) {
            if (parkJsonPath) {
                fail(`Multiple park JSON files found: ${filePath}`);
            }
            parkJsonPath = filePath;
            continue;
        }

        const imageMatch =
            /^assets\/images\/parks\/[a-z0-9][a-z0-9_-]{2,79}\/(med|thumb)\/([^/]+)\.webp$/.exec(
                filePath
            );

        if (!imageMatch) {
            fail(`Path not permitted on contribution branch: ${filePath}`);
        }

        const basename = imageMatch[2];
        if (!IMAGE_BASENAME.test(basename)) {
            fail(`Unsafe image basename: ${basename}`);
        }

        imageFiles.push({ kind: imageMatch[1], basename, path: filePath });
    }

    if (!parkJsonPath) {
        fail("Expected exactly one park JSON file, found none.");
    }

    const medNames = new Set();
    const thumbNames = new Set();

    for (const image of imageFiles) {
        if (image.kind === "med") medNames.add(image.basename);
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

    if (medNames.size > 8 || imageFiles.length > 16) {
        fail("Too many submitted images; maximum is 8 med/thumb pairs.");
    }

    // Validate that every image referenced by the JSON exists and there are
    // no unreferenced images, and that the JSON id matches its filename.
    const parkJsonFullPath = path.join(process.cwd(), parkJsonPath);
    const park = JSON.parse(await fs.readFile(parkJsonFullPath, "utf8"));

    const expectedId = path.basename(parkJsonPath, ".json");
    if (park.id !== expectedId) {
        fail(`Park JSON id "${park.id}" does not match filename "${expectedId}".`);
    }

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

    console.log(
        `Contribution diff OK: 1 park JSON, ${imageFiles.length} images, path=${parkJsonPath}`
    );
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
