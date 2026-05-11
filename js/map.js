let map, markerLayer, userMarker;

function initMap(id) {
    map = L.map(id, { zoomControl: false, attributionControl: false }).setView([22.35, 114.06], 12);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png").addTo(
        map
    );

    markerLayer = L.layerGroup().addTo(map);
}

function renderMarkers(parks) {
    markerLayer.clearLayers();
    parks.forEach((p) => {
        const m = L.circleMarker([p.coords.lat, p.coords.lng], {
            radius: 8,
            fillColor: "#2563eb",
            color: "#fff",
            weight: 2,
            fillOpacity: 1,
        });
        m.on("click", () => openModal(p.id));
        markerLayer.addLayer(m);
    });
}

function updateLocationMarker(lat, lng) {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lng]).addTo(map);
    map.flyTo([lat, lng], 14);
}
