/* =========================================================
   LIVE ISOMETRIC TWO-ELBOW RECTANGULAR DUCT OFFSET
   File: offsetiso.js
   Replace the entire old offsetiso.js with this file.
   ========================================================= */

(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";

    const ids = {
        container: "offsetIsoContainer",
        mode: "offsetMode",
        offset: "offsetInput",
        overall: "overallLengthInput",
        cheek: "cheekSizeInput",
        clrMultiplier: "clrMultiplier",
        customClr: "customClrInput",
        angle: "elbowAngleInput"
    };

    function svg(tag, attrs = {}, text = "") {
        const el = document.createElementNS(NS, tag);

        Object.entries(attrs).forEach(([key, value]) => {
            el.setAttribute(key, String(value));
        });

        if (text) {
            el.textContent = text;
        }

        return el;
    }

    function numberFromDimension(value, fallback = 0) {
        const text = String(value ?? "")
            .trim()
            .replace(/["']/g, "")
            .replace(/\s+/g, " ");

        if (!text) {
            return fallback;
        }

        if (/^-?\d+(\.\d+)?$/.test(text)) {
            return Number(text);
        }

        const mixed = text.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);

        if (mixed) {
            const whole = Number(mixed[1]);
            const numerator = Number(mixed[2]);
            const denominator = Number(mixed[3]);

            if (denominator === 0) {
                return fallback;
            }

            return whole < 0
                ? whole - numerator / denominator
                : whole + numerator / denominator;
        }

        const fraction = text.match(/^(-?\d+)\s*\/\s*(\d+)$/);

        if (fraction) {
            const numerator = Number(fraction[1]);
            const denominator = Number(fraction[2]);

            return denominator === 0
                ? fallback
                : numerator / denominator;
        }

        return fallback;
    }

    function format(value) {
        if (!Number.isFinite(value)) {
            return "--";
        }

        return value
            .toFixed(2)
            .replace(/\.00$/, "")
            .replace(/(\.\d)0$/, "$1");
    }

    function getValue(id, fallback = 0) {
        const element = document.getElementById(id);

        return element
            ? numberFromDimension(element.value, fallback)
            : fallback;
    }

    function getClr(cheek) {
        const select = document.getElementById(ids.clrMultiplier);
        const selected = select ? select.value : "auto";

        if (selected === "custom") {
            return Math.max(
                1,
                getValue(ids.customClr, cheek)
            );
        }

        /*
         * Visual centerline-radius choice:
         * Auto uses one-half cheek size.
         * The other selections multiply that base radius.
         *
         * This affects only the preview geometry.
         */
        const baseRadius = Math.max(1, cheek / 2);

        if (selected === "1.5") {
            return baseRadius * 1.5;
        }

        if (selected === "2") {
            return baseRadius * 2;
        }

        return baseRadius;
    }

    function solveStraight(run, rise, radius, angleDegrees) {
        const angle = angleDegrees * Math.PI / 180;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const fromRun =
            Math.abs(cos) > 0.0001
                ? (run - 2 * radius * sin) / cos
                : 0;

        const fromRise =
            Math.abs(sin) > 0.0001
                ? (rise - 2 * radius * (1 - cos)) / sin
                : 0;

        const values = [fromRun, fromRise]
            .filter(Number.isFinite);

        return Math.max(
            0,
            values.length
                ? values.reduce((sum, value) => sum + value, 0) / values.length
                : 0
        );
    }

    function geometryError(run, rise, radius, angle) {
        const straight = solveStraight(
            run,
            rise,
            radius,
            angle
        );

        const radians = angle * Math.PI / 180;

        const calculatedRun =
            2 * radius * Math.sin(radians) +
            straight * Math.cos(radians);

        const calculatedRise =
            2 * radius * (1 - Math.cos(radians)) +
            straight * Math.sin(radians);

        return Math.hypot(
            calculatedRun - run,
            calculatedRise - rise
        );
    }

    function solveAngle(run, rise, radius) {
        let bestAngle = 45;
        let bestError = Infinity;

        for (let angle = 5; angle <= 85; angle += 0.05) {
            const error = geometryError(
                run,
                rise,
                radius,
                angle
            );

            if (error < bestError) {
                bestError = error;
                bestAngle = angle;
            }
        }

        return bestAngle;
    }

    function getModel() {
        const rise = Math.max(0, getValue(ids.offset, 46.25));
        const run = Math.max(1, getValue(ids.overall, 69));
        const cheek = Math.max(1, getValue(ids.cheek, 34));
        const radius = getClr(cheek);

        const modeElement = document.getElementById(ids.mode);
        const mode = modeElement ? modeElement.value : "solveAngle";

        let angle =
            mode === "knownAngle"
                ? Math.max(1, Math.min(89, getValue(ids.angle, 45)))
                : solveAngle(run, rise, radius);

        const straight = solveStraight(
            run,
            rise,
            radius,
            angle
        );

        /*
         * The calculator currently has one cheek dimension, not separate
         * duct width and depth fields. The preview uses cheek as the visible
         * face height and a restrained depth purely for isometric appearance.
         */
        const depth = Math.max(
            8,
            Math.min(cheek * 0.42, 18)
        );

        return {
            rise,
            run,
            cheek,
            depth,
            radius,
            angle,
            straight
        };
    }

    function centerlinePoints(model) {
        const angle = model.angle * Math.PI / 180;
        const r = model.radius;
        const s = model.straight;

        const arcSteps = 18;
        const points = [];

        /*
         * Start with a short inlet straight so the open end is visible.
         */
        const inletLead = Math.max(
            model.cheek * 0.35,
            model.run * 0.08,
            7
        );

        points.push({ x: -inletLead, y: 0 });
        points.push({ x: 0, y: 0 });

        /*
         * First elbow:
         * tangent changes from horizontal to the selected offset angle.
         */
        for (let i = 1; i <= arcSteps; i += 1) {
            const t = angle * i / arcSteps;

            points.push({
                x: r * Math.sin(t),
                y: r * (1 - Math.cos(t))
            });
        }

        const firstEnd = points[points.length - 1];

        /*
         * Middle straight only appears when the geometry calls for it.
         */
        const secondStart = {
            x: firstEnd.x + s * Math.cos(angle),
            y: firstEnd.y + s * Math.sin(angle)
        };

        if (s > 0.05) {
            points.push(secondStart);
        }

        /*
         * Second elbow:
         * tangent changes from the offset angle back to horizontal.
         */
        for (let i = 1; i <= arcSteps; i += 1) {
            const u = angle * i / arcSteps;

            points.push({
                x:
                    secondStart.x +
                    r * (
                        Math.sin(angle) -
                        Math.sin(angle - u)
                    ),

                y:
                    secondStart.y +
                    r * (
                        Math.cos(angle - u) -
                        Math.cos(angle)
                    )
            });
        }

        const outletStart = points[points.length - 1];
        const outletLead = inletLead;

        points.push({
            x: outletStart.x + outletLead,
            y: outletStart.y
        });

        return {
            points,
            inletLead,
            outletLead,
            firstEnd,
            secondStart,
            outletStart
        };
    }

    function offsetPolyline(points, distance) {
        const output = [];

        for (let i = 0; i < points.length; i += 1) {
            const previous = points[Math.max(0, i - 1)];
            const next = points[Math.min(points.length - 1, i + 1)];

            const dx = next.x - previous.x;
            const dy = next.y - previous.y;
            const length = Math.hypot(dx, dy) || 1;

            const nx = -dy / length;
            const ny = dx / length;

            output.push({
                x: points[i].x + nx * distance,
                y: points[i].y + ny * distance
            });
        }

        return output;
    }

    function pathFromPoints(points, close = false) {
        if (!points.length) {
            return "";
        }

        const body = points
            .map((point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
            )
            .join(" ");

        return close ? `${body} Z` : body;
    }

    function transformPoints(points, transform) {
        return points.map((point) => transform(point));
    }

    /*
     * Rotate the fitting so the overall-length direction reads vertically
     * on screen. Original model X becomes screen-up, and original model Y
     * becomes screen-right.
     */
    function orientVertical(points) {
        return points.map((point) => ({
            x: point.y,
            y: -point.x
        }));
    }

    function fitTransform(allPoints, width, height) {
        const xs = allPoints.map((point) => point.x);
        const ys = allPoints.map((point) => point.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const margin = 85;

        const scale = Math.min(
            (width - margin * 2) / Math.max(1, maxX - minX),
            (height - margin * 2) / Math.max(1, maxY - minY)
        );

        return function (point) {
            return {
                x:
                    margin +
                    (point.x - minX) * scale,

                y:
                    height -
                    margin -
                    (point.y - minY) * scale
            };
        };
    }

    function addArrowMarkers(defs) {
        const marker = svg("marker", {
            id: "offsetIsoArrow",
            markerWidth: 8,
            markerHeight: 8,
            refX: 4,
            refY: 4,
            orient: "auto-start-reverse",
            markerUnits: "strokeWidth"
        });

        marker.appendChild(svg("path", {
            d: "M 0 0 L 8 4 L 0 8",
            fill: "none",
            stroke: "#f4b942",
            "stroke-width": 1.4
        }));

        defs.appendChild(marker);
    }

    function drawDimension(group, a, b, label, textOffset = 0) {
        const line = svg("line", {
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            class: "offset-iso-dimension-line",
            "marker-start": "url(#offsetIsoArrow)",
            "marker-end": "url(#offsetIsoArrow)"
        });

        group.appendChild(line);

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;

        group.appendChild(svg("text", {
            x: mx,
            y: my + textOffset,
            class: "offset-iso-dimension-text"
        }, label));
    }

    function render() {
        const container = document.getElementById(ids.container);

        if (!container) {
            return;
        }

        const model = getModel();
        const center = centerlinePoints(model);

        const half = model.cheek / 2;

        const lower = offsetPolyline(center.points, -half);
        const upper = offsetPolyline(center.points, half);

        /*
         * Isometric depth shift. This creates the 3D view while preserving
         * the accurate two-elbow side profile.
         */
        const isoDepth = {
            x: model.depth * 0.9,
            y: model.depth * 0.55
        };

        const backLower = lower.map((point) => ({
            x: point.x + isoDepth.x,
            y: point.y + isoDepth.y
        }));

        const backUpper = upper.map((point) => ({
            x: point.x + isoDepth.x,
            y: point.y + isoDepth.y
        }));

        /*
         * Turn the complete fitting upright before scaling it into the SVG.
         */
        const verticalLower = orientVertical(lower);
        const verticalUpper = orientVertical(upper);
        const verticalBackLower = orientVertical(backLower);
        const verticalBackUpper = orientVertical(backUpper);
        const verticalCenter = orientVertical(center.points);

        const allModelPoints = [
            ...verticalLower,
            ...verticalUpper,
            ...verticalBackLower,
            ...verticalBackUpper
        ];

        const viewWidth = 1000;
        const viewHeight = 700;
        const transform = fitTransform(
            allModelPoints,
            viewWidth,
            viewHeight
        );

        const L = transformPoints(verticalLower, transform);
        const U = transformPoints(verticalUpper, transform);
        const BL = transformPoints(verticalBackLower, transform);
        const BU = transformPoints(verticalBackUpper, transform);
        const C = transformPoints(verticalCenter, transform);

        container.replaceChildren();

        const drawing = svg("svg", {
            class: "offset-iso-svg",
            viewBox: `0 0 ${viewWidth} ${viewHeight}`,
            preserveAspectRatio: "xMidYMid meet",
            role: "img",
            "aria-label": "Isometric two-elbow rectangular duct offset"
        });

        const defs = svg("defs");
        addArrowMarkers(defs);
        drawing.appendChild(defs);

        /*
         * Far side face.
         */
        drawing.appendChild(svg("path", {
            d: pathFromPoints([
                ...BU,
                ...BL.slice().reverse()
            ], true),
            class: "offset-iso-back-panel"
        }));

        /*
         * Upper/top surface.
         */
        drawing.appendChild(svg("path", {
            d: pathFromPoints([
                ...U,
                ...BU.slice().reverse()
            ], true),
            class: "offset-iso-top-panel"
        }));

        /*
         * Lower surface.
         */
        drawing.appendChild(svg("path", {
            d: pathFromPoints([
                ...L,
                ...BL.slice().reverse()
            ], true),
            class: "offset-iso-bottom-panel"
        }));

        /*
         * Near side profile: the key S-shaped fitting face.
         */
        drawing.appendChild(svg("path", {
            d: pathFromPoints([
                ...U,
                ...L.slice().reverse()
            ], true),
            class: "offset-iso-side-panel"
        }));

        /*
         * Inlet and outlet end faces.
         */
        drawing.appendChild(svg("polygon", {
            points: [
                U[0],
                BU[0],
                BL[0],
                L[0]
            ].map((point) => `${point.x},${point.y}`).join(" "),
            class: "offset-iso-end-face"
        }));

        const last = U.length - 1;

        drawing.appendChild(svg("polygon", {
            points: [
                U[last],
                BU[last],
                BL[last],
                L[last]
            ].map((point) => `${point.x},${point.y}`).join(" "),
            class: "offset-iso-end-face"
        }));

        /*
         * Centerline.
         */
        drawing.appendChild(svg("path", {
            d: pathFromPoints(C),
            class: "offset-iso-center-line"
        }));

        /*
         * Joint lines at the tangent points. When straight is zero, the two
         * tangent lines meet, matching the user's original two-elbow picture.
         */
        const jointIndexes = [];
        const arcSteps = 18;

        jointIndexes.push(2 + arcSteps);

        if (model.straight > 0.05) {
            jointIndexes.push(3 + arcSteps);
        }

        jointIndexes.forEach((index) => {
            if (!U[index] || !L[index]) {
                return;
            }

            drawing.appendChild(svg("line", {
                x1: U[index].x,
                y1: U[index].y,
                x2: L[index].x,
                y2: L[index].y,
                class: "offset-iso-joint-line"
            }));

            if (BU[index] && BL[index]) {
                drawing.appendChild(svg("line", {
                    x1: BU[index].x,
                    y1: BU[index].y,
                    x2: BL[index].x,
                    y2: BL[index].y,
                    class: "offset-iso-joint-line offset-iso-joint-back"
                }));
            }
        });

        /*
         * Dimensions for the upright orientation.
         * Overall length now reads vertically and offset reads horizontally.
         */
        const dimensionGroup = svg("g");

        const startCenter = C[1];
        const endCenter = C[C.length - 2];

        const overallX = 48;

        dimensionGroup.appendChild(svg("line", {
            x1: startCenter.x,
            y1: startCenter.y,
            x2: overallX,
            y2: startCenter.y,
            class: "offset-iso-extension-line"
        }));

        dimensionGroup.appendChild(svg("line", {
            x1: endCenter.x,
            y1: endCenter.y,
            x2: overallX,
            y2: endCenter.y,
            class: "offset-iso-extension-line"
        }));

        drawDimension(
            dimensionGroup,
            { x: overallX, y: startCenter.y },
            { x: overallX, y: endCenter.y },
            `Overall Length: ${format(model.run)}"`,
            -18
        );

        const offsetY = viewHeight - 42;

        dimensionGroup.appendChild(svg("line", {
            x1: startCenter.x,
            y1: startCenter.y,
            x2: startCenter.x,
            y2: offsetY,
            class: "offset-iso-extension-line"
        }));

        dimensionGroup.appendChild(svg("line", {
            x1: endCenter.x,
            y1: endCenter.y,
            x2: endCenter.x,
            y2: offsetY,
            class: "offset-iso-extension-line"
        }));

        drawDimension(
            dimensionGroup,
            { x: startCenter.x, y: offsetY },
            { x: endCenter.x, y: offsetY },
            `Offset: ${format(model.rise)}"`,
            -16
        );

        drawing.appendChild(dimensionGroup);

        /*
         * Labels.
         */
        drawing.appendChild(svg("text", {
            x: 112,
            y: viewHeight - 85,
            class: "offset-iso-size-text"
        }, `Cheek: ${format(model.cheek)}"`));

        drawing.appendChild(svg("text", {
            x: viewWidth / 2,
            y: 42,
            class: "offset-iso-size-text"
        }, `${format(model.angle)}° elbows`));

        drawing.appendChild(svg("text", {
            x: viewWidth / 2,
            y: 68,
            class: "offset-iso-title-text"
        }, model.straight > 0.05
            ? `Middle straight: ${format(model.straight)}"`
            : "Elbows meet — no middle straight"
        ));

        drawing.appendChild(svg("text", {
            x: viewWidth - 150,
            y: 42,
            class: "offset-iso-title-text"
        }, `CLR: ${format(model.radius)}"`));

        container.appendChild(drawing);
    }

    function bind() {
        const watchedIds = [
            ids.mode,
            ids.offset,
            ids.overall,
            ids.cheek,
            ids.clrMultiplier,
            ids.customClr,
            ids.angle
        ];

        watchedIds.forEach((id) => {
            const element = document.getElementById(id);

            if (!element) {
                return;
            }

            element.addEventListener("input", render);
            element.addEventListener("change", render);
        });

        /*
         * Keep compatibility with manual calls from the page.
         */
        window.OffsetIso = {
            render,
            bindInputs: bind
        };

        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            bind
        );
    } else {
        bind();
    }
})();
