export let map, markerLayer, userMarker;

export function createTileLayer() {
    const cartoKey =
        (typeof window !== "undefined" &&
            (window.PARK_MAP_CONFIG?.cartoApiKey ||
                window.CARTO_API_KEY ||
                window.localStorage?.getItem("carto_api_key"))) ||
        "";

    if (cartoKey) {
        return L.tileLayer(
            `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
            {
                maxZoom: 20,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
            }
        );
    }

    return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });
}

export function initMap(id) {
    map = L.map(id, {
        zoomControl: false,
    }).setView([22.35, 114.06], 12);

    createTileLayer().addTo(map);

    markerLayer = L.layerGroup().addTo(map);
}

export function renderMarkers(parks) {
    markerLayer.clearLayers();

    parks.forEach((p) => {
        const marker = L.circleMarker([p.coords.lat, p.coords.lng], {
            radius: 8,
            fillColor: "#a6f16c",
            color: "#111510",
            weight: 2,
            fillOpacity: 1,
        });

        marker.bindTooltip(p.name?.zh || p.name?.en || "公園", {
            direction: "top",
            offset: [0, -8],
        });

        marker.on("click", () => window.openModal(p.id));
        markerLayer.addLayer(marker);
    });
}

export function updateLocationMarker(lat, lng) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }

    userMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: "#111510",
        color: "#a6f16c",
        weight: 4,
        fillOpacity: 1,
    }).addTo(map);

    userMarker.bindTooltip("您的位置", {
        permanent: false,
        direction: "top",
        offset: [0, -10],
    });

    map.flyTo([lat, lng], 14);
}
