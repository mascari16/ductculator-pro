// =====================================================
// DUCTCULATOR PRO
// airflow.js
// Version 0.2
// =====================================================

// ------------------------------------
// Constant Velocity Calculator
// ------------------------------------

function calculateConstantVelocity(cfm, targetVelocity) {

    cfm = Number(cfm);
    targetVelocity = Number(targetVelocity);

    if (cfm <= 0 || targetVelocity <= 0) {

        return null;

    }

    // Required Area (sq ft)

    const requiredAreaValue = requiredArea(cfm, targetVelocity);

    // Exact Diameter

    const exactDiameter = diameterFromArea(requiredAreaValue);

    // Nearest Standard Round

    const round = nearestRound(exactDiameter);

    // Actual Area and Velocity

   // Always calculate using the exact diameter first
let actualArea = roundArea(exactDiameter);
let actualVelocity = calculateVelocity(cfm, actualArea);

// If a standard round exists, use that instead
if (round !== null) {

    actualArea = roundArea(round);
    actualVelocity = calculateVelocity(cfm, actualArea);

}

    return {

        cfm,

        targetVelocity,

        requiredArea: requiredAreaValue,

        exactDiameter,

        round,

        actualArea,

        actualVelocity

    };

}

// ------------------------------------
// Build Results HTML
// ------------------------------------

