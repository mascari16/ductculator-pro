// =====================================================
// DUCTCULATOR PRO
// equivalentSizes.js
// Equivalent Duct Size Engine
// =====================================================


// ------------------------------------
// Rectangle Friction-Equivalent Round Diameter
// ------------------------------------

/*
 * Friction-equivalent round diameter for equal-friction comparison.
 * This is intentionally different from hydraulic diameter (4A/P),
 * which ASHRAE uses for many fitting-loss coefficient definitions.
 */
function rectangleEquivalentDiameter(width, height) {

    const areaSquareInches =
        width * height;

    return (
        1.30 *
        Math.pow(areaSquareInches, 0.625) /
        Math.pow(width + height, 0.25)
    );

}


// ------------------------------------
// Flat Oval Area — Square Inches
// ------------------------------------

function flatOvalAreaSquareInches(width, height) {

    return (
        ((width - height) * height) +
        (
            Math.PI *
            Math.pow(height / 2, 2)
        )
    );

}


// ------------------------------------
// Flat Oval Perimeter — Inches
// ------------------------------------

function flatOvalPerimeter(width, height) {

    return (
        (2 * (width - height)) +
        (Math.PI * height)
    );

}


// ------------------------------------
// Flat Oval Friction-Equivalent Round Diameter
// ------------------------------------

/*
 * Friction-equivalent round diameter for equal-friction comparison.
 * Do not substitute this value for hydraulic diameter in fitting-loss
 * coefficient calculations.
 */
function flatOvalEquivalentDiameter(width, height) {

    const area =
        flatOvalAreaSquareInches(
            width,
            height
        );

    const perimeter =
        flatOvalPerimeter(
            width,
            height
        );

    return (
        1.55 *
        Math.pow(area, 0.625) /
        Math.pow(perimeter, 0.25)
    );

}


// ------------------------------------
// Friction Match Guardrail
// ------------------------------------

/*
 * Equal-friction behavior is the primary equivalency criterion.
 * For the same airflow, the round-duct approximation used by this
 * project varies with D^-5.02. That lets us express a candidate's
 * difference as an actual friction-rate percentage instead of merely
 * showing its equivalent-diameter percentage.
 *
 * The ±25% cutoff is an application guardrail, not a SMACNA tolerance.
 * It prevents the UI from presenting a wildly different size as an
 * "equivalent" simply because it is the closest size in the configured
 * library.
 */
const MAX_EQUIVALENT_FRICTION_DIFFERENCE = 25;

function equivalentFrictionDifference(
    targetDiameter,
    candidateDiameter
) {

    if (
        !Number.isFinite(targetDiameter) ||
        !Number.isFinite(candidateDiameter) ||
        targetDiameter <= 0 ||
        candidateDiameter <= 0
    ) {
        return NaN;
    }

    return (
        (
            Math.pow(
                targetDiameter / candidateDiameter,
                5.02
            ) - 1
        ) * 100
    );

}


// ------------------------------------
// Ranking Score
// Equivalent diameter receives the most weight because it is the
// primary indicator of comparable friction behavior.
// ------------------------------------

function equivalentOptionScore(option) {

    const aspectPenalty =
        Math.max(
            0,
            option.aspectRatio - 1
        );

    return (
        (Math.abs(option.frictionDifference) * 7) +
        (Math.abs(option.areaDifference) * 2) +
        aspectPenalty
    );

}


// ------------------------------------
// Sort Equivalent Options
// ------------------------------------

function sortEquivalentOptions(options) {

    const practicalOptions =
        options.filter(option =>
            Number.isFinite(
                option.frictionDifference
            ) &&
            Math.abs(
                option.frictionDifference
            ) <=
                MAX_EQUIVALENT_FRICTION_DIFFERENCE
        );

    practicalOptions.sort((a, b) => {

        const scoreDifference =
            equivalentOptionScore(a) -
            equivalentOptionScore(b);

        if (
            Math.abs(scoreDifference) >
            0.000001
        ) {

            return scoreDifference;

        }

        return (
            a.aspectRatio -
            b.aspectRatio
        );

    });

    return practicalOptions.slice(0, 5);

}


