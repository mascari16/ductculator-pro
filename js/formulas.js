// ==========================================
// DUCTCULATOR PRO
// Engineering Formula Library
// ==========================================

// Standard round duct diameters (inches)
const STANDARD_ROUND = [
    4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
    19,20,21,22,23,24,26,28,30,32,34,36,
    38,40,42,44,46,48,50,52,54,56,58,60
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

    for (const size of STANDARD_ROUND){

        if(size >= exactDiameter){

            return size;

        }

    }

    return STANDARD_ROUND[STANDARD_ROUND.length-1];

}