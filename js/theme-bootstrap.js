// Apply the saved theme before rendering to avoid a flash of incorrect theme.
(() => {
    try {
        const savedTheme = localStorage.getItem("park-theme");
        const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

        document.documentElement.dataset.theme = savedTheme || preferredTheme;
    } catch {
        document.documentElement.dataset.theme = "light";
    }
})();
