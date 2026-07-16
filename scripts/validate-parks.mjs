import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_DIRECTORY = "data/parks";

const SAFE_ID = /^[a-z0-9][a-z0-9_-]{2,79}$/i;
const SAFE_BASENAME = /^[a-z0-9_-]+$/;
const REMOTE_URL = /^https?:\/\//i;

function isValidImageName(value) {
    return SAFE_BASENAME.test(value) || REMOTE_URL.test(value);
}

const DISTRICT_CODES = new Set([
    "central_western",
    "wan_chai",
    "eastern",
    "southern",
    "yau_tsim_mong",
    "sham_shui_po",
    "kowloon_city",
    "wong_tai_sin",
    "kwun_tong",
    "kwai_tsing",
    "tsuen_wan",
    "tuen_mun",
    "yuen_long",
    "north",
    "tai_po",
    "sha_tin",
    "sai_kung",
    "islands",
]);

const EQUIPMENT_TYPES = new Set([
    "high_pull_up_bar",
    "low_bar",
    "parallel_bars",
    "monkey_bars",
    "sit_up_bench",
    "others",
]);

function fail(message) {
    console.error(`Validation failed: ${message}`);
    process.exit(1);
}

function normalizeName(value = "") {
    return value
        .normalize("NFKC")
        .trim()
        .toLocaleLowerCase("zh-HK")
        .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function getHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function main() {
    const entries = await fs.readdir(SOURCE_DIRECTORY, { withFileTypes: true });
    const parks = [];

    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

        const file = path.join(SOURCE_DIRECTORY, entry.name);
        const park = JSON.parse(await fs.readFile(file, "utf8"));
        parks.push(park);
    }

    const seenIds = new Set();
    const seenZh = new Map();
    const seenEn = new Map();

    for (const park of parks) {
        if (!SAFE_ID.test(park.id)) {
            fail(`Unsafe park id: ${park.id}`);
        }

        if (seenIds.has(park.id)) {
            fail(`Duplicate park id: ${park.id}`);
        }
        seenIds.add(park.id);

        if (!park.name || typeof park.name.zh !== "string" || park.name.zh.length < 2) {
            fail(`Missing or invalid Chinese name for ${park.id}`);
        }

        if (!DISTRICT_CODES.has(park.districtCode) && !park.district) {
            fail(`Missing district for ${park.id}`);
        }

        if (park.district && (!park.district.zh || !park.district.en)) {
            fail(`Incomplete district object for ${park.id}`);
        }

        if (
            !park.coords ||
            typeof park.coords.lat !== "number" ||
            typeof park.coords.lng !== "number"
        ) {
            fail(`Missing coordinates for ${park.id}`);
        }

        if (!Array.isArray(park.equipment)) {
            fail(`Equipment must be an array for ${park.id}`);
        }

        for (const eq of park.equipment) {
            if (!EQUIPMENT_TYPES.has(eq.type)) {
                fail(`Unknown equipment type "${eq.type}" in ${park.id}`);
            }
            if (!Array.isArray(eq.images)) {
                fail(`Equipment images must be an array in ${park.id}`);
            }
            for (const img of eq.images) {
                if (!isValidImageName(img)) {
                    fail(`Unsafe equipment image name "${img}" in ${park.id}`);
                }
            }
        }

        if (!Array.isArray(park.park_images)) {
            fail(`park_images must be an array for ${park.id}`);
        }
        for (const img of park.park_images) {
            if (!isValidImageName(img)) {
                fail(`Unsafe park image name "${img}" in ${park.id}`);
            }
        }

        const normZh = normalizeName(park.name.zh);
        if (seenZh.has(normZh)) {
            console.warn(
                `Warning: duplicate normalized Chinese name "${park.name.zh}" in ${park.id} (also ${seenZh.get(
                    normZh,
                )})`,
            );
        }
        seenZh.set(normZh, park.id);

        if (park.name.en) {
            const normEn = normalizeName(park.name.en);
            if (seenEn.has(normEn)) {
                console.warn(
                    `Warning: duplicate normalized English name "${park.name.en}" in ${park.id} (also ${seenEn.get(
                        normEn,
                    )})`,
                );
            }
            seenEn.set(normEn, park.id);
        }
    }

    // Coordinate-based duplicate detection.
    for (let i = 0; i < parks.length; i++) {
        for (let j = i + 1; j < parks.length; j++) {
            const a = parks[i];
            const b = parks[j];
            const distance = getHaversine(
                a.coords.lat,
                a.coords.lng,
                b.coords.lat,
                b.coords.lng,
            );

            const sameName =
                normalizeName(a.name.zh) === normalizeName(b.name.zh) ||
                (a.name.en &&
                    b.name.en &&
                    normalizeName(a.name.en) === normalizeName(b.name.en));

            if (distance < 0.1 && sameName) {
                console.warn(
                    `Warning: parks ${a.id} and ${b.id} share a name and are within 100m (${distance.toFixed(
                        3,
                    )} km).`,
                );
            }

            if (distance < 0.003) {
                console.warn(
                    `Warning: parks ${a.id} and ${b.id} are within 3m (${distance.toFixed(
                        4,
                    )} km) of each other.`,
                );
            }
        }
    }

    console.log(`Validated ${parks.length} parks.`);
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
