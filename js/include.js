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

function loadCartScript() {
    if (!window.TOBCart && !document.querySelector('script[src*="cart.js"]')) {
        const script = document.createElement("script");
        script.src = "/js/cart.js";
        script.defer = true;
        document.head.appendChild(script);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    loadCartScript();

    await Promise.all([
        injectPartial("[data-include-header]", "/header.html"),
        injectPartial("[data-include-footer]", "/footer.html"),
    ]);

    if (window.initNavbar) {
        window.initNavbar();
    }

    // Trigger cart badge refresh after header is injected
    if (window.TOBCart) {
        window.dispatchEvent(new CustomEvent("cart:updated"));
    }
});
