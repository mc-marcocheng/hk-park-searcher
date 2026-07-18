(function () {
    const DEPLOYED_API = "https://hk-park-searcher.vercel.app/api/submissions";
    const DEPLOYED_PARK_API = "https://hk-park-searcher.vercel.app/api/park";

    // When the page is served from localhost, point at the local backend
    // (started with `npm run start` in backend/) so requests are not blocked
    // by the deployed API's CORS allow-list. The local backend accepts
    // localhost origins and any non-empty Turnstile token.
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";

    const apiUrl = isLocal ? "http://localhost:3000/api/submissions" : DEPLOYED_API;
    const parkApiUrl = isLocal ? "http://localhost:3000/api/park" : DEPLOYED_PARK_API;

    window.PARK_CONTRIBUTION_CONFIG = Object.freeze({
        apiUrl,
        parkApiUrl,
        turnstileSiteKey: "0x4AAAAAAD3SWiaXhNtYtC9B",
        // Set to true for local development when Cloudflare Turnstile is not
        // configured. The backend accepts any non-empty token when its
        // TURNSTILE_SECRET_KEY is unset, so a dummy token is sent instead.
        disableTurnstile: false,
    });
})();
