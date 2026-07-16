// =====================================================
// DUCTCULATOR PRO
// flatOval.js
// Flat Oval Engineering Library
// =====================================================

// ------------------------------------
// Flat Oval Configuration
// ------------------------------------

const OVAL_MIN_WIDTH = 12;
const OVAL_MIN_HEIGHT = 6;

const OVAL_MAX_WIDTH = 300;
const OVAL_MAX_HEIGHT = 120;

const OVAL_INCREMENT = 2;

// ------------------------------------
// Generate Flat Oval Sizes
// ------------------------------------

const FLAT_OVAL_SIZES = [];

for (
    let width = OVAL_MIN_WIDTH;
    width <= OVAL_MAX_WIDTH;
    width += OVAL_INCREMENT
) {

    for (
        let height = OVAL_MIN_HEIGHT;
        height <= OVAL_MAX_HEIGHT;
        height += OVAL_INCREMENT
    ) {

        // Flat oval must be wider than it is tall.
// If width == height, it is simply a round duct.
if (width <= height) {
    continue;
}

        /*
            Flat oval area:

            rectangle portion:
            (width - height) × height

            plus two semicircles, which equal one full circle:
            π × (height / 2)²
        */

        const areaSquareInches =
            ((width - height) * height) +
            (Math.PI * Math.pow(height / 2, 2));

        const areaSquareFeet =
            areaSquareInches / 144;

        FLAT_OVAL_SIZES.push({

            width,
            height,
            area: areaSquareFeet

        });

    }

}

// ------------------------------------
// Best Flat Oval Options
// ------------------------------------

function getFlatOvalOptions(requiredArea, targetVelocity, cfm) {

    const options = [];

    for (const oval of FLAT_OVAL_SIZES) {

        const velocity =
            cfm / oval.area;

        const areaDifference =
            ((oval.area - requiredArea) /
            requiredArea) * 100;

        const velocityDifference =
            Math.abs(velocity - targetVelocity);

        const aspectRatio =
            oval.width / oval.height;

        // Skip extreme shapes.
        if (aspectRatio > 8) {
            continue;
        }

        // Skip sizes far away from the required area.
        if (Math.abs(areaDifference) > 25) {
            continue;
        }

        const score =
            (Math.abs(areaDifference) * 5) +
            (velocityDifference / 10) +
            Math.pow(aspectRatio - 1, 2);

        options.push({

            width: oval.width,
            height: oval.height,
            area: oval.area,
            velocity,
            areaDifference,
            aspectRatio,
            score

        });

    }

    // Best area match first.
    // If tied, prefer the more balanced shape.
    options.sort((a, b) => {

        const areaComparison =
            Math.abs(a.areaDifference) -
            Math.abs(b.areaDifference);

        if (Math.abs(areaComparison) > 0.000001) {
            return areaComparison;
        }

        return a.aspectRatio - b.aspectRatio;

    });

    return options.slice(0, 5);

}