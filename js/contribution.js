import { districts, equipmentTypes } from "./contribution-catalog.js";

const IMAGE_LIMITS = {
    maxCount: 4,
    maxOriginalBytes: 12 * 1024 * 1024,
    maxSourcePixels: 40_000_000,

    med: {
        maxWidth: 800,
        maxHeight: 1200,
        maxBytes: 400 * 1024,
        initialQuality: 0.82,
    },

    thumb: {
        maxWidth: 200,
        maxHeight: 300,
        maxBytes: 80 * 1024,
        initialQuality: 0.76,
    },
};

const ACCEPTED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const HONG_KONG_BOUNDS = {
    latMin: 22.13,
    latMax: 22.58,
    lngMin: 113.82,
    lngMax: 114.52,
};

const submissionKey = crypto.randomUUID();
const startedAt = Date.now();

let map;
let marker;
let turnstileWidgetId = null;
const selectedEquipment = new Set();
const processedImages = [];

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    populateDistricts();
    populateEquipment();
    initMap();
    initImageUploader();
    initForm();
});

function initThemeToggle() {
    const root = document.documentElement;
    const button = document.getElementById("theme-toggle");
    const icon = document.getElementById("theme-icon");

    if (!button || !icon) return;

    const updateControl = () => {
        const isDark = root.dataset.theme === "dark";
        const actionLabel = isDark ? "切換至淺色模式" : "切換至深色模式";

        icon.textContent = isDark ? "☀" : "☾";
        button.setAttribute("aria-label", actionLabel);
        button.title = actionLabel;
    };

    const setTheme = (theme, persist = true) => {
        root.dataset.theme = theme;

        if (persist) {
            try {
                localStorage.setItem("park-theme", theme);
            } catch {
                // Storage may be unavailable in private browsing.
            }
        }

        updateControl();

        if (window.turnstile && turnstileWidgetId !== null) {
            window.turnstile.reset(turnstileWidgetId);
        }
    };

    button.addEventListener("click", () => {
        setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });

    updateControl();
}

function populateDistricts() {
    const select = document.getElementById("district");
    if (!select) return;

    for (const [code, names] of Object.entries(districts)) {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = `${names.zh} / ${names.en}`;
        select.appendChild(option);
    }
}

function populateEquipment() {
    const container = document.getElementById("equipment-options");
    if (!container) return;

    for (const type of equipmentTypes) {
        const label = document.createElement("label");
        label.className = "checkbox-label";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "equipment";
        input.value = type;

        input.addEventListener("change", () => {
            if (input.checked) {
                selectedEquipment.add(type);
            } else {
                selectedEquipment.delete(type);
            }
            rerenderImageRoleSelects();
        });

        const span = document.createElement("span");
        span.textContent = type;

        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
    }
}

function initMap() {
    const el = document.getElementById("contribution-map");
    if (!el || typeof L === "undefined") return;

    map = L.map(el, {
        zoomControl: true,
        attributionControl: false,
    }).setView([22.35, 114.06], 12);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
    }).addTo(map);

    map.on("click", (event) => {
        setCoords(event.latlng.lat, event.latlng.lng);
    });

    syncCoordsFromInputs();
}

function setCoords(lat, lng) {
    const latInput = document.getElementById("lat");
    const lngInput = document.getElementById("lng");

    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);

    if (!map) return;

    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: "#a6f16c",
            color: "#111510",
            weight: 4,
            fillOpacity: 1,
        }).addTo(map);
    }

    map.panTo([lat, lng]);
}

function syncCoordsFromInputs() {
    const latInput = document.getElementById("lat");
    const lngInput = document.getElementById("lng");

    if (!latInput || !lngInput) return;

    const update = () => {
        const lat = Number.parseFloat(latInput.value);
        const lng = Number.parseFloat(lngInput.value);

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= HONG_KONG_BOUNDS.latMin &&
            lat <= HONG_KONG_BOUNDS.latMax &&
            lng >= HONG_KONG_BOUNDS.lngMin &&
            lng <= HONG_KONG_BOUNDS.lngMax
        ) {
            setCoords(lat, lng);
        }
    };

    latInput.addEventListener("change", update);
    lngInput.addEventListener("change", update);
}

