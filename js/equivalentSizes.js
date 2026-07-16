// =====================================================
// DUCTCULATOR PRO
// equivalentSizes.js
// Equal-Friction Equivalent Size Engine
// =====================================================


// ------------------------------------
// Round to Equivalent Shapes
// ------------------------------------

function convertRoundToEquivalentSizes(roundDiameter) {

    roundDiameter = Number(roundDiameter);

    if (
        !Number.isFinite(roundDiameter) ||
        roundDiameter <= 0
    ) {

        return null;

    }

    const targetArea =
        roundArea(roundDiameter);

    const rectangles =
        getEquivalentRectangleSizes(roundDiameter);

    const flatOvals =
        getEquivalentFlatOvalSizes(roundDiameter);

    return {

        sourceShape: "round",

        sourceSize: roundDiameter,

        targetArea,

        rectangles,

        flatOvals

    };

}


// ------------------------------------
// Rectangle Equivalent Diameter
// Equal-Friction Correlation
// ------------------------------------

function rectangleEquivalentDiameter(width, height) {

    const area =
        width * height;

    return (
        1.30 *
        Math.pow(area, 0.625) /
        Math.pow(width + height, 0.25)
    );

}


// ------------------------------------
// Flat Oval Area — Square Inches
// Racetrack / Oblong Shape
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
// Flat Oval Equivalent Diameter
// Equal-Friction Correlation
// ------------------------------------

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
// Equivalent Rectangle Options
// ------------------------------------

function getEquivalentRectangleSizes(
    targetDiameter
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

        options.push({

            width,

            height,

            area:
                (width * height) / 144,

            equivalentDiameter,

            equivalentDifference,

            aspectRatio

        });

    }

    options.sort((a, b) => {

        const difference =
            Math.abs(
                a.equivalentDifference
            ) -
            Math.abs(
                b.equivalentDifference
            );

        if (
            Math.abs(difference) >
            0.000001
        ) {

            return difference;

        }

        return (
            a.aspectRatio -
            b.aspectRatio
        );

    });

    return options.slice(0, 5);

}


// ------------------------------------
// Equivalent Flat Oval Options
// ------------------------------------

function getEquivalentFlatOvalSizes(
    targetDiameter
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

        // Must be a true flat oval,
        // not a round duct.
        if (width <= height) {

            continue;

        }

        const aspectRatio =
            width / height;

        if (aspectRatio > 8) {

            continue;

        }

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

        options.push({

            width,

            height,

            area:
                flatOvalAreaSquareInches(
                    width,
                    height
                ) / 144,

            equivalentDiameter,

            equivalentDifference,

            aspectRatio

        });

    }

    options.sort((a, b) => {

        const difference =
            Math.abs(
                a.equivalentDifference
            ) -
            Math.abs(
                b.equivalentDifference
            );

        if (
            Math.abs(difference) >
            0.000001
        ) {

            return difference;

        }

        return (
            a.aspectRatio -
            b.aspectRatio
        );

    });

    return options.slice(0, 5);

}


// ------------------------------------
// Color Class
// ------------------------------------

function getEquivalentDifferenceClass(
    equivalentDifference
) {

    const difference =
        Math.abs(
            equivalentDifference
        );

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
    equivalentDifference
) {

    const sign =
        equivalentDifference > 0
            ? "+"
            : "";

    return (
        `${sign}` +
        `${equivalentDifference.toFixed(2)}%`
    );

}