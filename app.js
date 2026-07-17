// =====================================================
// DUCTCULATOR PRO
// app.js
// =====================================================

// ----------------------------
// Dashboard Navigation
// ----------------------------

const dashboard = document.getElementById("dashboard");
const airflowWorkspace = document.getElementById("airflowWorkspace");

document.getElementById("openAirflow").addEventListener("click", () => {

    dashboard.classList.remove("active");
    airflowWorkspace.classList.add("active");

});

document.getElementById("goHome").addEventListener("click", () => {

    closeMobileMenu();

    airflowWorkspace.classList.remove("active");
    dashboard.classList.add("active");

});

// ----------------------------
// Sidebar Controls
// ----------------------------

const sidebar = document.querySelector(".sidebar");

const toggleSidebar =
    document.getElementById("toggleSidebar");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const mobileOverlay =
    document.getElementById("mobileOverlay");

function isMobileView() {

    return window.innerWidth <= 900;

}

function openMobileMenu() {

    sidebar.classList.add("mobile-open");
    mobileOverlay.classList.add("active");

}

function closeMobileMenu() {

    sidebar.classList.remove("mobile-open");
    mobileOverlay.classList.remove("active");

}

toggleSidebar.addEventListener("click", () => {

    if (isMobileView()) {

        closeMobileMenu();

    } else {

        sidebar.classList.toggle("collapsed");

    }

});

mobileMenuBtn.addEventListener("click", openMobileMenu);

mobileOverlay.addEventListener("click", closeMobileMenu);

window.addEventListener("resize", () => {

    if (!isMobileView()) {

        closeMobileMenu();

    }

});

// ----------------------------
// Equivalent Sizes Mobile Menu
// ----------------------------

const equivalentSidebar =
    document.querySelector(".equivalent-sidebar");

const toggleEquivalentSidebar =
    document.getElementById("toggleEquivalentSidebar");

const equivalentMobileMenuBtn =
    document.getElementById("equivalentMobileMenuBtn");

const equivalentMobileOverlay =
    document.getElementById("equivalentMobileOverlay");

function openEquivalentMobileMenu() {

    equivalentSidebar.classList.add("mobile-open");
    equivalentMobileOverlay.classList.add("active");

}

function closeEquivalentMobileMenu() {

    equivalentSidebar.classList.remove("mobile-open");
    equivalentMobileOverlay.classList.remove("active");

}

toggleEquivalentSidebar.addEventListener("click", () => {

    if (isMobileView()) {

        closeEquivalentMobileMenu();

    } else {

        equivalentSidebar.classList.toggle("collapsed");

    }

});

equivalentMobileMenuBtn.addEventListener(
    "click",
    openEquivalentMobileMenu
);

equivalentMobileOverlay.addEventListener(
    "click",
    closeEquivalentMobileMenu
);

window.addEventListener("resize", () => {

    if (!isMobileView()) {

        closeEquivalentMobileMenu();

    }

});

// ----------------------------
// Calculator Controls
// ----------------------------

const methodSelect = document.getElementById("methodSelect");

const velocityGroup = document.getElementById("velocityGroup");
const frictionGroup = document.getElementById("frictionGroup");

const cfmInput = document.getElementById("cfmInput");
const velocityInput = document.getElementById("velocityInput");
const frictionInput = document.getElementById("frictionInput");

const calculateBtn = document.getElementById("calculateBtn");

const results = document.getElementById("results");

cfmInput.addEventListener("input", updateCalculator);

velocityInput.addEventListener("input", updateCalculator);

frictionInput.addEventListener("input", updateCalculator);

methodSelect.addEventListener("change", () => {

    if (methodSelect.value === "constantVelocity") {

        velocityGroup.style.display = "block";
        frictionGroup.style.display = "none";

    } else {

        velocityGroup.style.display = "none";
        frictionGroup.style.display = "block";

    }

    updateCalculator();

});

// ----------------------------
// Switch Calculation Method
// ----------------------------

methodSelect.addEventListener("change", () => {

    if (methodSelect.value === "constantVelocity") {

        velocityGroup.style.display = "block";
        frictionGroup.style.display = "none";

    } else {

        velocityGroup.style.display = "none";
        frictionGroup.style.display = "block";

    }

});

function updateCalculator() {

    const cfm = Number(cfmInput.value);

    if (cfm <= 0) {

        results.innerHTML = "<h2>Please enter a valid CFM.</h2>";
        return;

    }

    if (methodSelect.value === "constantVelocity") {

        const velocity = Number(velocityInput.value);

        const data = calculateConstantVelocity(cfm, velocity);

        if (!data) {

            results.innerHTML = "<h2>Invalid Values</h2>";
            return;

        }

        results.innerHTML = buildResults(data);
        return;

    }

    results.innerHTML = `

        <div class="result-card">

            <div class="result-header">

                <h2>Equal Friction</h2>

                <p>Coming Soon</p>

            </div>

        </div>

    `;

}

updateCalculator();

// =====================================================
// Sheet Metal Mobile Menu
// =====================================================

const sheetMetalSidebar =
    document.querySelector(".sheet-metal-sidebar");

