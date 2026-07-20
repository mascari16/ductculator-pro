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
// Two-Elbow Offset Calculator
// =====================================================

const offsetMode =
    document.getElementById("offsetMode");

const offsetInput =
    document.getElementById("offsetInput");

const overallLengthInput =
    document.getElementById("overallLengthInput");

const ductWidthInput =
    document.getElementById("ductWidthInput");

const ductDepthInput =
    document.getElementById("ductDepthInput");

const clrMultiplier =
    document.getElementById("clrMultiplier");

const customClrGroup =
    document.getElementById("customClrGroup");

const customClrInput =
    document.getElementById("customClrInput");

const knownAngleGroup =
    document.getElementById("knownAngleGroup");

const elbowAngleInput =
    document.getElementById("elbowAngleInput");

const calculateOffsetBtn =
    document.getElementById("calculateOffsetBtn");

const offsetResults =
    document.getElementById("offsetResults");

const diagOverall =
    document.getElementById("diagOverall");

const diagOffset =
    document.getElementById("diagOffset");

const diagStraight =
    document.getElementById("diagStraight");

const diagAngle =
    document.getElementById("diagAngle");

const diagClr =
    document.getElementById("diagClr");

const diagThroat =
    document.getElementById("diagThroat");    


// -----------------------------------------------------
// Input display controls
// -----------------------------------------------------

offsetMode.addEventListener("change", () => {

    if (offsetMode.value === "knownAngle") {

        knownAngleGroup.style.display = "block";

    } else {

        knownAngleGroup.style.display = "none";

    }

});


clrMultiplier.addEventListener("change", () => {

    if (clrMultiplier.value === "custom") {

        customClrGroup.style.display = "block";

    } else {

        customClrGroup.style.display = "none";

    }

});


// -----------------------------------------------------
// Convert feet, inches and fractions into decimal inches
// -----------------------------------------------------

