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

    // Actual Area

    const actualArea = roundArea(round);

    // Actual Velocity

    const actualVelocity = calculateVelocity(cfm, actualArea);

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

    return `

<div class="result-card">

    <div class="result-header">

        <h2>${data.round}" ROUND</h2>

        <p>Recommended Standard Round Duct</p>

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

                ${Math.round(data.actualVelocity)} FPM

            </div>

        </div>

        <div class="result-box">

            <div class="box-label">

                📦 Required Area

            </div>

            <div class="box-value area">

                ${data.requiredArea.toFixed(3)} ft²

            </div>

        </div>

        <div class="result-box">

            <div class="box-label">

                📊 Actual Area

            </div>

            <div class="box-value area">

                ${data.actualArea.toFixed(3)} ft²

            </div>

        </div>

    </div>

    <div class="section-title">

        📐 Equivalent Sizes

    </div>

    <table class="equivalent-table">

        <thead>

            <tr>

                <th>Shape</th>

                <th>Size</th>

                <th>Status</th>

            </tr>

        </thead>

        <tbody>

            <tr>

                <td>⭕ Round</td>

                <td>${data.round}"</td>

                <td style="color:#22c55e;">Recommended</td>

            </tr>

            <tr>

                <td>▭ Rectangle</td>

                <td>Coming Soon</td>

                <td style="color:#f59e0b;">Pending</td>

            </tr>

            <tr>

                <td>⬭ Flat Oval</td>

                <td>Coming Soon</td>

                <td style="color:#f59e0b;">Pending</td>

            </tr>

        </tbody>

    </table>

    <div class="section-title">

        ⚙ Engineering Details

    </div>

    <div class="engineering">

        <div class="engineering-row">

            <span>Target Velocity</span>

            <strong class="velocity">

                ${data.targetVelocity} FPM

            </strong>

        </div>

        <div class="engineering-row">

            <span>Required Area</span>

            <strong class="area">

                ${data.requiredArea.toFixed(3)} ft²

            </strong>

        </div>

        <div class="engineering-row">

            <span>Actual Area</span>

            <strong class="area">

                ${data.actualArea.toFixed(3)} ft²

            </strong>

        </div>

        <div class="engineering-row">

            <span>Exact Diameter</span>

            <strong class="diameter">

                ${data.exactDiameter.toFixed(2)}"

            </strong>

        </div>

        <div class="engineering-row">

            <span>Recommended Round</span>

            <strong style="color:#4f8cff;">

                ${data.round}"

            </strong>

        </div>

        <div class="engineering-row">

            <span>Actual Velocity</span>

            <strong class="velocity">

                ${Math.round(data.actualVelocity)} FPM

            </strong>

        </div>

    </div>

</div>

`;

}