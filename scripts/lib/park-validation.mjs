// Shared park-record validation used by both the data validator and the
// contribution diff validator. Kept dependency-free so it can run in CI
// without the frontend toolchain.

const SAFE_ID = /^[a-z0-9][a-z0-9_-]{2,79}$/i;
const SAFE_BASENAME = /^[a-z0-9_-]+$/;
const REMOTE_URL = /^https?:\/\//i;

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

export function isValidImageName(value) {
    return SAFE_BASENAME.test(value) || REMOTE_URL.test(value);
}

export function validatePark(park, { fail }) {
    if (!park || typeof park !== "object") {
        fail("Park record is not an object");
    }

    if (typeof park.id !== "string" || !SAFE_ID.test(park.id)) {
        fail(`Unsafe or missing park id: ${park.id}`);
    }

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
}

export { SAFE_ID, SAFE_BASENAME, DISTRICT_CODES, EQUIPMENT_TYPES };
