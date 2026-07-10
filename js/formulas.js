// ==========================================
// DUCTCULATOR PRO
// Engineering Formula Library
// ==========================================

// Standard round duct diameters (inches)
const STANDARD_ROUND = [
    4,5,6,7,8,9,10,11,12,
    13,14,15,16,17,18,
    20,22,24,26,28,
    30,32,34,36,38,
    40,42,44,46,48,
    50,52,54,56,58,
    60,62,64,66,68,
    70,72,74,76,78,
    80,84,90,96
];

// ------------------------------------------
// Round Area (square feet)
// ------------------------------------------
function roundArea(diameter){

    const radiusFeet = (diameter / 12) / 2;

    return Math.PI * radiusFeet * radiusFeet;

}

// ------------------------------------------
// Required Area (sq ft)
// ------------------------------------------
function requiredArea(cfm, velocity){

    return cfm / velocity;

}

// ------------------------------------------
// Diameter From Area (inches)
// ------------------------------------------
function diameterFromArea(area){

    return Math.sqrt((4 * area) / Math.PI) * 12;

}

// ------------------------------------------
// Velocity (FPM)
// ------------------------------------------
function calculateVelocity(cfm, area){

    return cfm / area;

}

// ------------------------------------------
// Nearest Standard Round
// ------------------------------------------
function nearestRound(exactDiameter){

    // Smaller than smallest available
    if(exactDiameter < STANDARD_ROUND[0]){

        return null;

    }

    // Larger than largest standard size
    if(exactDiameter > STANDARD_ROUND[STANDARD_ROUND.length - 1]){

        return null;

    }

    let closest = STANDARD_ROUND[0];

    for(const size of STANDARD_ROUND){

        if(
            Math.abs(size - exactDiameter) <
            Math.abs(closest - exactDiameter)
        ){

            closest = size;

        }

    }

    return closest;

}