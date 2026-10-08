import fs from "node:fs/promises";
import path from "node:path";

const DIST = "dist";

const COPY_ENTRIES = [
    "index.html",
    "contribute.html",
    "css",
    "js",
    "assets/data/parks.json",
    "assets/images",
];

async function rmrf(target) {
    await fs.rm(target, { recursive: true, force: true });
}

async function copyEntry(entry, distDir) {
    const src = path.join(process.cwd(), entry);
    const dest = path.join(distDir, entry);

    const stat = await fs.stat(src).catch(() => null);
    if (!stat) return;

    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.cp(src, dest, { recursive: true });
}

async function main() {
    await rmrf(DIST);
    await fs.mkdir(DIST, { recursive: true });

    // Build the aggregate parks data first.
    await import("./build-parks.mjs");

    for (const entry of COPY_ENTRIES) {
        await copyEntry(entry, DIST);
    }

    if (process.env.CARTO_API_KEY) {
        const configPath = path.join(DIST, "js", "map-config.js");
        const configContent = `(function () {\n    window.PARK_MAP_CONFIG = Object.freeze({\n        cartoApiKey: ${JSON.stringify(process.env.CARTO_API_KEY)},\n    });\n})();\n`;
        await fs.writeFile(configPath, configContent, "utf8");
    }

    console.log(`Built site into ${DIST}/`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
