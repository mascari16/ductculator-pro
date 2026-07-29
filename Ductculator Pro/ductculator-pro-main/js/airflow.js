// =====================================================
// DUCTCULATOR PRO
// airflow.js
// Airflow sizing engines and result builders
// =====================================================

function signedPercent(value) {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function differenceClass(value) {
    const difference = Math.abs(value);

    if (difference <= 2) return "good";
    if (difference <= 5) return "okay";
    if (difference <= 10) return "warn";
    return "bad";
}

function selectedRoundLabel(data) {
    return data.round === null
        ? `${data.exactDiameter.toFixed(2)}\" Custom`
        : `${data.round}\"`;
}

function buildRoundHeader(data, subtitle) {
    if (data.round === null) {
        return `
            <div class="warning-banner">⚠ CUSTOM DUCT REQUIRED</div>
            <h2>${data.exactDiameter.toFixed(2)}\"</h2>
            <p>
                Required diameter exceeds the largest standard round duct
                (96\"). Use a custom round, rectangular, or flat oval duct.
            </p>
        `;
    }

    return `
        <h2>${data.round}\" ROUND</h2>
        <p>${subtitle}</p>
    `;
}

function buildAreaOptionsTable(title, icon, options) {
    return `
        <div class="options-card">
            <h3>${icon} ${title}</h3>
            <table class="options-table">
                <thead>
                    <tr>
                        <th>Size</th>
                        <th>Area Δ</th>
                        <th>Velocity</th>
                    </tr>
                </thead>
                <tbody>
                    ${options.map(option => `
                        <tr>
                            <td>${option.width}\" × ${option.height}\"</td>
                            <td class="${differenceClass(option.areaDifference)}">
                                ${signedPercent(option.areaDifference)}
                            </td>
                            <td>${Math.round(option.velocity)} FPM</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function calculateConstantVelocity(cfm, targetVelocity) {
    cfm = Number(cfm);
    targetVelocity = Number(targetVelocity);

    if (cfm <= 0 || targetVelocity <= 0) {
        return null;
    }

    const requiredAreaValue = requiredArea(cfm, targetVelocity);
    const exactDiameter = diameterFromArea(requiredAreaValue);
    const round = standardRoundAtOrAbove(exactDiameter);
    const selectedDiameter = round === null ? exactDiameter : round;
    const actualArea = roundArea(selectedDiameter);
    const actualVelocity = calculateVelocity(cfm, actualArea);

    return {
        method: "constantVelocity",
        cfm,
        targetVelocity,
        requiredArea: requiredAreaValue,
        exactDiameter,
        round,
        actualArea,
        actualVelocity
    };
}

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

    const velocityDifference =
        data.actualVelocity - data.targetVelocity;

    const areaDifference =
        ((data.actualArea - data.requiredArea) /
        data.requiredArea) * 100;

    return `
        <div class="result-card">
            <div class="result-header">
                ${buildRoundHeader(
                    data,
                    "Recommended Standard Round — first size at or above the exact diameter"
                )}
            </div>

            <div class="result-grid">
                <div class="result-box">
                    <div class="box-label">📐 Exact Diameter</div>
                    <div class="box-value diameter">${data.exactDiameter.toFixed(2)}\"</div>
                </div>
                <div class="result-box">
                    <div class="box-label">💨 Actual Velocity</div>
                    <div class="box-value velocity">${Math.round(data.actualVelocity)} FPM</div>
                </div>
                <div class="result-box">
                    <div class="box-label">📦 Required Area</div>
                    <div class="box-value area">${data.requiredArea.toFixed(3)} ft²</div>
                </div>
                <div class="result-box">
                    <div class="box-label">📊 Actual Area</div>
                    <div class="box-value area">${data.actualArea.toFixed(3)} ft²</div>
                </div>
            </div>

            <div class="section-title">📊 Duct Analysis</div>
            <div class="analysis-grid">
                <div class="analysis-item"><span>Round Duct</span><strong class="diameter">${selectedRoundLabel(data)}</strong></div>
                <div class="analysis-item"><span>Target Velocity</span><strong class="velocity">${Math.round(data.targetVelocity)} FPM</strong></div>
                <div class="analysis-item"><span>Actual Velocity</span><strong class="velocity">${Math.round(data.actualVelocity)} FPM</strong></div>
                <div class="analysis-item"><span>Velocity Difference</span><strong>${velocityDifference >= 0 ? "+" : ""}${velocityDifference.toFixed(0)} FPM</strong></div>
                <div class="analysis-item"><span>Area Difference</span><strong>${signedPercent(areaDifference)}</strong></div>
            </div>

            <div class="section-title">📐 Duct Options</div>
            <div class="options-grid">
                ${buildAreaOptionsTable("Rectangle", "▭", rectangles)}
                ${buildAreaOptionsTable("Flat Oval", "⬭", ovals)}
            </div>

            <details class="engineering-breakdown">
                <summary>🧮 Engineering Breakdown</summary>
                <div class="breakdown-content">
                    <div class="breakdown-method"><span>Calculation Method</span><strong>Constant Velocity</strong></div>
                    <div class="breakdown-step">
                        <h4>1. Required Cross-Sectional Area</h4>
                        <code>Area = CFM ÷ Velocity</code>
                        <code>Area = ${data.cfm.toFixed(0)} ÷ ${data.targetVelocity.toFixed(0)} = ${data.requiredArea.toFixed(3)} ft²</code>
                    </div>
                    <div class="breakdown-step">
                        <h4>2. Exact Round Diameter</h4>
                        <code>D = 2 × √(Area ÷ π) × 12</code>
                        <code>D = ${data.exactDiameter.toFixed(2)}\"</code>
                    </div>
                    <div class="breakdown-step">
                        <h4>3. Standard Selection</h4>
                        <p>
                            The recommendation uses the first standard round size
                            at or above the exact diameter so actual velocity does
                            not exceed the target because of rounding down.
                        </p>
                        <div class="breakdown-row"><span>Selected Round</span><strong>${selectedRoundLabel(data)}</strong></div>
                        <div class="breakdown-row"><span>Actual Velocity</span><strong>${Math.round(data.actualVelocity)} FPM</strong></div>
                    </div>
                </div>
            </details>
        </div>
    `;
}

function getEqualFrictionRectangleOptions(cfm, targetRate, targetDiameter) {
    const options = [];
    const seen = new Set();

    for (const rectangle of RECTANGLE_SIZES) {
        const width = Math.max(rectangle.width, rectangle.height);
        const height = Math.min(rectangle.width, rectangle.height);
        const key = `${width}x${height}`;

        if (seen.has(key)) continue;
        seen.add(key);

        const aspectRatio = width / height;
        if (aspectRatio > 8) continue;

        const equivalentDiameter = rectangleEquivalentDiameter(width, height);
        const frictionRate = roundFrictionRate(cfm, equivalentDiameter);
        const frictionDifference =
            ((frictionRate - targetRate) / targetRate) * 100;
        const equivalentDifference =
            ((equivalentDiameter - targetDiameter) / targetDiameter) * 100;
        const area = (width * height) / 144;

        options.push({
            width,
            height,
            area,
            velocity: cfm / area,
            equivalentDiameter,
            equivalentDifference,
            frictionRate,
            frictionDifference,
            aspectRatio,
            score:
                Math.abs(frictionDifference) * 8 +
                Math.abs(equivalentDifference) * 2 +
                Math.max(0, aspectRatio - 1)
        });
    }

    return options.sort((a, b) => a.score - b.score).slice(0, 5);
}

function getEqualFrictionOvalOptions(cfm, targetRate, targetDiameter) {
    const options = [];

    for (const oval of FLAT_OVAL_SIZES) {
        const width = Math.max(oval.width, oval.height);
        const height = Math.min(oval.width, oval.height);
        const aspectRatio = width / height;

        if (width <= height || aspectRatio > 8) continue;

        const equivalentDiameter = flatOvalEquivalentDiameter(width, height);
        const frictionRate = roundFrictionRate(cfm, equivalentDiameter);
        const frictionDifference =
            ((frictionRate - targetRate) / targetRate) * 100;
        const equivalentDifference =
            ((equivalentDiameter - targetDiameter) / targetDiameter) * 100;
        const area = flatOvalAreaSquareInches(width, height) / 144;

        options.push({
            width,
            height,
            area,
            velocity: cfm / area,
            equivalentDiameter,
            equivalentDifference,
            frictionRate,
            frictionDifference,
            aspectRatio,
            score:
                Math.abs(frictionDifference) * 8 +
                Math.abs(equivalentDifference) * 2 +
                Math.max(0, aspectRatio - 1)
        });
    }

    return options.sort((a, b) => a.score - b.score).slice(0, 5);
}

function calculateEqualFriction(cfm, targetFrictionRate) {
    cfm = Number(cfm);
    targetFrictionRate = Number(targetFrictionRate);

    if (cfm <= 0 || targetFrictionRate <= 0) {
        return null;
    }

    const exactDiameter =
        roundDiameterForFriction(cfm, targetFrictionRate);
    const round = standardRoundAtOrAbove(exactDiameter);
    const selectedDiameter = round === null ? exactDiameter : round;
    const actualArea = roundArea(selectedDiameter);
    const actualVelocity = cfm / actualArea;
    const actualFrictionRate =
        roundFrictionRate(cfm, selectedDiameter);

    return {
        method: "equalFriction",
        cfm,
        targetFrictionRate,
        exactDiameter,
        round,
        actualArea,
        actualVelocity,
        actualFrictionRate
    };
}

function buildFrictionOptionsTable(title, icon, options) {
    return `
        <div class="options-card">
            <h3>${icon} ${title}</h3>
            <table class="options-table">
                <thead>
                    <tr>
                        <th>Size</th>
                        <th>Friction Δ</th>
                        <th>Velocity</th>
                    </tr>
                </thead>
                <tbody>
                    ${options.map(option => `
                        <tr>
                            <td>${option.width}\" × ${option.height}\"</td>
                            <td class="${differenceClass(option.frictionDifference)}">${signedPercent(option.frictionDifference)}</td>
                            <td>${Math.round(option.velocity)} FPM</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function buildEqualFrictionResults(data) {
    const rectangles = getEqualFrictionRectangleOptions(
        data.cfm,
        data.targetFrictionRate,
        data.exactDiameter
    );
    const ovals = getEqualFrictionOvalOptions(
        data.cfm,
        data.targetFrictionRate,
        data.exactDiameter
    );
    const frictionDifference =
        ((data.actualFrictionRate - data.targetFrictionRate) /
        data.targetFrictionRate) * 100;

    return `
        <div class="result-card">
            <div class="result-header">
                ${buildRoundHeader(
                    data,
                    "Recommended Standard Round — sized not to exceed the target friction rate"
                )}
            </div>

            <div class="result-grid">
                <div class="result-box"><div class="box-label">📐 Exact Diameter</div><div class="box-value diameter">${data.exactDiameter.toFixed(2)}\"</div></div>
                <div class="result-box"><div class="box-label">💨 Actual Velocity</div><div class="box-value velocity">${Math.round(data.actualVelocity)} FPM</div></div>
                <div class="result-box"><div class="box-label">🎯 Target Friction</div><div class="box-value friction">${data.targetFrictionRate.toFixed(3)}</div></div>
                <div class="result-box"><div class="box-label">📉 Actual Friction</div><div class="box-value friction">${data.actualFrictionRate.toFixed(3)}</div></div>
            </div>

            <div class="section-title">📊 Duct Analysis</div>
            <div class="analysis-grid">
                <div class="analysis-item"><span>Airflow</span><strong>${data.cfm.toFixed(0)} CFM</strong></div>
                <div class="analysis-item"><span>Selected Round</span><strong class="diameter">${selectedRoundLabel(data)}</strong></div>
                <div class="analysis-item"><span>Friction Difference</span><strong>${signedPercent(frictionDifference)}</strong></div>
                <div class="analysis-item"><span>Actual Area</span><strong>${data.actualArea.toFixed(3)} ft²</strong></div>
            </div>

            <div class="section-title">📐 Equal-Friction Options</div>
            <div class="options-grid">
                ${buildFrictionOptionsTable("Rectangle", "▭", rectangles)}
                ${buildFrictionOptionsTable("Flat Oval", "⬭", ovals)}
            </div>

            <details class="engineering-breakdown">
                <summary>🧮 Engineering Breakdown</summary>
                <div class="breakdown-content">
                    <div class="breakdown-method"><span>Calculation Method</span><strong>Equal Friction</strong></div>
                    <div class="breakdown-step">
                        <h4>1. Solve Exact Round Diameter</h4>
                        <code>FR = 0.109136 × CFM^1.9 ÷ D^5.02</code>
                        <code>D = (0.109136 × CFM^1.9 ÷ FR)^(1 ÷ 5.02)</code>
                        <code>D = ${data.exactDiameter.toFixed(2)}\"</code>
                    </div>
                    <div class="breakdown-step">
                        <h4>2. Select Standard Diameter</h4>
                        <p>
                            The next standard diameter at or above the exact
                            requirement is selected so the recommended round
                            does not exceed the requested friction rate.
                        </p>
                        <div class="breakdown-row"><span>Selected Round</span><strong>${selectedRoundLabel(data)}</strong></div>
                        <div class="breakdown-row"><span>Actual Friction</span><strong>${data.actualFrictionRate.toFixed(3)} in. w.g./100 ft</strong></div>
                    </div>
                </div>
            </details>
        </div>
    `;
}

function calculateStaticRegain(
    cfm,
    enteringVelocity,
    desiredStaticRegain,
    regainEfficiencyPercent
) {
    cfm = Number(cfm);
    enteringVelocity = Number(enteringVelocity);
    desiredStaticRegain = Number(desiredStaticRegain);
    regainEfficiencyPercent = Number(regainEfficiencyPercent);

    if (
        cfm <= 0 ||
        enteringVelocity <= 0 ||
        desiredStaticRegain <= 0 ||
        regainEfficiencyPercent <= 0 ||
        regainEfficiencyPercent > 100
    ) {
        return null;
    }

    const regainEfficiency = regainEfficiencyPercent / 100;
    const enteringVelocityPressure = velocityPressure(enteringVelocity);
    const requiredVelocityPressureDrop =
        desiredStaticRegain / regainEfficiency;
    const targetVelocityPressure =
        enteringVelocityPressure - requiredVelocityPressureDrop;

    if (targetVelocityPressure <= 0) {
        return {
            invalidReason:
                "The requested regain is greater than the available velocity pressure at the selected entering velocity and efficiency."
        };
    }

    const targetVelocity = velocityFromPressure(targetVelocityPressure);
    const requiredAreaValue = requiredArea(cfm, targetVelocity);
    const exactDiameter = diameterFromArea(requiredAreaValue);
    const round = standardRoundAtOrAbove(exactDiameter);
    const selectedDiameter = round === null ? exactDiameter : round;
    const actualArea = roundArea(selectedDiameter);
    const actualVelocity = cfm / actualArea;
    const actualVelocityPressure = velocityPressure(actualVelocity);
    const actualStaticRegain = Math.max(
        0,
        regainEfficiency *
        (enteringVelocityPressure - actualVelocityPressure)
    );

    return {
        method: "staticRegain",
        cfm,
        enteringVelocity,
        desiredStaticRegain,
        regainEfficiencyPercent,
        regainEfficiency,
        enteringVelocityPressure,
        requiredVelocityPressureDrop,
        targetVelocityPressure,
        targetVelocity,
        requiredArea: requiredAreaValue,
        exactDiameter,
        round,
        actualArea,
        actualVelocity,
        actualVelocityPressure,
        actualStaticRegain
    };
}

function addStaticRegainToOptions(
    options,
    enteringVelocityPressure,
    regainEfficiency,
    desiredStaticRegain
) {
    return options.map(option => {
        const actualVelocityPressure = velocityPressure(option.velocity);
        const actualStaticRegain = Math.max(
            0,
            regainEfficiency *
            (enteringVelocityPressure - actualVelocityPressure)
        );
        const regainDifference =
            ((actualStaticRegain - desiredStaticRegain) /
            desiredStaticRegain) * 100;

        return {
            ...option,
            actualStaticRegain,
            regainDifference
        };
    });
}

function buildStaticOptionsTable(title, icon, options) {
    return `
        <div class="options-card">
            <h3>${icon} ${title}</h3>
            <table class="options-table">
                <thead>
                    <tr>
                        <th>Size</th>
                        <th>Regain</th>
                        <th>Velocity</th>
                    </tr>
                </thead>
                <tbody>
                    ${options.map(option => `
                        <tr>
                            <td>${option.width}\" × ${option.height}\"</td>
                            <td class="${differenceClass(option.regainDifference)}">${option.actualStaticRegain.toFixed(3)} in.</td>
                            <td>${Math.round(option.velocity)} FPM</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function buildStaticRegainResults(data) {
    const rectangles = addStaticRegainToOptions(
        getRectangleOptions(data.requiredArea, data.targetVelocity, data.cfm),
        data.enteringVelocityPressure,
        data.regainEfficiency,
        data.desiredStaticRegain
    );
    const ovals = addStaticRegainToOptions(
        getFlatOvalOptions(data.requiredArea, data.targetVelocity, data.cfm),
        data.enteringVelocityPressure,
        data.regainEfficiency,
        data.desiredStaticRegain
    );
    const regainDifference =
        ((data.actualStaticRegain - data.desiredStaticRegain) /
        data.desiredStaticRegain) * 100;

    return `
        <div class="result-card">
            <div class="result-header">
                ${buildRoundHeader(
                    data,
                    "Single-step static-regain sizing at standard-air density"
                )}
            </div>

            <div class="result-grid">
                <div class="result-box"><div class="box-label">🎯 Target Velocity</div><div class="box-value velocity">${Math.round(data.targetVelocity)} FPM</div></div>
                <div class="result-box"><div class="box-label">💨 Actual Velocity</div><div class="box-value velocity">${Math.round(data.actualVelocity)} FPM</div></div>
                <div class="result-box"><div class="box-label">🎯 Desired Regain</div><div class="box-value friction">${data.desiredStaticRegain.toFixed(3)} in.</div></div>
                <div class="result-box"><div class="box-label">📈 Actual Regain</div><div class="box-value friction">${data.actualStaticRegain.toFixed(3)} in.</div></div>
            </div>

            <div class="section-title">📊 Static Regain Analysis</div>
            <div class="analysis-grid">
                <div class="analysis-item"><span>Entering Velocity</span><strong>${Math.round(data.enteringVelocity)} FPM</strong></div>
                <div class="analysis-item"><span>Entering Velocity Pressure</span><strong>${data.enteringVelocityPressure.toFixed(3)} in.</strong></div>
                <div class="analysis-item"><span>Regain Efficiency</span><strong>${data.regainEfficiencyPercent.toFixed(0)}%</strong></div>
                <div class="analysis-item"><span>Regain Difference</span><strong>${signedPercent(regainDifference)}</strong></div>
                <div class="analysis-item"><span>Required Area</span><strong>${data.requiredArea.toFixed(3)} ft²</strong></div>
            </div>

            <div class="section-title">📐 Duct Options</div>
            <div class="options-grid">
                ${buildStaticOptionsTable("Rectangle", "▭", rectangles)}
                ${buildStaticOptionsTable("Flat Oval", "⬭", ovals)}
            </div>

            <details class="engineering-breakdown">
                <summary>🧮 Engineering Breakdown</summary>
                <div class="breakdown-content">
                    <div class="breakdown-method"><span>Calculation Method</span><strong>Static Regain</strong></div>
                    <div class="breakdown-step">
                        <h4>1. Entering Velocity Pressure</h4>
                        <code>VP₁ = (Velocity ÷ 4005)²</code>
                        <code>VP₁ = ${data.enteringVelocityPressure.toFixed(3)} in. w.g.</code>
                    </div>
                    <div class="breakdown-step">
                        <h4>2. Required Velocity Reduction</h4>
                        <code>Static Regain = Efficiency × (VP₁ − VP₂)</code>
                        <code>Target downstream velocity = ${Math.round(data.targetVelocity)} FPM</code>
                    </div>
                    <div class="breakdown-step">
                        <h4>3. Important Use Note</h4>
                        <p>
                            This is a single-step sizing aid. A full static-regain
                            design should still be checked through each downstream
                            section using the actual fittings, pressure losses,
                            airflow changes, and available fan pressure.
                        </p>
                    </div>
                </div>
            </details>
        </div>
    `;
}
