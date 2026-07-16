import fs from "node:fs/promises";
import path from "node:path";

const sourceDirectory = "data/parks";
const outputFile = "assets/data/parks.json";

const entries = await fs.readdir(sourceDirectory, { withFileTypes: true });
const parks = [];

for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    const file = path.join(sourceDirectory, entry.name);
    const park = JSON.parse(await fs.readFile(file, "utf8"));
    parks.push(park);
}

// Sort by id (stable, content-derived) so that adding or editing a single
// park produces a minimal git diff instead of reordering the whole file.
parks.sort((a, b) => {
    const left = a.id || "";
    const right = b.id || "";
    return left.localeCompare(right, "en");
});

await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, `${JSON.stringify(parks, null, 4)}\n`);

console.log(`Built ${outputFile} with ${parks.length} parks.`);
