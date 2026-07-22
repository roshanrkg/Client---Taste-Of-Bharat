async function injectPartial(selector, url) {
    const target = document.querySelector(selector);
    if (!target) return;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        target.innerHTML = await response.text();
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
        injectPartial("[data-include-header]", "/header.html"),
        injectPartial("[data-include-footer]", "/footer.html"),
    ]);

    if (window.initNavbar) {
        window.initNavbar();
    }
});