// ------------------------------------
// Standard Round Options
// ------------------------------------

function getEquivalentRoundSizes(
    targetDiameter,
    targetArea
) {

    const options = [];

    for (const diameter of STANDARD_ROUND) {

        const area =
            roundArea(diameter);

        const equivalentDifference =
            (
                (
                    diameter -
                    targetDiameter
                ) /
                targetDiameter
            ) * 100;

        const areaDifference =
            (
                (
                    area -
                    targetArea
                ) /
                targetArea
            ) * 100;

        options.push({

            shape: "round",

            diameter,

            area,

            areaDifference,

            equivalentDiameter:
                diameter,

            equivalentDifference,

            frictionDifference:
                equivalentFrictionDifference(
                    targetDiameter,
                    diameter
                ),

            aspectRatio: 1

        });

    }

    return sortEquivalentOptions(options);

}


// ------------------------------------
// Rectangle Options
// ------------------------------------

function getEquivalentRectangleSizes(
    targetDiameter,
    targetArea
) {

    const options = [];

    const seen = new Set();

    for (const rectangle of RECTANGLE_SIZES) {

        const width =
            Math.max(
                rectangle.width,
                rectangle.height
            );

        const height =
            Math.min(
                rectangle.width,
                rectangle.height
            );

        const key =
            `${width}x${height}`;

        if (seen.has(key)) {

            continue;

        }

        seen.add(key);

        const aspectRatio =
            width / height;

        if (aspectRatio > 8) {

            continue;

        }

        const area =
            (width * height) / 144;

        const equivalentDiameter =
            rectangleEquivalentDiameter(
                width,
                height
            );

        const equivalentDifference =
            (
                (
                    equivalentDiameter -
                    targetDiameter
                ) /
                targetDiameter
            ) * 100;

        const areaDifference =
            (
                (
                    area -
                    targetArea
                ) /
                targetArea
            ) * 100;

        options.push({

            shape: "rectangle",

            width,

            height,

            area,

            areaDifference,

            equivalentDiameter,

            equivalentDifference,

            frictionDifference:
                equivalentFrictionDifference(
                    targetDiameter,
                    equivalentDiameter
                ),

            aspectRatio

        });

    }

    return sortEquivalentOptions(options);

}


// ------------------------------------
// Flat Oval Options
// ------------------------------------

function getEquivalentFlatOvalSizes(
    targetDiameter,
    targetArea
) {

    const options = [];

    for (const oval of FLAT_OVAL_SIZES) {

        const width =
            Math.max(
                oval.width,
                oval.height
            );

        const height =
            Math.min(
                oval.width,
                oval.height
            );

        // True flat oval only.
        if (width <= height) {

            continue;

        }

        const aspectRatio =
            width / height;

        if (aspectRatio > 8) {

            continue;

        }

        const area =
            flatOvalAreaSquareInches(
                width,
                height
            ) / 144;

        const equivalentDiameter =
            flatOvalEquivalentDiameter(
                width,
                height
            );

        const equivalentDifference =
            (
                (
                    equivalentDiameter -
                    targetDiameter
                ) /
                targetDiameter
            ) * 100;

        const areaDifference =
            (
                (
                    area -
                    targetArea
                ) /
                targetArea
            ) * 100;

        options.push({

            shape: "flatOval",

            width,

            height,

            area,

            areaDifference,

            equivalentDiameter,

            equivalentDifference,

            frictionDifference:
                equivalentFrictionDifference(
                    targetDiameter,
                    equivalentDiameter
                ),

            aspectRatio

        });

    }

    return sortEquivalentOptions(options);

}


// ------------------------------------
// Round Source
// ------------------------------------

