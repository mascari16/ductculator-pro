// =====================================================
// DUCTCULATOR PRO
// navigation.js
// Shared navigation behaviour for every screen.
// =====================================================

(function () {

    /*
     * Phone menu: any tap on a sidebar item closes the slide-out menu.
     * Each screen's own handlers already close it when switching
     * screens, but tapping the screen you are already on left the menu
     * open on top of the page.
     */
    document.addEventListener("click", event => {
        const button = event.target.closest(".sidebar button");

        if (!button || button.disabled || button.classList.contains("toggle-btn")) {
            return;
        }

        document
            .querySelectorAll(".sidebar.mobile-open")
            .forEach(element => element.classList.remove("mobile-open"));

        document
            .querySelectorAll(".mobile-overlay.active")
            .forEach(element => element.classList.remove("active"));
    });

})();
