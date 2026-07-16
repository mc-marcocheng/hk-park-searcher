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

function parseRef(headRef) {
    const match = /^contribution\/(park-\d{8}-[a-f0-9]{8})$/.exec(headRef || "");
    if (!match) {
        fail(`Unexpected contribution branch name: ${headRef}`);
    }
    return match[1];
}

async function getDiff(base, head) {
    const { stdout } = await execFileAsync(
        "git",
        ["diff", "--name-status", base, head],
        { maxBuffer: 10 * 1024 * 1024 },
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

function buildAllowedPaths(id) {
    const paths = new Set([`data/parks/${id}.json`]);
    for (const kind of ["med", "thumb"]) {
        paths.add(`assets/images/parks/${id}/${kind}`);
    }
    return paths;
}

async function main() {
    if (!BASE_SHA || !HEAD_SHA || !HEAD_REF) {
        fail("BASE_SHA, HEAD_SHA and HEAD_REF must be provided.");
    }

    const id = parseRef(HEAD_REF);
    if (!SAFE_NAME.test(id)) {
        fail(`Unsafe submission id: ${id}`);
    }

    const allowed = buildAllowedPaths(id);
    const changes = await getDiff(BASE_SHA, HEAD_SHA);

    let parkJsonCount = 0;
    const imageFiles = [];
    const seenPaths = new Set();

    for (const change of changes) {
        const { status, path: filePath } = change;

        if (status === "D") {
            fail(`Deletion not allowed: ${filePath}`);
        }

        if (status === "R") {
            fail(`Rename not allowed: ${filePath}`);
        }

        if (status !== "A" && status !== "M") {
            fail(`Unsupported change status "${status}" for ${filePath}`);
        }

        if (seenPaths.has(filePath)) {
            fail(`Duplicate path entry: ${filePath}`);
        }
        seenPaths.add(filePath);

        if (filePath === `data/parks/${id}.json`) {
            parkJsonCount++;
            continue;
        }

        const imageMatch = new RegExp(
            `^assets/images/parks/${id}/(med|thumb)/([^/]+)\\.webp$`,
        ).exec(filePath);

        if (!imageMatch) {
            fail(`Path not permitted on contribution branch: ${filePath}`);
        }

        const kind = imageMatch[1];
        const basename = imageMatch[2];

        if (!IMAGE_BASENAME.test(basename)) {
            fail(`Unsafe image basename: ${basename}`);
        }

        imageFiles.push({ kind, basename, path: filePath });
    }

    if (parkJsonCount !== 1) {
        fail(`Expected exactly one park JSON file, found ${parkJsonCount}.`);
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

    if (imageFiles.length > 8) {
        fail(`Too many image files: ${imageFiles.length} (max 8).`);
    }

    // Validate that every image referenced by the JSON exists and there are
    // no unreferenced images.
    const parkJsonPath = path.join(process.cwd(), `data/parks/${id}.json`);
    const park = JSON.parse(await fs.readFile(parkJsonPath, "utf8"));

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
        `Contribution diff OK: 1 park JSON, ${imageFiles.length} images, id=${id}`,
    );
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
