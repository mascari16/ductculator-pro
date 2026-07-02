// ==========================================
// DUCTCULATOR PRO
// Airflow Calculator Engine
// ==========================================

// ------------------------------------------
// Constant Velocity Calculator
// ------------------------------------------

function calculateConstantVelocity(cfm, targetVelocity) {

    cfm = Number(cfm);
    targetVelocity = Number(targetVelocity);

    if (cfm <= 0 || targetVelocity <= 0) {

        return null;

    }

    // Required duct area
    const area = requiredArea(cfm, targetVelocity);

    // Exact diameter
    const exactDiameter = diameterFromArea(area);

    // Nearest standard round
    const round = nearestRound(exactDiameter);

    // Actual area using standard size
    const actualArea = roundArea(round);

    // Actual velocity
    const actualVelocity = calculateVelocity(cfm, actualArea);

    return {

        cfm,

        targetVelocity,

        exactDiameter,

        round,

        area: actualArea,

        actualVelocity

    };

}