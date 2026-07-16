import { parksData } from "./data.js";
import { getEquipmentName } from "./dict.js";

// Modal Gallery State
let currentModalImages = [];
let currentImageIndex = 0;

function buildImagePath(parkId, imgName, size = "med") {
    if (imgName.startsWith("http")) return imgName;
    return `./assets/images/parks/${parkId}/${size}/${imgName}.webp`;
}

function placeholderImage(text = "No Image") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#e2e8f0" width="400" height="300"/><text x="200" y="155" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="16">${text}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function renderList(parks, newlyAdded = []) {
    const container = document.getElementById("park-list");

    if (parks.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-sm font-bold text-slate-500">無符合的公園</div>`;
        return;
    }

    const isNewLoad = newlyAdded.length === 0;

    if (isNewLoad) {
        container.innerHTML = parks.map((p) => createParkCardHTML(p, false)).join("");
    } else {
        // Append only newly added cards with animation
        const newCards = newlyAdded.map((p) => createParkCardHTML(p, true)).join("");
        container.insertAdjacentHTML("beforeend", newCards);
    }
}

function createParkCardHTML(p, animate = false) {
    const thumbSrc =
        p.park_images && p.park_images.length > 0
            ? buildImagePath(p.id, p.park_images[0], "thumb")
            : placeholderImage();

    const district = p.district?.zh || p.district?.en || "未知";
    const parkName = p.name?.zh || p.name?.en || "未命名公園";
    const englishName = p.name?.en || "";
    const animateClass = animate ? " animate-new" : "";

    const distanceHTML = Number.isFinite(p.distance)
        ? `<p class="park-distance mt-1">距離 ${p.distance.toFixed(2)} 公里</p>`
        : "";

    return `
        <button
            type="button"
            class="park-card${animateClass}"
            onclick="openModal('${p.id}')"
            aria-label="查看 ${parkName} 詳情"
        >
            <div class="h-20 w-20 flex-shrink-0 overflow-hidden">
                <img
                    src="${thumbSrc}"
                    loading="lazy"
                    decoding="async"
                    width="80"
                    height="80"
                    alt="${parkName}"
                    class="h-full w-full object-cover"
                >
            </div>

            <div class="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                <h3 class="truncate">${parkName}</h3>
                <p class="truncate">${englishName}${englishName ? " · " : ""}${district}</p>
                ${distanceHTML}
            </div>

            <span class="sr-only">開啟公園資料</span>
        </button>
    `;
}

export function renderScrollFooter(totalItems, displayedCount, isLoading) {
    const container = document.getElementById("pagination");

    if (totalItems === 0) {
        container.innerHTML = `
            <div class="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span>0 筆結果</span>
            </div>
        `;
        return;
    }

    if (isLoading) {
        // Show loading indicator only when actively loading
        container.innerHTML = `
            <div
                class="flex items-center justify-center gap-2 text-xs text-slate-500"
                role="status"
                aria-live="polite"
            >
                <span class="loading-spinner" aria-hidden="true"></span>
                <span>載入中...</span>
            </div>
        `;
    } else if (displayedCount >= totalItems) {
        // Show "no more results" message
        container.innerHTML = `
            <div class="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span>共 ${totalItems} 筆結果</span>
            </div>
        `;
    } else {
        // Hide footer when there are more items to load
        container.innerHTML = "";
    }
}