function parseSheetMetalMeasurement(value) {

    if (!value) {

        return NaN;

    }

    let text = value
        .trim()
        .toLowerCase()
        .replace(/inches|inch|in\./g, "")
        .replace(/"/g, "")
        .replace(/\s+/g, " ");

    let totalInches = 0;

    // Handle feet, such as 3' 10 1/4

    if (text.includes("'")) {

        const parts = text.split("'");

        const feet = Number(parts[0].trim());

        if (!Number.isFinite(feet)) {

            return NaN;

        }

        totalInches += feet * 12;

        text = parts[1].trim();

    }

    // Convert formats such as 46-1/4 into 46 1/4

    text = text.replace(
        /^(-?\d+(?:\.\d+)?)-(\d+)\/(\d+)$/,
        "$1 $2/$3"
    );

    if (!text) {

        return totalInches;

    }

    const parts = text.split(" ");

    for (const part of parts) {

        if (!part) {

            continue;

        }

        if (part.includes("/")) {

            const fractionParts = part.split("/");

            if (fractionParts.length !== 2) {

                return NaN;

            }

            const numerator = Number(fractionParts[0]);
            const denominator = Number(fractionParts[1]);

            if (
                !Number.isFinite(numerator) ||
                !Number.isFinite(denominator) ||
                denominator === 0
            ) {

                return NaN;

            }

            totalInches += numerator / denominator;

        } else {

            const number = Number(part);

            if (!Number.isFinite(number)) {

                return NaN;

            }

            totalInches += number;

        }

    }

    return totalInches;

}


// -----------------------------------------------------
// Format decimal inches to the nearest 1/16 inch
// -----------------------------------------------------

function formatSheetMetalMeasurement(value) {

    if (!Number.isFinite(value)) {

        return "—";

    }

    const roundedSixteenths =
        Math.round(value * 16);

    let wholeInches =
        Math.floor(roundedSixteenths / 16);

    const remainder =
        roundedSixteenths % 16;

    if (remainder === 0) {

        return `${wholeInches}"`;

    }

    const divisor =
        greatestCommonDivisor(remainder, 16);

    const numerator =
        remainder / divisor;

    const denominator =
        16 / divisor;

    return `${wholeInches} ${numerator}/${denominator}"`;

}


function greatestCommonDivisor(a, b) {

    while (b !== 0) {

        const temporary = b;

        b = a % b;
        a = temporary;

    }

    return Math.abs(a);

}


// -----------------------------------------------------
// Find the elbow angle from offset and overall length
// -----------------------------------------------------

function solveOffsetAngle(offset, overallLength, radius) {

    /*
     * Offset geometry:
     *
     * overallLength =
     * offset / tan(angle) +
     * 2 * radius * tan(angle / 2)
     *
     * Substituting t = tan(angle / 2) gives:
     *
     * (4R - O)t² - 2Lt + O = 0
     */

    const coefficientA =
        4 * radius - offset;

    const coefficientB =
        -2 * overallLength;

    const coefficientC =
        offset;

    const candidates = [];

    if (Math.abs(coefficientA) < 0.000001) {

        const t =
            -coefficientC /
            coefficientB;

        if (t > 0) {

            candidates.push(t);

        }

    } else {

        const discriminant =
            Math.pow(coefficientB, 2) -
            4 *
            coefficientA *
            coefficientC;

        if (discriminant < -0.000001) {

            return NaN;

        }

        const safeDiscriminant =
            Math.max(0, discriminant);

        const squareRoot =
            Math.sqrt(safeDiscriminant);

        const firstT =
            (
                -coefficientB +
                squareRoot
            ) /
            (2 * coefficientA);

        const secondT =
            (
                -coefficientB -
                squareRoot
            ) /
            (2 * coefficientA);

        if (firstT > 0) {

            candidates.push(firstT);

        }

        if (
            secondT > 0 &&
            Math.abs(secondT - firstT) > 0.000001
        ) {

            candidates.push(secondT);

        }

    }

    const validAngles =
        candidates
            .map((t) => {

                return (
                    2 *
                    Math.atan(t) *
                    180 /
                    Math.PI
                );

            })
            .filter((angle) => {

                if (
                    angle <= 0 ||
                    angle >= 90
                ) {

                    return false;

                }

                const angleRadians =
                    angle *
                    Math.PI /
                    180;

                const centerlineRise =
                    radius *
                    Math.tan(
                        angleRadians / 2
                    );

                const centerlineTravel =
                    offset /
                    Math.sin(
                        angleRadians
                    );

                const straightBetweenElbows =
                    centerlineTravel -
                    2 * centerlineRise;

                return straightBetweenElbows >= -0.001;

            });

    if (!validAngles.length) {

        return NaN;

    }

    /*
     * Use the steeper valid solution because it gives
     * the shorter, more practical straight section.
     */
    return Math.max(...validAngles);

}


// -----------------------------------------------------
// Calculate offset
// -----------------------------------------------------

calculateOffsetBtn.addEventListener("click", () => {

    const offset =
        parseSheetMetalMeasurement(offsetInput.value);

    const ductWidth =
        parseSheetMetalMeasurement(ductWidthInput.value);

    const ductDepth =
        parseSheetMetalMeasurement(ductDepthInput.value);

    /*
     * Shop convention:
     * Width is always the cheek / bending dimension.
     * Depth is always the straight extrusion dimension.
     */
    const bendDimension =
        ductWidth;

    const elbowDepth =
        ductDepth;

    if (
        !Number.isFinite(offset) ||
        offset <= 0
    ) {

        offsetResults.innerHTML = `
            <p class="error">
                Enter a valid offset.
            </p>
        `;

        return;

    }

    if (
        !Number.isFinite(ductWidth) ||
        ductWidth <= 0 ||
        !Number.isFinite(ductDepth) ||
        ductDepth <= 0
    ) {

        offsetResults.innerHTML = `
            <p class="error">
                Enter a valid width and depth.
            </p>
        `;

        return;

    }

    let centerlineRadius;

    if (clrMultiplier.value === "custom") {

        centerlineRadius =
            parseSheetMetalMeasurement(
                customClrInput.value
            );

    } else if (clrMultiplier.value === "auto") {

        centerlineRadius = NaN;

    } else {

        centerlineRadius =
            bendDimension *
            Number(clrMultiplier.value);

    }

    let elbowAngle;
    let requestedOverallLength = null;

    if (offsetMode.value === "solveAngle") {

        requestedOverallLength =
            parseSheetMetalMeasurement(
                overallLengthInput.value
            );

        if (
            !Number.isFinite(requestedOverallLength) ||
            requestedOverallLength <= 0
        ) {

            offsetResults.innerHTML = `
                <p class="error">
                    Enter a valid overall length.
                </p>
            `;

            return;

        }

        if (clrMultiplier.value === "auto") {

            /*
             * AUTO CLR RULES
             *
             * 1. Prefer a full 1.00× cheek-width CLR.
             * 2. If 1.00× will not fit, use the largest
             *    CLR that the requested geometry allows.
             * 3. Allow Auto to reduce as low as 0.60×.
             * 4. The ISO preview warning handles any
             *    result below the recommended 0.75×.
             */

            const preferredAutoClr =
                bendDimension;

            const minimumAutoClr =
                bendDimension * 0.60;

            /*
             * This is the largest CLR that fits when the
             * straight section between the two elbows is
             * exactly zero.
             */
            const maximumFittingClr =
                (
                    Math.pow(offset, 2) +
                    Math.pow(requestedOverallLength, 2)
                ) /
                (4 * offset);

            if (
                maximumFittingClr <
                minimumAutoClr - 0.001
            ) {

                offsetResults.innerHTML = `
                    <p class="error">
                        This offset cannot be made with
                        Auto CLR without going below the
                        minimum 0.60× CLR. Increase the
                        overall length, reduce the offset,
                        or reduce the cheek width.
                    </p>
                `;

                return;

            }

            /*
             * Use 1.00× whenever possible. Otherwise use
             * the largest CLR that physically fits.
             */
            centerlineRadius =
                Math.min(
                    preferredAutoClr,
                    maximumFittingClr
                );

            elbowAngle =
                solveOffsetAngle(
                    offset,
                    requestedOverallLength,
                    centerlineRadius
                );

            if (!Number.isFinite(elbowAngle)) {

                offsetResults.innerHTML = `
                    <p class="error">
                        Auto CLR could not produce a valid
                        elbow for these dimensions. Increase
                        the overall length or reduce the
                        offset.
                    </p>
                `;

                return;

            }

        } else {

            elbowAngle =
                solveOffsetAngle(
                    offset,
                    requestedOverallLength,
                    centerlineRadius
                );

            if (!Number.isFinite(elbowAngle)) {

                offsetResults.innerHTML = `
                    <p class="error">
                        That offset and overall length cannot
                        be made with the selected CLR.
                    </p>
                `;

                return;

            }

        }

    } else {

        elbowAngle =
            Number(elbowAngleInput.value);

        if (
            !Number.isFinite(elbowAngle) ||
            elbowAngle <= 0 ||
            elbowAngle >= 90
        ) {

            offsetResults.innerHTML = `
                <p class="error">
                    Enter an elbow angle between 0° and 90°.
                </p>
            `;

            return;

        }

        /*
         * In Known Angle mode there is no overall-length
         * limit, so Auto CLR uses the preferred 1.00× CLR.
         */
        if (clrMultiplier.value === "auto") {

            centerlineRadius =
                bendDimension;

        }

    }

    if (
        !Number.isFinite(centerlineRadius) ||
        centerlineRadius <= 0
    ) {

        offsetResults.innerHTML = `
            <p class="error">
                Enter a valid centerline radius.
            </p>
        `;

        return;

    }

    const throatRadius =
        centerlineRadius -
        bendDimension / 2;

    const heelRadius =
        centerlineRadius +
        bendDimension / 2;

    if (throatRadius < 0) {

        offsetResults.innerHTML = `
            <p class="error">
                The selected CLR is too small for the
                cheek width.
            </p>
        `;

        return;

    }

    const angleRadians =
        elbowAngle * Math.PI / 180;

    const centerlineRise =
        centerlineRadius *
        Math.tan(angleRadians / 2);

    const centerlineTravel =
        offset /
        Math.sin(angleRadians);

    const calculatedOverallLength =
        offset /
        Math.tan(angleRadians) +
        2 * centerlineRise;

    const straightBetweenElbows =
        centerlineTravel -
        2 * centerlineRise;

    if (straightBetweenElbows < -0.001) {

        offsetResults.innerHTML = `
            <p class="error">
                This layout causes the elbows to overlap.
                Increase the overall length, reduce the CLR,
                or use a steeper elbow angle.
            </p>
        `;

        return;

    }

    const usableStraight =
        Math.max(0, straightBetweenElbows);

    const straightPerElbow =
        usableStraight / 2;

    offsetResults.innerHTML = `

        <div class="result-main">

            <span>Required Elbow Angle</span>

            <strong>
                ${elbowAngle.toFixed(2)}°
            </strong>

        </div>

        <div class="result-row">

            <span>Duct Size</span>

            <strong>
                ${formatSheetMetalMeasurement(ductWidth)}
                ×
                ${formatSheetMetalMeasurement(ductDepth)}
            </strong>

        </div>

        <div class="result-row">

            <span>Width (Cheek)</span>

            <strong>
                ${formatSheetMetalMeasurement(bendDimension)}
            </strong>

        </div>

        <div class="result-row">

            <span>Offset</span>

            <strong>
                ${formatSheetMetalMeasurement(offset)}
            </strong>

        </div>

        <div class="result-row">

            <span>Overall Length</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    calculatedOverallLength
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Centerline Radius</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    centerlineRadius
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Throat Radius</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    throatRadius
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Heel Radius</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    heelRadius
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Equivalent CLR</span>

            <strong>
                ${(centerlineRadius / bendDimension).toFixed(2)}× CLR
            </strong>

        </div>

        <div class="result-row">

            <span>Total Straight Between Elbows</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    usableStraight
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Straight Added Per Elbow</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    straightPerElbow
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Elbow Quantity</span>

            <strong>
                2
            </strong>

        </div>

    `;

    if (diagOverall) {

        diagOverall.textContent =
            formatSheetMetalMeasurement(
                calculatedOverallLength
            );

    }

    if (diagOffset) {

        diagOffset.textContent =
            formatSheetMetalMeasurement(offset);

    }

    if (diagStraight) {

        diagStraight.textContent =
            formatSheetMetalMeasurement(
                straightPerElbow
            );

    }

    if (diagAngle) {

        diagAngle.textContent =
            `${elbowAngle.toFixed(2)}°`;

    }

    if (diagClr) {

        diagClr.textContent =
            formatSheetMetalMeasurement(
                centerlineRadius
            );

    }

    if (diagThroat) {

        diagThroat.textContent =
            formatSheetMetalMeasurement(
                throatRadius
            );

    }

    document.dispatchEvent(
        new CustomEvent(
            "ductculator:offset-calculated",
            {
                detail: {
                    offset,
                    overallLength:
                        calculatedOverallLength,
                    ductWidth,
                    ductDepth,
                    bendDimension,
                    elbowDepth,
                    centerlineRadius,
                    throatRadius,
                    heelRadius,
                    elbowAngle,
                    totalStraight:
                        usableStraight,
                    straightPerElbow,
                    quantity: 2
                }
            }
        )
    );

});
// -----------------------------------------------------
// Live offset recalculation
// -----------------------------------------------------

[
    offsetInput,
    overallLengthInput,
    ductWidthInput,
    ductDepthInput,
    clrMultiplier,
    customClrInput,
    elbowAngleInput,
    offsetMode,
]
.filter(Boolean)
.forEach((element) => {

    element.addEventListener(
        "input",
        () => calculateOffsetBtn.click()
    );

    element.addEventListener(
        "change",
        () => calculateOffsetBtn.click()
    );

});

window.addEventListener("DOMContentLoaded", () => {

    calculateOffsetBtn.click();

});


// -----------------------------------------------------
// Keep Live Isometric Preview above the offset results
// -----------------------------------------------------

function placeOffsetPreviewAboveResults() {

    const previewCard =
        document.querySelector(".offset-iso-card");

    const resultsPanel =
        document.getElementById("offsetResults");

    if (
        !previewCard ||
        !resultsPanel ||
        !resultsPanel.parentElement
    ) {

        return;

    }

    resultsPanel.parentElement.insertBefore(
        previewCard,
        resultsPanel
    );

}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        placeOffsetPreviewAboveResults
    );

} else {

    placeOffsetPreviewAboveResults();

}

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