function buildResults(data) {

    const rectangles = getRectangleOptions(
        data.requiredArea,
        data.targetVelocity,
        data.cfm
    );

    console.log("Rectangles:", rectangles);

    const ovals = getFlatOvalOptions(
        data.requiredArea,
        data.targetVelocity,
        data.cfm
    );

    return `

<div class="result-card">

    <div class="result-header">

    ${data.round === null ? `

        <div class="warning-banner">

            ⚠ CUSTOM DUCT REQUIRED

        </div>

        <h2>

            ${data.exactDiameter.toFixed(2)}"

        </h2>

        <p>

            Required diameter exceeds the largest standard round duct (96"). Use a custom round, rectangular, or flat oval duct.

        </p>

    ` : `

        <h2>

            ${data.round}" ROUND

        </h2>

        <p>

            Recommended Standard Round Duct

        </p>

    `}

</div>

    <div class="result-grid">

        <div class="result-box">

            <div class="box-label">

                📐 Exact Diameter

            </div>

            <div class="box-value diameter">

                ${data.exactDiameter.toFixed(2)}"

            </div>

        </div>

        <div class="result-box">

            <div class="box-label">

                💨 Actual Velocity

            </div>

            <div class="box-value velocity">

                ${data.actualVelocity === null
    ? "Custom"
    : `${Math.round(data.actualVelocity)} FPM`}

            </div>

        </div>

        <div class="result-box">

            <div class="box-label">

                📦 Required Area

            </div>

            <div class="box-value area">

                ${data.actualArea === null
    ? "Custom"
    : `${data.actualArea.toFixed(3)} ft²`}

            </div>

        </div>

        <div class="result-box">

            <div class="box-label">

                📊 Actual Area

            </div>

            <div class="box-value area">

            ${data.requiredArea.toFixed(3)} ft²

            </div>

        </div>

    </div>

<div class="section-title">

    📊 Duct Analysis

</div>

<div class="analysis-grid">

    <div class="analysis-item">

        <span>Round Duct</span>

        <strong class="diameter">

            ${data.round === null
    ? `${data.exactDiameter.toFixed(2)}" (Custom)`
    : `${data.round}"`}

        </strong>

    </div>

    <div class="analysis-item">

        <span>Target Velocity</span>

        <strong class="velocity">

            ${data.targetVelocity} FPM

        </strong>

    </div>

    <div class="analysis-item">

        <span>Actual Velocity</span>

        <strong class="velocity">

            ${Math.round(data.actualVelocity)} FPM

        </strong>

    </div>

    <div class="analysis-item">

        <span>Velocity Error</span>

        <strong>

            ${(data.actualVelocity - data.targetVelocity).toFixed(0)} FPM

        </strong>

    </div>

    <div class="analysis-item">

        <span>Area Difference</span>

        <strong>

            ${(((data.actualArea-data.requiredArea)/data.requiredArea)*100).toFixed(2)}%

        </strong>

    </div>

</div>

    <div class="section-title">

    📐 Duct Options

</div>

<div class="options-grid">

    <!-- =========================
         RECTANGLE OPTIONS
    ========================== -->

    <div class="options-card">

        <h3>

            ▭ Rectangle

        </h3>

        <table class="options-table">

            <thead>

                <tr>

                    <th>Size</th>

                    <th>Area Δ</th>

                    <th>Velocity</th>

                </tr>

            </thead>

            <tbody>

${rectangles
    .filter(rect => rect)
    .map(rect => `

<tr>

    <td>${rect.width}" × ${rect.height}"</td>

    <td class="${
        Math.abs(rect.areaDifference) <= 2 ? "good" :
        Math.abs(rect.areaDifference) <= 5 ? "okay" :
        Math.abs(rect.areaDifference) <= 10 ? "warn" :
        "bad"
    }">

        ${rect.areaDifference > 0 ? "+" : ""}${rect.areaDifference.toFixed(2)}%

    </td>

    <td>

        ${Math.round(rect.velocity)} FPM

    </td>

</tr>

`).join("")}

</tbody>

        </table>

    </div>

   <!-- =========================
     FLAT OVAL OPTIONS
========================== -->

<div class="options-card">

    <h3>

        ⬭ Flat Oval

    </h3>

    <table class="options-table">

        <thead>

            <tr>

                <th>Size</th>

                <th>Area Δ</th>

                <th>Velocity</th>

            </tr>

        </thead>

        <tbody>

${ovals
    .filter(oval => oval)
    .map(oval => `

<tr>

    <td>${oval.width}" × ${oval.height}"</td>

    <td class="${
        Math.abs(oval.areaDifference) <= 2 ? "good" :
        Math.abs(oval.areaDifference) <= 5 ? "okay" :
        Math.abs(oval.areaDifference) <= 10 ? "warn" :
        "bad"
    }">

        ${oval.areaDifference > 0 ? "+" : ""}
        ${oval.areaDifference.toFixed(2)}%

    </td>

    <td>

        ${Math.round(oval.velocity)} FPM

    </td>

</tr>

`).join("")}

        </tbody>

    </table>

</div>

<!-- =========================
     ENGINEERING BREAKDOWN
========================= -->

<details class="engineering-breakdown">

    <summary>

        🧮 Engineering Breakdown

    </summary>

    <div class="breakdown-content">

    <div class="breakdown-method">

        <span>Calculation Method</span>

        <strong>Constant Velocity</strong>

    </div>

    <div class="breakdown-step">

        <h4>1. Required Cross-Sectional Area</h4>

        <p class="formula-label">Formula</p>

        <code>
            Area = CFM ÷ Velocity
        </code>

        <p class="formula-label">Substitute Values</p>

        <code>
            Area = ${data.cfm.toFixed(0)} CFM ÷
            ${data.targetVelocity.toFixed(0)} FPM
        </code>

        <p class="formula-label">Result</p>

        <code>
            Area = ${data.requiredArea.toFixed(3)} ft²
        </code>

        <p class="formula-note">
            Required area in square inches:
            ${(data.requiredArea * 144).toFixed(2)} in²
        </p>

    </div>

    <div class="breakdown-step">

        <h4>2. Exact Round Diameter</h4>

        <p class="formula-label">Circle Area Formula</p>

        <code>
            A = π × r²
        </code>

        <p class="formula-label">Solve for Diameter</p>

        <code>
            D = 2 × √(A ÷ π)
        </code>

        <p class="formula-label">Convert Feet to Inches</p>

        <code>
            D = 2 × √(${data.requiredArea.toFixed(3)} ÷ π) × 12
        </code>

        <p class="formula-label">Result</p>

        <code>
            D = ${data.exactDiameter.toFixed(2)}"
        </code>

    </div>

    <div class="breakdown-step">

        <h4>3. Standard Round Selection</h4>

        <div class="breakdown-row">

            <span>Exact Calculated Diameter</span>

            <strong>${data.exactDiameter.toFixed(2)}"</strong>

        </div>

        <div class="breakdown-row">

            <span>Selected Standard Diameter</span>

            <strong>
                ${data.round === null
                    ? `${data.exactDiameter.toFixed(2)}" Custom`
                    : `${data.round}"`}
            </strong>

        </div>

        <div class="breakdown-row">

            <span>Diameter Difference</span>

            <strong>
                ${data.round === null
                    ? "0.00\""
                    : `${(data.round - data.exactDiameter >= 0 ? "+" : "")}${(data.round - data.exactDiameter).toFixed(2)}"`}
            </strong>

        </div>

    </div>

    <div class="breakdown-step">

        <h4>4. Actual Area of Selected Round Duct</h4>

        <p class="formula-label">Formula</p>

        <code>
            Area = π × r²
        </code>

        <p class="formula-label">Radius in Feet</p>

        <code>
            Radius =
            ${
                data.round === null
                    ? `${data.exactDiameter.toFixed(2)} ÷ 24`
                    : `${data.round} ÷ 24`
            }
        </code>

        <p class="formula-label">Substitute Values</p>

        <code>
            Area = π ×
            (${
                data.round === null
                    ? `${(data.exactDiameter / 24).toFixed(4)}`
                    : `${(data.round / 24).toFixed(4)}`
            })²
        </code>

        <p class="formula-label">Result</p>

        <code>
            Area = ${data.actualArea.toFixed(3)} ft²
        </code>

        <p class="formula-note">
            Actual area in square inches:
            ${(data.actualArea * 144).toFixed(2)} in²
        </p>

    </div>

    <div class="breakdown-step">

        <h4>5. Actual Air Velocity</h4>

        <p class="formula-label">Formula</p>

        <code>
            Velocity = CFM ÷ Area
        </code>

        <p class="formula-label">Substitute Values</p>

        <code>
            Velocity =
            ${data.cfm.toFixed(0)} CFM ÷
            ${data.actualArea.toFixed(3)} ft²
        </code>

        <p class="formula-label">Result</p>

        <code>
            Velocity = ${Math.round(data.actualVelocity)} FPM
        </code>

    </div>

    <div class="breakdown-step">

        <h4>6. Velocity Difference</h4>

        <p class="formula-label">Formula</p>

        <code>
            Velocity Difference =
            Actual Velocity − Target Velocity
        </code>

        <p class="formula-label">Substitute Values</p>

        <code>
            Velocity Difference =
            ${Math.round(data.actualVelocity)} −
            ${data.targetVelocity.toFixed(0)}
        </code>

        <p class="formula-label">Result</p>

        <code>
            Velocity Difference =
            ${data.actualVelocity - data.targetVelocity >= 0 ? "+" : ""}
            ${(data.actualVelocity - data.targetVelocity).toFixed(0)} FPM
        </code>

        <p class="formula-note">
            Percent difference:
            ${(
                ((data.actualVelocity - data.targetVelocity) /
                data.targetVelocity) * 100
            ).toFixed(2)}%
        </p>

    </div>

    <div class="breakdown-step">

        <h4>7. Area Difference</h4>

        <p class="formula-label">Formula</p>

        <code>
            Area Difference % =
            ((Actual Area − Required Area) ÷ Required Area) × 100
        </code>

        <p class="formula-label">Substitute Values</p>

        <code>
            Area Difference % =
            ((${data.actualArea.toFixed(3)} −
            ${data.requiredArea.toFixed(3)}) ÷
            ${data.requiredArea.toFixed(3)}) × 100
        </code>

        <p class="formula-label">Result</p>

        <code>
            Area Difference =
            ${data.actualArea - data.requiredArea >= 0 ? "+" : ""}
            ${(
                ((data.actualArea - data.requiredArea) /
                data.requiredArea) * 100
            ).toFixed(2)}%
        </code>

    </div>

    <div class="breakdown-step">

        <h4>8. Final Result Summary</h4>

        <div class="breakdown-row">

            <span>Airflow</span>

            <strong>${data.cfm.toFixed(0)} CFM</strong>

        </div>

        <div class="breakdown-row">

            <span>Target Velocity</span>

            <strong>${data.targetVelocity.toFixed(0)} FPM</strong>

        </div>

        <div class="breakdown-row">

            <span>Required Area</span>

            <strong>${data.requiredArea.toFixed(3)} ft²</strong>

        </div>

        <div class="breakdown-row">

            <span>Exact Diameter</span>

            <strong>${data.exactDiameter.toFixed(2)}"</strong>

        </div>

        <div class="breakdown-row">

            <span>Selected Round</span>

            <strong>
                ${data.round === null
                    ? `${data.exactDiameter.toFixed(2)}" Custom`
                    : `${data.round}"`}
            </strong>

        </div>

        <div class="breakdown-row">

            <span>Actual Area</span>

            <strong>${data.actualArea.toFixed(3)} ft²</strong>

        </div>

        <div class="breakdown-row">

            <span>Actual Velocity</span>

            <strong>${Math.round(data.actualVelocity)} FPM</strong>

        </div>

    </div>

</div>

</details>

`;

}