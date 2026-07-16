// =====================================================
// DUCTCULATOR PRO
// equivalentSizes.js
// Equivalent Duct Size Conversion Engine
// =====================================================

// ------------------------------------
// Convert Round Duct to Other Shapes
// ------------------------------------

function convertRoundToEquivalentSizes(roundDiameter) {

    roundDiameter = Number(roundDiameter);

    if (!Number.isFinite(roundDiameter) || roundDiameter <= 0) {

        return null;

    }

    const targetArea = roundArea(roundDiameter);

    const rectangles =
        getEquivalentRectangleSizes(targetArea);

    const flatOvals =
        getEquivalentFlatOvalSizes(targetArea);

    return {

        sourceShape: "round",

        sourceSize: roundDiameter,

        targetArea,

        rectangles,

        flatOvals

    };

}


// ------------------------------------
// Equivalent Rectangle Options
// ------------------------------------

function getEquivalentRectangleSizes(targetArea) {

    const options = [];

    for (const rectangle of RECTANGLE_SIZES) {

        const width =
            Math.max(rectangle.width, rectangle.height);

        const height =
            Math.min(rectangle.width, rectangle.height);

        const areaDifference =
            ((rectangle.area - targetArea) / targetArea) * 100;

        const aspectRatio =
            width / height;

        // Do not return extremely narrow shapes.
        if (aspectRatio > 8) {

            continue;

        }

        options.push({

            width,

            height,

            area: rectangle.area,

            areaDifference,

            aspectRatio

        });

    }

    // Sort closest area match first.
    options.sort((a, b) => {

        const difference =
            Math.abs(a.areaDifference) -
            Math.abs(b.areaDifference);

        if (Math.abs(difference) > 0.000001) {

            return difference;

        }

        // If equally accurate, prefer the lower aspect ratio.
        return a.aspectRatio - b.aspectRatio;

    });

    // Remove rotated duplicates.
    const unique = [];

    const seen = new Set();

    for (const option of options) {

        const key =
            `${option.width}x${option.height}`;

        if (seen.has(key)) {

            continue;

        }

        seen.add(key);

        unique.push(option);

        if (unique.length === 5) {

            break;

        }

    }

    return unique;

}


// ------------------------------------
// Equivalent Flat Oval Options
// ------------------------------------

function getEquivalentFlatOvalSizes(targetArea) {

    const options = [];

    for (const oval of FLAT_OVAL_SIZES) {

        const width =
            Math.max(oval.width, oval.height);

        const height =
            Math.min(oval.width, oval.height);

        const areaDifference =
            ((oval.area - targetArea) / targetArea) * 100;

        const aspectRatio =
            width / height;

        // Do not return extremely narrow shapes.
        if (aspectRatio > 8) {

            continue;

        }

        options.push({

            width,

            height,

            area: oval.area,

            areaDifference,

            aspectRatio

        });

    }

    // Sort closest area match first.
    options.sort((a, b) => {

        const difference =
            Math.abs(a.areaDifference) -
            Math.abs(b.areaDifference);

        if (Math.abs(difference) > 0.000001) {

            return difference;

        }

        return a.aspectRatio - b.aspectRatio;

    });

    return options.slice(0, 5);

}


// ------------------------------------
// Color Class for Area Difference
// ------------------------------------

function getEquivalentDifferenceClass(areaDifference) {

    const difference =
        Math.abs(areaDifference);

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
// Display Signed Percentage
// ------------------------------------

function formatEquivalentDifference(areaDifference) {

    const sign =
        areaDifference > 0 ? "+" : "";

    return `${sign}${areaDifference.toFixed(2)}%`;

}