export function openModal(id) {
    const p = parksData.find((x) => x.id === id);
    if (!p) return;

    const modal = document.getElementById("park-modal");
    const content = document.getElementById("modal-content");

    // Build Gallery: Park Images First
    currentModalImages = [];
    if (p.park_images)
        p.park_images.forEach((img) => currentModalImages.push(buildImagePath(p.id, img, "med")));
    if (p.equipment) {
        p.equipment.forEach((eq) => {
            if (eq.images)
                eq.images.forEach((img) => {
                    const path = buildImagePath(p.id, img, "med");
                    if (!currentModalImages.includes(path)) currentModalImages.push(path);
                });
        });
    }
    if (currentModalImages.length === 0) currentModalImages.push(placeholderImage());

    currentImageIndex = 0;

    const district = p.district?.zh || "";
    const address = p.address?.zh || "";

    const equipmentHTML =
        p.equipment && p.equipment.length > 0
            ? p.equipment
                  .map((e) => {
                      const zhName = getEquipmentName(e.type);
                      const firstImg =
                          e.images && e.images.length > 0
                              ? buildImagePath(p.id, e.images[0], "med")
                              : null;
                      const clickAction = firstImg ? `onclick="jumpToImage('${firstImg}')"` : "";
                      return `<button ${clickAction} class="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm font-extrabold text-blue-900 shadow-sm transition hover:bg-blue-100 text-left whitespace-nowrap">
                ${zhName}
            </button>`;
                  })
                  .join("")
            : `<p class="text-sm text-slate-500">無器材記錄</p>`;

    content.innerHTML = `
        <div class="relative h-80 w-full bg-slate-900 md:h-[450px] overflow-hidden">
            <img id="modal-main-img" src="${currentModalImages[0]}" class="h-full w-full object-cover transition-opacity duration-200">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none"></div>

            ${
                currentModalImages.length > 1
                    ? `
                <div class="absolute inset-0 flex items-center justify-between px-4 z-30 pointer-events-none">
                    <button
                        type="button"
                        onclick="prevModalImage()"
                        aria-label="上一張相片"
                        class="pointer-events-auto rounded-full bg-black/30 p-3 text-white backdrop-blur-md transition hover:bg-black/60 focus:outline-none"
                    >
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button
                        type="button"
                        onclick="nextModalImage()"
                        aria-label="下一張相片"
                        class="pointer-events-auto rounded-full bg-black/30 p-3 text-white backdrop-blur-md transition hover:bg-black/60 focus:outline-none"
                    >
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
                <div class="absolute bottom-6 right-8 z-30 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md" id="modal-img-counter">
                    1 / ${currentModalImages.length}
                </div>
            `
                    : ""
            }

            <div class="absolute bottom-6 left-8 z-20 text-white pr-24">
                <h2 id="modal-title" class="text-3xl font-black drop-shadow-xl leading-tight">${p.name.zh || p.name.en}</h2>
                <p class="text-base font-bold opacity-80">${p.name.en || ""}</p>
            </div>
        </div>

        <div class="p-8">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <p class="text-xl font-black text-slate-800">${district}</p>
                    <p class="text-base font-bold text-slate-600">${address}</p>
                </div>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${p.coords.lat},${p.coords.lng}" target="_blank"
                   class="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-xl transition hover:bg-blue-700">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                    開始導航
                </a>
            </div>

            <div class="mt-10 space-y-6">
                <h4 class="flex items-center gap-2 text-sm font-black text-slate-800">
                    <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    場內器材
                </h4>
                <div class="flex flex-wrap gap-3">
                    ${equipmentHTML}
                </div>
                ${
                    p.comment
                        ? `
                    <div class="mt-6 rounded-2xl bg-slate-50 p-5 border border-slate-200">
                        <div class="prose prose-sm prose-slate max-w-none text-slate-700 font-medium">
                            ${DOMPurify.sanitize(marked.parse(p.comment))}
                        </div>
                    </div>
                `
                        : ""
                }
            </div>
        </div>
    `;
    document.body.classList.add("modal-open");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

/**
 * Updates the image source and the text counter in the modal
 */
function updateModalImageDisplay() {
    const imgEl = document.getElementById("modal-main-img");
    const counterEl = document.getElementById("modal-img-counter");

    if (imgEl && currentModalImages.length > 0) {
        // Fade effect for smoother transition
        imgEl.style.opacity = "0.5";
        setTimeout(() => {
            imgEl.src = currentModalImages[currentImageIndex];
            imgEl.style.opacity = "1";
        }, 50);
    }

    if (counterEl) {
        counterEl.innerText = `${currentImageIndex + 1} / ${currentModalImages.length}`;
    }
}

/**
 * Moves to the next image in the array
 */
export function nextModalImage() {
    if (currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentModalImages.length;
    updateModalImageDisplay();
}

/**
 * Moves to the previous image in the array
 */
export function prevModalImage() {
    if (currentModalImages.length <= 1) return;
    currentImageIndex =
        (currentImageIndex - 1 + currentModalImages.length) % currentModalImages.length;
    updateModalImageDisplay();
}

/**
 * Jumps to a specific image and scrolls the modal up
 */
export function jumpToImage(imgUrl) {
    const idx = currentModalImages.indexOf(imgUrl);
    if (idx !== -1) {
        currentImageIndex = idx;
        updateModalImageDisplay();

        const modalContent = document.getElementById("modal-content");
        if (modalContent) {
            modalContent.scrollTo({ top: 0, behavior: "smooth" });
        }
    }
}

export function closeModal() {
    const modal = document.getElementById("park-modal");
    document.body.classList.remove("modal-open");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

// Attach to window for inline HTML onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.prevModalImage = prevModalImage;
window.nextModalImage = nextModalImage;
window.jumpToImage = jumpToImage;

document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("park-modal");
    if (!modal || modal.classList.contains("hidden")) return;

    if (event.key === "Escape") {
        closeModal();
    } else if (event.key === "ArrowLeft") {
        prevModalImage();
    } else if (event.key === "ArrowRight") {
        nextModalImage();
    }
});
