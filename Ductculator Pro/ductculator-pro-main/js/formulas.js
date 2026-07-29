// ==========================================
// DUCTCULATOR PRO
// Engineering Formula Library
// ==========================================

// Standard round duct diameters (inches)
const STANDARD_ROUND = [
    4, 5, 6, 7, 8, 9, 10, 11, 12,
    13, 14, 15, 16, 17, 18,
    20, 22, 24, 26, 28,
    30, 32, 34, 36, 38,
    40, 42, 44, 46, 48,
    50, 52, 54, 56, 58,
    60, 62, 64, 66, 68,
    70, 72, 74, 76, 78,
    80, 84, 90, 96
];

// Round area (square feet)
function roundArea(diameter) {
    const radiusFeet = diameter / 24;
    return Math.PI * radiusFeet * radiusFeet;
}

// Required area (square feet)
function requiredArea(cfm, velocity) {
    return cfm / velocity;
}

// Diameter from area (inches)
function diameterFromArea(area) {
    return Math.sqrt((4 * area) / Math.PI) * 12;
}

// Velocity (FPM)
function calculateVelocity(cfm, area) {
    return cfm / area;
}

/*
 * Conservative standard-round selection.
 * Select the first standard diameter at or above the exact requirement.
 * This prevents the recommended duct from exceeding the requested
 * velocity or friction rate merely because a smaller size was closer.
 */
function standardRoundAtOrAbove(exactDiameter) {
    if (!Number.isFinite(exactDiameter) || exactDiameter <= 0) {
        return null;
    }

    for (const size of STANDARD_ROUND) {
        if (size >= exactDiameter - 1e-9) {
            return size;
        }
    }

    return null;
}

// Backward-compatible name retained for future files.
function nearestRound(exactDiameter) {
    return standardRoundAtOrAbove(exactDiameter);
}

/*
 * Equal-friction round-duct approximation for standard air:
 * friction rate = 0.109136 × CFM^1.9 ÷ diameter^5.02
 * Result: inches water gauge per 100 feet.
 */
const ROUND_FRICTION_COEFFICIENT = 0.109136;

function roundFrictionRate(cfm, diameter) {
    cfm = Number(cfm);
    diameter = Number(diameter);

    if (cfm <= 0 || diameter <= 0) {
        return NaN;
    }

    return (
        ROUND_FRICTION_COEFFICIENT *
        Math.pow(cfm, 1.9) /
        Math.pow(diameter, 5.02)
    );
}

function roundDiameterForFriction(cfm, frictionRate) {
    cfm = Number(cfm);
    frictionRate = Number(frictionRate);

    if (cfm <= 0 || frictionRate <= 0) {
        return NaN;
    }

    return Math.pow(
        ROUND_FRICTION_COEFFICIENT *
        Math.pow(cfm, 1.9) /
        frictionRate,
        1 / 5.02
    );
}

// Velocity pressure at standard-air density (inches water gauge).
function velocityPressure(velocity) {
    velocity = Number(velocity);

    if (velocity < 0 || !Number.isFinite(velocity)) {
        return NaN;
    }

    return Math.pow(velocity / 4005, 2);
}

function velocityFromPressure(pressure) {
    pressure = Number(pressure);

    if (pressure < 0 || !Number.isFinite(pressure)) {
        return NaN;
    }

    return 4005 * Math.sqrt(pressure);
}
