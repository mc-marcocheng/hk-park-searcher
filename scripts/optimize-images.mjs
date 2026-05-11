import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const ORIGINALS_DIR = "_originals";
const OUTPUT_DIR = "assets/images/parks";

const SIZES = [
    { name: "thumb", width: 200, quality: 75 },
    { name: "med", width: 800, quality: 80 },
];

const SUPPORTED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

async function processImage(srcPath, parkId, baseName) {
    const input = await fs.readFile(srcPath);

    for (const size of SIZES) {
        const outDir = path.join(OUTPUT_DIR, parkId, size.name);
        const outFile = path.join(outDir, `${baseName}.webp`);

        try {
            const srcStat = await fs.stat(srcPath);
            const outStat = await fs.stat(outFile);
            if (outStat.mtimeMs >= srcStat.mtimeMs) {
                console.log(`  skip ${size.name}/${baseName}.webp (up to date)`);
                continue;
            }
        } catch {
            // Output doesn't exist yet — proceed
        }

        await fs.mkdir(outDir, { recursive: true });

        await sharp(input)
            .resize({ width: size.width, withoutEnlargement: true })
            .webp({ quality: size.quality })
            .toFile(outFile);

        const outStat = await fs.stat(outFile);
        const kb = (outStat.size / 1024).toFixed(1);
        console.log(`  ${size.name}/${baseName}.webp (${kb} KB)`);
    }
}

async function getDirSize(dir) {
    let size = 0;
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                size += await getDirSize(fullPath);
            } else {
                size += (await fs.stat(fullPath)).size;
            }
        }
    } catch {
        /* dir doesn't exist */
    }
    return size;
}

async function run() {
    const clean = process.argv.includes("--clean");

    if (clean) {
        console.log("Cleaning output directory...");
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
    }

    let totalOriginal = 0;

    const parkDirs = await fs.readdir(ORIGINALS_DIR);

    for (const parkId of parkDirs) {
        const parkDir = path.join(ORIGINALS_DIR, parkId);
        const stat = await fs.stat(parkDir);
        if (!stat.isDirectory()) continue;

        console.log(`\n${parkId}`);
        const files = await fs.readdir(parkDir);

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!SUPPORTED_EXT.has(ext)) continue;

            const baseName = path.basename(file, ext);
            const srcPath = path.join(parkDir, file);
            const srcStat = await fs.stat(srcPath);
            totalOriginal += srcStat.size;

            await processImage(srcPath, parkId, baseName);
        }
    }

    const totalOutput = await getDirSize(OUTPUT_DIR);

    console.log("\n---------------------------------");
    console.log(`Originals: ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
    console.log(`Optimized: ${(totalOutput / 1024 / 1024).toFixed(1)} MB`);
    if (totalOriginal > 0) {
        console.log(
            `Saved:     ${(((totalOriginal - totalOutput) / totalOriginal) * 100).toFixed(0)}%`,
        );
    }
}

run().catch(console.error);
