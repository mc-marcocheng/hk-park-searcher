import fs from "node:fs/promises";
import path from "node:path";

const source = "assets/data/parks.json";
const targetDirectory = "data/parks";

const parks = JSON.parse(await fs.readFile(source, "utf8"));
await fs.mkdir(targetDirectory, { recursive: true });

for (const park of parks) {
    if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(park.id)) {
        throw new Error(`Unsafe park ID: ${park.id}`);
    }

    const target = path.join(targetDirectory, `${park.id}.json`);
    await fs.writeFile(target, `${JSON.stringify(park, null, 4)}\n`);
}

console.log(`Migrated ${parks.length} parks.`);