function initImageUploader() {
    const input = document.getElementById("image-input");
    if (!input) return;

    input.addEventListener("change", async () => {
        const files = Array.from(input.files || []);

        for (const file of files) {
            if (processedImages.length >= IMAGE_LIMITS.maxCount) {
                showFieldError("images-error", `最多只能上載 ${IMAGE_LIMITS.maxCount} 張相片。`);
                break;
            }

            try {
                const result = await processSourceImage(file);
                processedImages.push({
                    clientId: crypto.randomUUID(),
                    role: "park",
                    equipmentType: null,
                    med: result.med,
                    thumb: result.thumb,
                    previewUrl: URL.createObjectURL(result.med.blob),
                });
            } catch (error) {
                showFieldError("images-error", error.message);
            }
        }

        input.value = "";
        renderImagePreviews();
    });
}

function renderImagePreviews() {
    const list = document.getElementById("image-preview-list");
    if (!list) return;

    list.innerHTML = "";

    processedImages.forEach((image, index) => {
        const preview = document.createElement("div");
        preview.className = "image-preview";

        const img = document.createElement("img");
        img.src = image.previewUrl;
        img.alt = "已處理的相片預覽";

        const controls = document.createElement("div");

        const roleLabel = document.createElement("label");
        roleLabel.className = "form-label";
        roleLabel.textContent = "相片用途";

        const roleSelect = document.createElement("select");
        roleSelect.className = "select-input";
        roleSelect.dataset.index = String(index);

        const parkOption = document.createElement("option");
        parkOption.value = "park";
        parkOption.textContent = "公園整體相片";
        roleSelect.appendChild(parkOption);

        for (const type of selectedEquipment) {
            const option = document.createElement("option");
            option.value = `equipment:${type}`;
            option.textContent = `器材：${type}`;
            roleSelect.appendChild(option);
        }

        roleSelect.value =
            image.role === "park" ? "park" : `equipment:${image.equipmentType || ""}`;

        roleSelect.addEventListener("change", () => {
            const value = roleSelect.value;
            if (value === "park") {
                image.role = "park";
                image.equipmentType = null;
            } else {
                image.role = "equipment";
                image.equipmentType = value.slice("equipment:".length);
            }
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "button-tertiary";
        removeButton.textContent = "移除相片";
        removeButton.addEventListener("click", () => {
            URL.revokeObjectURL(image.previewUrl);
            processedImages.splice(index, 1);
            renderImagePreviews();
        });

        controls.appendChild(roleLabel);
        controls.appendChild(roleSelect);
        controls.appendChild(removeButton);

        preview.appendChild(img);
        preview.appendChild(controls);
        list.appendChild(preview);
    });
}

function rerenderImageRoleSelects() {
    renderImagePreviews();
}

function initForm() {
    const form = document.getElementById("contribution-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleSubmit(form);
    });

    renderTurnstile();
}

function renderTurnstile() {
    if (typeof window.turnstile === "undefined") {
        window.addEventListener("load", renderTurnstile, { once: true });
        return;
    }

    turnstileWidgetId = window.turnstile.render("#turnstile-container", {
        sitekey: window.PARK_CONTRIBUTION_CONFIG.turnstileSiteKey,
        action: "park_contribution",
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    });
}

function clearAllFieldErrors() {
    document.querySelectorAll(".field-error").forEach((el) => {
        el.hidden = true;
        el.textContent = "";
    });

    document.querySelectorAll("[aria-invalid]").forEach((el) => {
        el.removeAttribute("aria-invalid");
    });
}

function showFieldError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = message;
    el.hidden = false;
}

function setInvalid(fieldId, invalid) {
    const el = document.getElementById(fieldId);
    if (!el) return;

    if (invalid) {
        el.setAttribute("aria-invalid", "true");
    } else {
        el.removeAttribute("aria-invalid");
    }
}

