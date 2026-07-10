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

    const rectangles = getRectangleOptions(
        data.requiredArea,
        data.targetVelocity,
        data.cfm
    );

    const ovals = getFlatOvalOptions(
        data.requiredArea,
        data.targetVelocity,
        data.cfm
    );

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

                <tr>

                    <td>48 × 24</td>

                    <td class="good">+0.18%</td>

                    <td>1198</td>

                </tr>

                <tr>

                    <td>50 × 22</td>

                    <td class="good">+0.42%</td>

                    <td>1205</td>

                </tr>

                <tr>

                    <td>54 × 20</td>

                    <td class="okay">+0.83%</td>

                    <td>1187</td>

                </tr>

                <tr>

                    <td>42 × 28</td>

                    <td class="warn">+1.38%</td>

                    <td>1212</td>

                </tr>

                <tr>

                    <td>60 × 18</td>

                    <td class="bad">+2.17%</td>

                    <td>1174</td>

                </tr>

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

                <tr>

                    <td>52 × 20</td>

                    <td class="good">+0.14%</td>

                    <td>1199</td>

                </tr>

                <tr>

                    <td>54 × 18</td>

                    <td class="good">+0.39%</td>

                    <td>1204</td>

                </tr>

                <tr>

                    <td>48 × 22</td>

                    <td class="okay">+0.71%</td>

                    <td>1188</td>

                </tr>

                <tr>

                    <td>56 × 18</td>

                    <td class="warn">+1.44%</td>

                    <td>1210</td>

                </tr>

                <tr>

                    <td>60 × 16</td>

                    <td class="bad">+2.09%</td>

                    <td>1176</td>

                </tr>

            </tbody>

        </table>

    </div>

</div>

<div class="section-title">

    📊 Duct Analysis

</div>

<div class="analysis-grid">

    <div class="analysis-item">

        <span>Round Duct</span>

        <strong class="diameter">

            ${data.round}"

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

`;

}