function convertRoundToEquivalentSizes(
    roundDiameter
) {

    roundDiameter =
        Number(roundDiameter);

    if (
        !Number.isFinite(roundDiameter) ||
        roundDiameter <= 0
    ) {

        return null;

    }

    const targetDiameter =
        roundDiameter;

    const targetArea =
        roundArea(roundDiameter);

    return {

        sourceShape: "round",

        sourceLabel:
            `${roundDiameter}" Round`,

        targetDiameter,

        targetArea,

        resultOneTitle:
            "▭ Rectangle",

        resultOneOptions:
            getEquivalentRectangleSizes(
                targetDiameter,
                targetArea
            ),

        resultTwoTitle:
            "⬭ Flat Oval",

        resultTwoOptions:
            getEquivalentFlatOvalSizes(
                targetDiameter,
                targetArea
            )

    };

}


// ------------------------------------
// Rectangle Source
// ------------------------------------

function convertRectangleToEquivalentSizes(
    sourceWidth,
    sourceHeight
) {

    sourceWidth =
        Number(sourceWidth);

    sourceHeight =
        Number(sourceHeight);

    if (
        !Number.isFinite(sourceWidth) ||
        !Number.isFinite(sourceHeight) ||
        sourceWidth <= 0 ||
        sourceHeight <= 0
    ) {

        return null;

    }

    const width =
        Math.max(
            sourceWidth,
            sourceHeight
        );

    const height =
        Math.min(
            sourceWidth,
            sourceHeight
        );

    const targetArea =
        (width * height) / 144;

    const targetDiameter =
        rectangleEquivalentDiameter(
            width,
            height
        );

    return {

        sourceShape: "rectangle",

        sourceLabel:
            `${width}" × ${height}" Rectangle`,

        targetDiameter,

        targetArea,

        resultOneTitle:
            "○ Round",

        resultOneOptions:
            getEquivalentRoundSizes(
                targetDiameter,
                targetArea
            ),

        resultTwoTitle:
            "⬭ Flat Oval",

        resultTwoOptions:
            getEquivalentFlatOvalSizes(
                targetDiameter,
                targetArea
            )

    };

}


// ------------------------------------
// Flat Oval Source
// ------------------------------------

function convertFlatOvalToEquivalentSizes(
    sourceWidth,
    sourceHeight
) {

    sourceWidth =
        Number(sourceWidth);

    sourceHeight =
        Number(sourceHeight);

    if (
        !Number.isFinite(sourceWidth) ||
        !Number.isFinite(sourceHeight) ||
        sourceWidth <= 0 ||
        sourceHeight <= 0
    ) {

        return null;

    }

    const width =
        Math.max(
            sourceWidth,
            sourceHeight
        );

    const height =
        Math.min(
            sourceWidth,
            sourceHeight
        );

    // Width and height cannot be equal,
    // because that would be round duct.
    if (width <= height) {

        return null;

    }

    const targetArea =
        flatOvalAreaSquareInches(
            width,
            height
        ) / 144;

    const targetDiameter =
        flatOvalEquivalentDiameter(
            width,
            height
        );

    return {

        sourceShape: "flatOval",

        sourceLabel:
            `${width}" × ${height}" Flat Oval`,

        targetDiameter,

        targetArea,

        resultOneTitle:
            "○ Round",

        resultOneOptions:
            getEquivalentRoundSizes(
                targetDiameter,
                targetArea
            ),

        resultTwoTitle:
            "▭ Rectangle",

        resultTwoOptions:
            getEquivalentRectangleSizes(
                targetDiameter,
                targetArea
            )

    };

}


// ------------------------------------
// Color Class
// ------------------------------------

function getEquivalentDifferenceClass(
    differenceValue
) {

    const difference =
        Math.abs(differenceValue);

    if (difference <= 2) {

        return "good";

    }

    if (difference <= 5) {

        return "okay";

    }

    if (difference <= 10) {

        return "warn";

    }

    return "bad";

}


// ------------------------------------
// Signed Percentage
// ------------------------------------

function formatEquivalentDifference(
    differenceValue
) {

    const sign =
        differenceValue > 0
            ? "+"
            : "";

    return (
        `${sign}` +
        `${differenceValue.toFixed(2)}%`
    );

}