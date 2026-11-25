// =====================================================
// DUCTWORK PRO
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
// ------------------------------------
// Sizes at or above a target (shared by the calculator and the wheel)
// ------------------------------------
//
// For each short side (in the chosen step), the long side (same step) that
// comes CLOSEST to the target, the way a duct wheel is read: equal friction
// matches the equivalent round (Huebscher) to the target round, equal area
// matches the required area. A size can run a little over or under the
// target; the tables show by how much. Shapes past 4:1 are left out, and the
// list runs squarest first.

const RECT_MAX_ASPECT = 4;

// 1" steps unless the screen's setting says 2"
function rectSizeStep() {
    const select = document.getElementById("rectStepSize");
    return select && select.value === "1" ? 1 : 2;
}

function rectEquivalentRound(width, height) {
    return 1.30 * Math.pow(width * height, 0.625) / Math.pow(width + height, 0.25);
}

// smallest long side (>= minLong, in step) with meets(long, short) true
function smallestLongSide(shortSide, step, meets, maxLong, minLong) {
    const start = Math.max(minLong, shortSide);
    if (meets(start, shortSide)) return start;
    let lo = start, hi = start;
    while (!meets(hi, shortSide)) {
        hi *= 2;
        if (hi > maxLong * 2) return null;
    }
    for (let i = 0; i < 60; i += 1) {
        const mid = (lo + hi) / 2;
        if (meets(mid, shortSide)) hi = mid; else lo = mid;
    }
    let w = Math.max(start, Math.ceil(hi / step - 1e-9) * step);
    if (!meets(w, shortSide)) w += step;   // guard against rounding
    return w;
}

// value(w, h) grows with w; returns the closest long side in the step
function closestLongSide(shortSide, step, value, target, minLong, maxLong) {
    if (value(maxLong, shortSide) < target) return null;
    let lo = 0.01, hi = maxLong;
    for (let i = 0; i < 60; i += 1) {
        const mid = (lo + hi) / 2;
        if (value(mid, shortSide) < target) lo = mid; else hi = mid;
    }
    const exact = hi;
    if (exact < minLong - step / 2) return { width: minLong, tooBig: true };
    const down = Math.max(minLong, Math.floor(exact / step + 1e-9) * step);
    const up = Math.max(minLong, down + step);
    const err = w => Math.abs(Math.log(value(w, shortSide) / target));
    return { width: err(down) <= err(up) ? down : up, tooBig: false };
}

function sizesClosest(value, target, { step = rectSizeStep(), minShort = 4, maxShort = 120, maxLong = 300, maxAspect = RECT_MAX_ASPECT, count = 5, strictlyLonger = false } = {}) {
    const out = [];
    const start = Math.ceil(minShort / step) * step;
    for (let h = start; h <= maxShort; h += step) {
        const minLong = strictlyLonger ? h + step : h;
        const r = closestLongSide(h, step, value, target, minLong, maxLong);
        if (r === null) continue;
        if (r.tooBig) break;   // even the squarest size at this short side is past the target
        const w = r.width;
        if (w / h <= maxAspect + 1e-9) out.push({ width: w, height: h, aspectRatio: w / h });
        if (w === minLong) break;   // the squarest size: larger short sides only get bigger
    }
    return out.sort((a, b) => a.aspectRatio - b.aspectRatio).slice(0, count);
}

// equal friction with a round of diameter `round` (closest match)
function rectanglesForRound(round, options) {
    return sizesClosest((w, h) => rectEquivalentRound(w, h), round, options);
}

// equal area: closest to `areaSqFt`
function rectanglesForArea(areaSqFt, options) {
    return sizesClosest((w, h) => (w * h) / 144, areaSqFt, options);
}
