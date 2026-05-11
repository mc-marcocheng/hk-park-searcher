export let parksData = [];

export async function fetchParks() {
    try {
        const res = await fetch("./assets/data/parks.json");
        parksData = await res.json();
    } catch (e) {
        console.error("Data load failed", e);
    }
}

export function calculateDistances(lat, lng) {
    parksData.forEach((p) => {
        p.distance = getHaversine(lat, lng, p.coords.lat, p.coords.lng);
    });
    parksData.sort((a, b) => a.distance - b.distance);
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
