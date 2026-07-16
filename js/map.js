export let map, markerLayer, userMarker;

export function initMap(id) {
    map = L.map(id, {
        zoomControl: false,
        attributionControl: false,
    }).setView([22.35, 114.06], 12);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
    }).addTo(map);

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
