// =====================================================
// DUCTCULATOR PRO
// proCalc.js
// HVAC Pro Calc workspace (4090-style calculator)
//
// The calculator itself lives in hvac-pro-calc.html and is shown here in
// an iframe, so its global styles, element ids and document-wide keyboard
// shortcuts cannot collide with the rest of the app.
// =====================================================

(function () {

    const WORKSPACE_ID = "proCalcWorkspace";

    const byId = id => document.getElementById(id);

    const workspace = byId(WORKSPACE_ID);
    const frame = byId("proCalcFrame");
    const sidebar = document.querySelector(".procalc-sidebar");
    const overlay = byId("proCalcMobileOverlay");

    if (!workspace || !frame) {
        return;
    }

    function isMobile() {
        return window.innerWidth <= 900;
    }

    function closeAllMobileMenus() {
        document
            .querySelectorAll(".sidebar.mobile-open")
            .forEach(element => element.classList.remove("mobile-open"));

        document
            .querySelectorAll(".mobile-overlay.active")
            .forEach(element => element.classList.remove("active"));
    }

    /*
     * Show exactly one page: the dashboard or one workspace. Works for
     * every screen, so navigation in and out of this workspace never
     * leaves two screens active.
     */
    function activateOnly(targetId) {
        closeAllMobileMenus();

        byId("dashboard")?.classList.toggle("active", targetId === "dashboard");

        document.querySelectorAll(".workspace").forEach(element => {
            element.classList.toggle("active", element.id === targetId);
        });
    }

    function loadFrame() {
        if (!frame.getAttribute("src")) {
            frame.setAttribute("src", frame.dataset.src);
        }
    }

    /*
     * Give the calculator keyboard focus so typing works right away,
     * just like the standalone page.
     */
    function focusCalculator() {
        const focus = () => {
            try {
                frame.contentWindow?.focus();
            } catch (error) {
                // Ignore: focus is a convenience only.
            }
        };

        if (frame.contentDocument?.readyState === "complete") {
            focus();
        } else {
            frame.addEventListener("load", focus, { once: true });
        }
    }

    function openProCalc() {
        activateOnly(WORKSPACE_ID);
        loadFrame();
        focusCalculator();
    }

    // Dashboard card and the button in every other sidebar.
    byId("openProCalc")?.addEventListener("click", openProCalc);

    document
        .querySelectorAll("[data-open-procalc]")
        .forEach(button => button.addEventListener("click", openProCalc));

    // This workspace's own sidebar.
    workspace
        .querySelectorAll("[data-nav-target]")
        .forEach(button => {
            button.addEventListener("click", () => {
                activateOnly(button.dataset.navTarget);
            });
        });

    // Sidebar collapse (desktop) and slide-out menu (phone).
    byId("toggleProCalcSidebar")?.addEventListener("click", () => {
        if (isMobile()) {
            closeAllMobileMenus();
        } else {
            sidebar?.classList.toggle("collapsed");
        }
    });

    byId("proCalcMobileMenuBtn")?.addEventListener("click", () => {
        sidebar?.classList.add("mobile-open");
        overlay?.classList.add("active");
    });

    overlay?.addEventListener("click", closeAllMobileMenus);

    window.addEventListener("resize", () => {
        if (!isMobile()) {
            sidebar?.classList.remove("mobile-open");
            overlay?.classList.remove("active");
        }
    });

})();