function validateForm() {
    clearAllFieldErrors();

    const errors = [];
    let firstInvalidId = null;

    const nameZh = document.getElementById("name-zh").value.trim();
    if (nameZh.length < 2 || nameZh.length > 100) {
        showFieldError("name-zh-error", "請填寫 2–100 個字元的中文名稱。");
        setInvalid("name-zh", true);
        errors.push("name-zh");
        if (!firstInvalidId) firstInvalidId = "name-zh";
    }

    const nameEn = document.getElementById("name-en").value.trim();
    if (nameEn.length > 120) {
        showFieldError("name-en-error", "英文名稱最多 120 個字元。");
        setInvalid("name-en", true);
        errors.push("name-en");
        if (!firstInvalidId) firstInvalidId = "name-en";
    }

    const district = document.getElementById("district").value;
    if (!district || !districts[district]) {
        showFieldError("district-error", "請選擇地區。");
        setInvalid("district", true);
        errors.push("district");
        if (!firstInvalidId) firstInvalidId = "district";
    }

    const addressZh = document.getElementById("address-zh").value.trim();
    if (addressZh.length < 3 || addressZh.length > 200) {
        showFieldError("address-zh-error", "請填寫 3–200 個字元的中文地址。");
        setInvalid("address-zh", true);
        errors.push("address-zh");
        if (!firstInvalidId) firstInvalidId = "address-zh";
    }

    const addressEn = document.getElementById("address-en").value.trim();
    if (addressEn.length > 240) {
        showFieldError("address-en-error", "英文地址最多 240 個字元。");
        setInvalid("address-en", true);
        errors.push("address-en");
        if (!firstInvalidId) firstInvalidId = "address-en";
    }

    const lat = Number.parseFloat(document.getElementById("lat").value);
    const lng = Number.parseFloat(document.getElementById("lng").value);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < HONG_KONG_BOUNDS.latMin ||
        lat > HONG_KONG_BOUNDS.latMax ||
        lng < HONG_KONG_BOUNDS.lngMin ||
        lng > HONG_KONG_BOUNDS.lngMax
    ) {
        showFieldError("lat-error", "請在地圖上選擇香港範圍內的位置。");
        showFieldError("lng-error", "請在地圖上選擇香港範圍內的位置。");
        setInvalid("lat", true);
        setInvalid("lng", true);
        errors.push("lat");
        if (!firstInvalidId) firstInvalidId = "lat";
    }

    for (const image of processedImages) {
        if (image.role === "equipment" && !selectedEquipment.has(image.equipmentType)) {
            showFieldError("images-error", "相片指定的器材類型未被選取。");
            errors.push("images");
            if (!firstInvalidId) firstInvalidId = "images";
            break;
        }
    }

    const comment = document.getElementById("comment").value;
    if (comment.length > 2000) {
        showFieldError("comment-error", "備註最多 2,000 個字元。");
        setInvalid("comment", true);
        errors.push("comment");
        if (!firstInvalidId) firstInvalidId = "comment";
    }

    const accurate = document.getElementById("attest-accurate").checked;
    const imageRights = document.getElementById("attest-image-rights").checked;
    const publicSubmission = document.getElementById("attest-public").checked;

    if (!accurate) {
        showFieldError("attest-accurate-error", "請確認資料準確。");
        errors.push("attest-accurate");
        if (!firstInvalidId) firstInvalidId = "attest-accurate";
    }

    if (!imageRights) {
        showFieldError("attest-image-rights-error", "請確認相片使用權。");
        errors.push("attest-image-rights");
        if (!firstInvalidId) firstInvalidId = "attest-image-rights";
    }

    if (!publicSubmission) {
        showFieldError("attest-public-error", "請確認投稿會公開。");
        errors.push("attest-public");
        if (!firstInvalidId) firstInvalidId = "attest-public";
    }

    return { valid: errors.length === 0, firstInvalidId, errors };
}

async function handleSubmit(form) {
    const submitButton = document.getElementById("submit-button");
    const status = document.getElementById("submit-status");
    const errorSummary = document.getElementById("error-summary");

    const validation = validateForm();

    if (!validation.valid) {
        errorSummary.hidden = false;
        errorSummary.textContent = "表格有部分資料需要修正，請檢查以下欄位後再試。";
        const firstEl = document.getElementById(validation.firstInvalidId);
        if (firstEl) firstEl.focus();
        return;
    }

    errorSummary.hidden = true;
    errorSummary.textContent = "";

    if (typeof window.turnstile === "undefined" || turnstileWidgetId === null) {
        status.textContent = "人機驗證尚未準備好，請稍候再試。";
        return;
    }

    const turnstileToken = window.turnstile.getResponse(turnstileWidgetId);
    if (!turnstileToken) {
        status.textContent = "請先完成人機驗證。";
        return;
    }

    const payload = await buildPayload(turnstileToken);

    const serialized = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(serialized).byteLength;

    if (payloadBytes > 2.8 * 1024 * 1024) {
        status.textContent = "投稿資料太大，請移除部分相片後再試。";
        return;
    }

    submitButton.disabled = true;
    status.textContent = "正在建立投稿 Pull Request…";

    try {
        const response = await fetch(window.PARK_CONTRIBUTION_CONFIG.apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: serialized,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "未能提交資料。");
        }

        showSuccess(result);
    } catch (error) {
        status.textContent = error.message || "未能提交資料。";
        window.turnstile.reset(turnstileWidgetId);
    } finally {
        submitButton.disabled = false;
    }
}

