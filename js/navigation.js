// =====================================================
// DUCTCULATOR PRO
// navigation.js
// Shared navigation behaviour for every screen.
// =====================================================

(function () {

    function closeAllMobileMenus() {
        document
            .querySelectorAll(".sidebar.mobile-open")
            .forEach(element => element.classList.remove("mobile-open"));

        document
            .querySelectorAll(".mobile-overlay.active")
            .forEach(element => element.classList.remove("active"));
    }

    /*
     * Show exactly one page: the dashboard or one workspace.
     */
    function show(targetId) {
        const target = document.getElementById(targetId);

        if (!target) {
            return;
        }

        closeAllMobileMenus();

        document.getElementById("dashboard")?.classList.toggle("active", targetId === "dashboard");

        document.querySelectorAll(".workspace").forEach(element => {
            element.classList.toggle("active", element.id === targetId);
        });

        window.scrollTo(0, 0);

        document.dispatchEvent(
            new CustomEvent("ductculator:screen-shown", { detail: { id: targetId } })
        );
    }

    window.DuctNav = { show, closeAllMobileMenus };

    /*
     * Any element with data-nav-target (sidebar buttons, dashboard
     * cards) opens that screen. The older screens keep their own
     * id-based handlers; this covers the newer ones.
     */
    document.addEventListener("click", event => {
        const opener = event.target.closest("[data-nav-target]");

        if (opener && !opener.disabled) {
            show(opener.dataset.navTarget);
        }
    });

    /*
     * Phone menu: any tap on a sidebar item closes the slide-out menu.
     * Tapping the screen you are already on used to leave it open.
     */
    document.addEventListener("click", event => {
        const button = event.target.closest(".sidebar button");

        if (!button || button.disabled || button.classList.contains("toggle-btn")) {
            return;
        }

        closeAllMobileMenus();
    });

    // Newer screens: phone menu button, overlay and sidebar collapse.
    document.addEventListener("click", event => {
        const menuButton = event.target.closest("[data-mobile-menu]");

        if (menuButton) {
            const workspace = menuButton.closest(".workspace");
            workspace?.querySelector(".sidebar")?.classList.add("mobile-open");
            workspace?.querySelector(".mobile-overlay")?.classList.add("active");
            return;
        }

        if (event.target.closest(".tool-screen .mobile-overlay")) {
            closeAllMobileMenus();
            return;
        }

        const toggle = event.target.closest("[data-sidebar-toggle]");

        if (toggle) {
            if (window.innerWidth <= 900) {
                closeAllMobileMenus();
            } else {
                toggle.closest(".sidebar")?.classList.toggle("collapsed");
            }
        }
    });

    // Works offline once it has been opened online (served over http/https).
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js").catch(() => {});
        });
    }

})();
