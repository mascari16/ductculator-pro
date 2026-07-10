// =====================================================
// DUCTCULATOR PRO
// rectangle.js
// Rectangle Engineering Library
// =====================================================

// ------------------------------------
// Rectangle Configuration
// ------------------------------------

const RECT_MIN = 4;

const RECT_MAX_WIDTH = 300;

const RECT_MAX_HEIGHT = 120;

const RECT_INCREMENT = 2;

// ------------------------------------
// Generate Standard Rectangle Sizes
// ------------------------------------

const RECTANGLE_SIZES = [];

for (let width = RECT_MIN; width <= RECT_MAX_WIDTH; width += RECT_INCREMENT) {

    for (let height = RECT_MIN; height <= RECT_MAX_HEIGHT; height += RECT_INCREMENT) {

        RECTANGLE_SIZES.push({

            width,

            height,

            area: (width * height) / 144

        });

    }

}

// ------------------------------------
// Best Rectangle Options
// ------------------------------------

function getRectangleOptions(requiredArea, targetVelocity, cfm) {

    const options = [];

    for (const rect of RECTANGLE_SIZES) {

        const velocity = cfm / rect.area;

        // Skip anything that isn't close to the required area
const percentOff =
    Math.abs((rect.area - requiredArea) / requiredArea);

if (percentOff > 0.25) {
    continue;
}

        const areaDifference =
            Math.abs(((rect.area - requiredArea) / requiredArea) * 100);

        const velocityDifference =
            Math.abs(velocity - targetVelocity);

        const aspectRatio =
            Math.max(rect.width, rect.height) /
            Math.min(rect.width, rect.height);

        // Reject ridiculous duct shapes
        if (aspectRatio > 8)
            continue;

        // Weighted engineering score
        const score =
    (Math.abs(areaDifference) * 5) +
    (velocityDifference / 10) +
    (Math.pow(aspectRatio - 1, 2) * 10);

        // Always store largest dimension first
const width = Math.max(rect.width, rect.height);
const height = Math.min(rect.width, rect.height);

options.push({

    width: rect.width,
    height: rect.height,
    area: rect.area,
    velocity,
    areaDifference:
        ((rect.area - requiredArea) / requiredArea) * 100,
    aspectRatio,
    score

});

    }

    // Sort by absolute area difference first.
// If two options are equally close, prefer the lower aspect ratio.
options.sort((a, b) => {

    const areaCompare =
        Math.abs(a.areaDifference) -
        Math.abs(b.areaDifference);

    if (Math.abs(areaCompare) > 0.000001) {
        return areaCompare;
    }

    return a.aspectRatio - b.aspectRatio;

});

// Remove rotated duplicates such as 24 × 30 and 30 × 24.
const unique = [];
const seen = new Set();

for (const option of options) {

    const width = Math.max(option.width, option.height);
    const height = Math.min(option.width, option.height);

    const key = `${width}x${height}`;

    if (seen.has(key)) {
        continue;
    }

    seen.add(key);

    unique.push({
        ...option,
        width,
        height
    });

}

return unique.slice(0, 5);

}