async function buildPayload(turnstileToken) {
    const images = [];

    for (const image of processedImages) {
        images.push({
            clientId: image.clientId,
            role: image.role,
            equipmentType: image.role === "equipment" ? image.equipmentType : null,
            med: {
                mime: "image/webp",
                width: image.med.width,
                height: image.med.height,
                byteLength: image.med.blob.size,
                base64: await blobToBase64(image.med.blob),
            },
            thumb: {
                mime: "image/webp",
                width: image.thumb.width,
                height: image.thumb.height,
                byteLength: image.thumb.blob.size,
                base64: await blobToBase64(image.thumb.blob),
            },
        });
    }

    return {
        submissionVersion: 1,
        submissionKey,
        startedAt,
        website: document.getElementById("website").value,
        turnstileToken,
        park: {
            name: {
                zh: document.getElementById("name-zh").value.trim(),
                en: document.getElementById("name-en").value.trim(),
            },
            districtCode: document.getElementById("district").value,
            address: {
                zh: document.getElementById("address-zh").value.trim(),
                en: document.getElementById("address-en").value.trim(),
            },
            coords: {
                lat: Number.parseFloat(document.getElementById("lat").value),
                lng: Number.parseFloat(document.getElementById("lng").value),
            },
            equipment: Array.from(selectedEquipment),
            comment: document.getElementById("comment").value,
        },
        images,
        attestations: {
            accurate: document.getElementById("attest-accurate").checked,
            imageRights: document.getElementById("attest-image-rights").checked,
            publicSubmission: document.getElementById("attest-public").checked,
        },
    };
}

function showSuccess(result) {
    const form = document.getElementById("contribution-form");
    const status = document.getElementById("submit-status");

    const panel = document.createElement("div");
    panel.className = "form-message form-message--success";
    panel.setAttribute("role", "status");

    const heading = document.createElement("h2");
    heading.textContent = "投稿已建立";

    const text = document.createElement("p");
    text.textContent = "你的投稿 Pull Request 已建立，待管理員審核。";

    const link = document.createElement("a");
    link.href = result.pullRequestUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "button-primary";
    link.textContent = "查看 Pull Request";

    panel.appendChild(heading);
    panel.appendChild(text);
    panel.appendChild(link);

    form.replaceWith(panel);
    status.textContent = "";
}

/* =========================================================
   Image processing
   ========================================================= */

function fitInside(sourceWidth, sourceHeight, maxWidth, maxHeight) {
    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);

    return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale)),
    };
}

function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("此瀏覽器無法建立 WebP 圖片。"));
                    return;
                }

                resolve(blob);
            },
            "image/webp",
            quality
        );
    });
}

async function encodeWebp(bitmap, options) {
    let dimensions = fitInside(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);

    for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt++) {
        const canvas = document.createElement("canvas");
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        for (let quality = options.initialQuality; quality >= 0.52; quality -= 0.06) {
            const blob = await canvasToBlob(canvas, quality);

            if (blob.size <= options.maxBytes) {
                return {
                    blob,
                    width: canvas.width,
                    height: canvas.height,
                };
            }
        }

        dimensions = {
            width: Math.max(1, Math.round(dimensions.width * 0.85)),
            height: Math.max(1, Math.round(dimensions.height * 0.85)),
        };
    }

    throw new Error("圖片無法壓縮至上載大小限制。");
}

async function processSourceImage(file) {
    if (!ACCEPTED_SOURCE_TYPES.has(file.type)) {
        throw new Error("只接受 JPEG、PNG 或 WebP 圖片。");
    }

    if (file.size > IMAGE_LIMITS.maxOriginalBytes) {
        throw new Error("原始圖片不可超過 12 MB。");
    }

    const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
    });

    try {
        if (bitmap.width * bitmap.height > IMAGE_LIMITS.maxSourcePixels) {
            throw new Error("圖片解像度過高。");
        }

        const med = await encodeWebp(bitmap, IMAGE_LIMITS.med);
        const thumb = await encodeWebp(bitmap, IMAGE_LIMITS.thumb);

        return { med, thumb };
    } finally {
        bitmap.close();
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener("load", () => {
            const result = String(reader.result);
            resolve(result.slice(result.indexOf(",") + 1));
        });

        reader.addEventListener("error", () => {
            reject(new Error("無法讀取處理後的圖片。"));
        });

        reader.readAsDataURL(blob);
    });
}