const toggleSheetMetalSidebar =
    document.getElementById("toggleSheetMetalSidebar");

const sheetMetalMobileMenuBtn =
    document.getElementById("sheetMetalMobileMenuBtn");

const sheetMetalMobileOverlay =
    document.getElementById("sheetMetalMobileOverlay");

function openSheetMetalMobileMenu() {

    sheetMetalSidebar.classList.add("mobile-open");
    sheetMetalMobileOverlay.classList.add("active");

}

function closeSheetMetalMobileMenu() {

    sheetMetalSidebar.classList.remove("mobile-open");
    sheetMetalMobileOverlay.classList.remove("active");

}

toggleSheetMetalSidebar.addEventListener("click", () => {

    if (isMobileView()) {

        closeSheetMetalMobileMenu();

    } else {

        sheetMetalSidebar.classList.toggle("collapsed");

    }

});

sheetMetalMobileMenuBtn.addEventListener(
    "click",
    openSheetMetalMobileMenu
);

sheetMetalMobileOverlay.addEventListener(
    "click",
    closeSheetMetalMobileMenu
);

window.addEventListener("resize", () => {

    if (!isMobileView()) {

        closeSheetMetalMobileMenu();

    }

});

// =====================================================
// Equivalent Sizes Navigation
// =====================================================

const equivalentWorkspace =
    document.getElementById("equivalentWorkspace");

const openEquivalent =
    document.getElementById("openEquivalent");

const equivalentGoHome =
    document.getElementById("equivalentGoHome");

const equivalentOpenAirflow =
    document.getElementById("equivalentOpenAirflow");

const airflowOpenEquivalent =
    document.getElementById("airflowOpenEquivalent");

openEquivalent.addEventListener("click", () => {

    closeMobileMenu();
    closeEquivalentMobileMenu();

    dashboard.classList.remove("active");
    airflowWorkspace.classList.remove("active");
    equivalentWorkspace.classList.add("active");

});

airflowOpenEquivalent.addEventListener("click", () => {

    closeMobileMenu();
    closeEquivalentMobileMenu();

    airflowWorkspace.classList.remove("active");
    equivalentWorkspace.classList.add("active");

});

equivalentOpenAirflow.addEventListener("click", () => {

    closeEquivalentMobileMenu();
    closeMobileMenu();

    equivalentWorkspace.classList.remove("active");
    airflowWorkspace.classList.add("active");

});

equivalentGoHome.addEventListener("click", () => {

    closeEquivalentMobileMenu();
    closeMobileMenu();

    equivalentWorkspace.classList.remove("active");
    airflowWorkspace.classList.remove("active");
    dashboard.classList.add("active");

});

// =====================================================
// Sheet Metal Navigation
// =====================================================

const sheetMetalWorkspace =
    document.getElementById("sheetMetalWorkspace");

const openSheetMetal =
    document.getElementById("openSheetMetal");

const airflowOpenSheetMetal =
    document.getElementById("airflowOpenSheetMetal");

const equivalentOpenSheetMetal =
    document.getElementById("equivalentOpenSheetMetal");

const sheetMetalGoHome =
    document.getElementById("sheetMetalGoHome");

const sheetMetalOpenAirflow =
    document.getElementById("sheetMetalOpenAirflow");

const sheetMetalOpenEquivalent =
    document.getElementById("sheetMetalOpenEquivalent");

openSheetMetal.addEventListener("click", () => {

    closeMobileMenu();
    closeEquivalentMobileMenu();
    closeSheetMetalMobileMenu();

    dashboard.classList.remove("active");
    airflowWorkspace.classList.remove("active");
    equivalentWorkspace.classList.remove("active");
    sheetMetalWorkspace.classList.add("active");

});

airflowOpenSheetMetal.addEventListener("click", () => {

    closeMobileMenu();
    closeSheetMetalMobileMenu();

    airflowWorkspace.classList.remove("active");
    equivalentWorkspace.classList.remove("active");
    sheetMetalWorkspace.classList.add("active");

});

equivalentOpenSheetMetal.addEventListener("click", () => {

    closeEquivalentMobileMenu();
    closeSheetMetalMobileMenu();

    equivalentWorkspace.classList.remove("active");
    airflowWorkspace.classList.remove("active");
    sheetMetalWorkspace.classList.add("active");

});

sheetMetalOpenAirflow.addEventListener("click", () => {

    closeSheetMetalMobileMenu();

    sheetMetalWorkspace.classList.remove("active");
    equivalentWorkspace.classList.remove("active");
    airflowWorkspace.classList.add("active");

});

sheetMetalOpenEquivalent.addEventListener("click", () => {

    closeSheetMetalMobileMenu();

    sheetMetalWorkspace.classList.remove("active");
    airflowWorkspace.classList.remove("active");
    equivalentWorkspace.classList.add("active");

});

sheetMetalGoHome.addEventListener("click", () => {

    closeSheetMetalMobileMenu();

    sheetMetalWorkspace.classList.remove("active");
    airflowWorkspace.classList.remove("active");
    equivalentWorkspace.classList.remove("active");
    dashboard.classList.add("active");

});

console.log("Ductculator Pro Loaded");