// =====================================================
// FLAT OVAL DUCT OPTIONS GENERATOR
// =====================================================

// Flat Oval options
function getFlatOvalOptions(requiredArea, targetVelocity, cfm) {

    const options = [];

    for (let width = 12; width <= 96; width += 2) {

        for (let height = 6; height <= 40; height += 2) {

            // Approximation
            const area =
                ((width - height) * height + Math.PI * Math.pow(height / 2, 2))
                / 144;

            const velocity = cfm / area;

            const diff = Math.abs(area - requiredArea) / requiredArea;

            if (diff > 0.12)
                continue;

            options.push({

                width,
                height,
                area,
                velocity,
                diff

            });

        }

    }

    options.sort((a, b) => a.diff - b.diff);

    return options.slice(0, 5);

}