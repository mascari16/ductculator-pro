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

const cheekSizeInput =
    document.getElementById("cheekSizeInput");

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

    function calculatedLength(angleDegrees) {

        const angleRadians =
            angleDegrees * Math.PI / 180;

        const centerlineRise =
            radius * Math.tan(angleRadians / 2);

        return (
            offset / Math.tan(angleRadians) +
            2 * centerlineRise
        );

    }

    let lowestAngle = 0.1;
    let highestAngle = 89.9;

    const lowestLength =
        calculatedLength(lowestAngle);

    const highestLength =
        calculatedLength(highestAngle);

    /*
        The requested length must fall within the range
        the two elbows can physically produce.
    */

    if (
        overallLength > lowestLength ||
        overallLength < highestLength
    ) {

        return NaN;

    }

    for (let i = 0; i < 100; i++) {

        const middleAngle =
            (lowestAngle + highestAngle) / 2;

        const middleLength =
            calculatedLength(middleAngle);

        if (middleLength > overallLength) {

            lowestAngle = middleAngle;

        } else {

            highestAngle = middleAngle;

        }

    }

    return (lowestAngle + highestAngle) / 2;

}


// -----------------------------------------------------
// Calculate offset
// -----------------------------------------------------

calculateOffsetBtn.addEventListener("click", () => {

    const offset =
        parseSheetMetalMeasurement(offsetInput.value);

    const cheekSize =
        parseSheetMetalMeasurement(cheekSizeInput.value);

    let centerlineRadius;

if (clrMultiplier.value === "custom") {

    centerlineRadius =
        parseSheetMetalMeasurement(customClrInput.value);

} else if (clrMultiplier.value === "auto") {

    centerlineRadius = NaN;

} else {

    centerlineRadius =
        cheekSize * Number(clrMultiplier.value);

}

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
    clrMultiplier.value !== "auto" &&
    clrMultiplier.value !== "custom" &&
    (
        !Number.isFinite(cheekSize) ||
        cheekSize <= 0
    )
) {

    offsetResults.innerHTML = `
        <p class="error">
            Enter a valid cheek size.
        </p>
    `;

    return;

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

        centerlineRadius =
            (
                Math.pow(offset, 2) +
                Math.pow(requestedOverallLength, 2)
            ) /
            (4 * offset);

        elbowAngle =
            2 *
            Math.atan(
                offset / requestedOverallLength
            ) *
            180 /
            Math.PI;

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

    const angleRadians =
        elbowAngle * Math.PI / 180;

    const centerlineRise =
        centerlineRadius *
        Math.tan(angleRadians / 2);

    const centerlineTravel =
        offset / Math.sin(angleRadians);

    const calculatedOverallLength =
        offset / Math.tan(angleRadians) +
        2 * centerlineRise;

    const straightBetweenElbows =
        centerlineTravel -
        2 * centerlineRise;

    if (straightBetweenElbows < 0) {

        offsetResults.innerHTML = `
            <p class="error">
                This layout causes the elbows to overlap.
                Increase the overall length, reduce the CLR,
                or use a steeper elbow angle.
            </p>
        `;

        return;

    }

    const throatRadius =
    centerlineRadius - (cheekSize / 2);

    offsetResults.innerHTML = `

    diagOverall.textContent =
    formatSheetMetalMeasurement(calculatedOverallLength);

diagOffset.textContent =
    formatSheetMetalMeasurement(offset);

diagStraight.textContent =
    formatSheetMetalMeasurement(straightBetweenElbows);

diagAngle.textContent =
    `${elbowAngle.toFixed(2)}°`;

diagClr.textContent =
    formatSheetMetalMeasurement(centerlineRadius);

diagThroat.textContent =
    Number.isFinite(throatRadius)
        ? formatSheetMetalMeasurement(throatRadius)
        : "—";

        <div class="result-main">

            <span>Required Elbow Angle</span>

            <strong>
                ${elbowAngle.toFixed(2)}°
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

            <span>Cheek Size</span>

            <strong>
                ${formatSheetMetalMeasurement(cheekSize)}
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

        ${
    Number.isFinite(cheekSize) &&
    cheekSize > 0
        ? `
            <div class="result-row">

                <span>Equivalent CLR</span>

                <strong>
                    ${(centerlineRadius / cheekSize).toFixed(2)}× CLR
                </strong>

            </div>
        `
        : ""
}

        <div class="result-row">

            <span>Centerline Rise</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    centerlineRise
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Centerline Travel</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    centerlineTravel
                )}
            </strong>

        </div>

        <div class="result-row">

            <span>Straight Between Elbows</span>

            <strong>
                ${formatSheetMetalMeasurement(
                    straightBetweenElbows
                )}
            </strong>

        </div>

    `;

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