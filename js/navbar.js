window.initNavbar = function initNavbar() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const mobileNav = document.querySelector("[data-mobile-nav]");
    const icon = document.querySelector("[data-nav-icon]");
    const links = document.querySelectorAll(".mobile-nav-link");
    const navLinks = document.querySelectorAll("[data-nav-link]");

    if (!toggle || !mobileNav || !icon) return;

    const openMenu = () => {
        mobileNav.classList.remove("max-h-0", "opacity-0", "translate-y-[-8px]");
        mobileNav.classList.add("max-h-[24rem]", "opacity-100", "translate-y-0");
        toggle.setAttribute("aria-expanded", "true");
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-xmark");
    };

    const closeMenu = () => {
        mobileNav.classList.add("max-h-0", "opacity-0", "translate-y-[-8px]");
        mobileNav.classList.remove("max-h-[24rem]", "opacity-100", "translate-y-0");
        toggle.setAttribute("aria-expanded", "false");
        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");
    };

    toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    links.forEach((link) => link.addEventListener("click", closeMenu));

    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        const normalizedHref = href ? new URL(href, window.location.origin).pathname.replace(/\/+$/, "") || "/" : "";
        if (normalizedHref === currentPath) {
            link.classList.add("text-spice-500");
        }
    });

    document.addEventListener("click", (event) => {
        if (!mobileNav.contains(event.target) && !toggle.contains(event.target)) {
            closeMenu();
        }
    });
};
