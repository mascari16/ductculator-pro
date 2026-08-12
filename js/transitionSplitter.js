/* =====================================================
   DUCTCULATOR PRO
   TRANSITION SPLITTER
   File: js/transitionSplitter.js

   Splits one linear rectangular taper/transition into
   2, 3, or 4 equal-length fittings while preserving the
   original end sizes and CAMduct offset geometry.
   ===================================================== */

(function () {
    "use strict";

    const IDS = {
        workspace: "transitionWorkspace",
        dashboard: "dashboard",
        airflow: "airflowWorkspace",
        equivalent: "equivalentWorkspace",
        sheetMetal: "sheetMetalWorkspace",
        openDashboard: "openTransitionSplitter",
        fromAirflow: "airflowOpenTransitionSplitter",
        fromEquivalent: "equivalentOpenTransitionSplitter",
        fromSheetMetal: "sheetMetalOpenTransitionSplitter",
        home: "transitionGoHome",
        openAirflow: "transitionOpenAirflow",
        openEquivalent: "transitionOpenEquivalent",
        openSheetMetal: "transitionOpenSheetMetal",
        mobileButton: "transitionMobileMenuBtn",
        mobileOverlay: "transitionMobileOverlay",
        sidebarToggle: "toggleTransitionSidebar",
        widthIn: "transitionWidthIn",
        depthIn: "transitionDepthIn",
        widthOut: "transitionWidthOut",
        depthOut: "transitionDepthOut",
        length: "transitionLength",
        offsetWidth: "transitionOffsetWidth",
        offsetWidthMode: "transitionOffsetWidthMode",
        offsetDepth: "transitionOffsetDepth",
        offsetDepthMode: "transitionOffsetDepthMode",
        splitCount: "transitionSplitCount",
        calculate: "calculateTransitionSplit",
        topView: "transitionTopView",
        sideView: "transitionSideView",
        summary: "transitionSplitSummary",
        fittingList: "transitionFittingList"
    };

    const NS = "http://www.w3.org/2000/svg";

    function byId(id) {
        return document.getElementById(id);
    }

    function parseMeasurement(value, fallback = NaN) {
        let text = String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/inches|inch|in\./g, "")
            .replace(/"/g, "")
            .replace(/\s+/g, " ");

        if (!text) {
            return fallback;
        }

        let total = 0;

        if (text.includes("'")) {
            const parts = text.split("'");
            const feet = Number(parts[0].trim());

            if (!Number.isFinite(feet)) {
                return fallback;
            }

            total += feet * 12;
            text = (parts[1] || "").trim();
        }

        text = text.replace(
            /^(-?\d+(?:\.\d+)?)-(\d+)\/(\d+)$/,
            "$1 $2/$3"
        );

        if (!text) {
            return total;
        }

        for (const part of text.split(" ")) {
            if (!part) {
                continue;
            }

            if (part.includes("/")) {
                const [nText, dText] = part.split("/");
                const numerator = Number(nText);
                const denominator = Number(dText);

                if (
                    !Number.isFinite(numerator) ||
                    !Number.isFinite(denominator) ||
                    denominator === 0
                ) {
                    return fallback;
                }

                total += numerator / denominator;
            } else {
                const number = Number(part);

                if (!Number.isFinite(number)) {
                    return fallback;
                }

                total += number;
            }
        }

        return total;
    }

    function gcd(a, b) {
        let x = Math.abs(a);
        let y = Math.abs(b);

        while (y) {
            const t = y;
            y = x % y;
            x = t;
        }

        return x || 1;
    }

    function formatMeasurement(value) {
        if (!Number.isFinite(value)) {
            return "—";
        }

        const sign = value < 0 ? "−" : "";
        const absolute = Math.abs(value);
        const sixteenths = Math.round(absolute * 16);
        const whole = Math.floor(sixteenths / 16);
        const remainder = sixteenths % 16;

        if (remainder === 0) {
            return `${sign}${whole}\"`;
        }

        const divisor = gcd(remainder, 16);
        const numerator = remainder / divisor;
        const denominator = 16 / divisor;

        if (whole === 0) {
            return `${sign}${numerator}/${denominator}\"`;
        }

        return `${sign}${whole} ${numerator}/${denominator}\"`;
    }

    function cleanNumber(value) {
        return Number(value.toFixed(10));
    }

    function formatCamduct(value) {
        if (!Number.isFinite(value)) {
            return "—";
        }

        return value.toFixed(3);
    }

    function readInputs() {
        return {
            widthIn: parseMeasurement(byId(IDS.widthIn)?.value),
            depthIn: parseMeasurement(byId(IDS.depthIn)?.value),
            widthOut: parseMeasurement(byId(IDS.widthOut)?.value),
            depthOut: parseMeasurement(byId(IDS.depthOut)?.value),
            length: parseMeasurement(byId(IDS.length)?.value),
            offsetWidth: parseMeasurement(byId(IDS.offsetWidth)?.value, 0),
            offsetWidthMode: byId(IDS.offsetWidthMode)?.value || "leftIn",
            offsetDepth: parseMeasurement(byId(IDS.offsetDepth)?.value, 0),
            offsetDepthMode: byId(IDS.offsetDepthMode)?.value || "topUp",
            splitCount: Number(byId(IDS.splitCount)?.value || 2)
        };
    }

    function validate(data) {
        const positiveFields = [
            [data.widthIn, "Width In"],
            [data.depthIn, "Depth In"],
            [data.widthOut, "Width Out"],
            [data.depthOut, "Depth Out"],
            [data.length, "Length"]
        ];

        for (const [value, label] of positiveFields) {
            if (!Number.isFinite(value) || value <= 0) {
                return `Enter a valid ${label} greater than zero.`;
            }
        }

        if (!Number.isFinite(data.offsetWidth)) {
            return "Enter a valid Offset Width.";
        }

        if (!Number.isFinite(data.offsetDepth)) {
            return "Enter a valid Offset Depth.";
        }

        if (![2, 3, 4].includes(data.splitCount)) {
            return "Choose 2, 3, or 4 fittings.";
        }

        return "";
    }

    /*
     * Autodesk CAMduct taper offset semantics converted to a canonical
     * coordinate system. The inlet left/bottom edge starts at zero.
     */
    function outletLeftFromMode(widthIn, widthOut, offset, mode) {
        switch (mode) {
            case "leftOut":
                return -offset;
            case "rightIn":
                return widthIn - offset - widthOut;
            case "rightOut":
                return widthIn + offset - widthOut;
            case "leftIn":
            default:
                return offset;
        }
    }

    function outletBottomFromMode(depthIn, depthOut, offset, mode) {
        switch (mode) {
            case "bottomUp":
                return offset;
            case "bottomDown":
                return -offset;
            case "topDown":
                return depthIn - offset - depthOut;
            case "topUp":
            default:
                return depthIn + offset - depthOut;
        }
    }

    function offsetWidthForSegment(widthIn, widthOut, leftDelta, mode) {
        const outletRight = leftDelta + widthOut;

        switch (mode) {
            case "leftOut":
                return -leftDelta;
            case "rightIn":
                return widthIn - outletRight;
            case "rightOut":
                return outletRight - widthIn;
            case "leftIn":
            default:
                return leftDelta;
        }
    }

    function offsetDepthForSegment(depthIn, depthOut, bottomDelta, mode) {
        const outletTop = bottomDelta + depthOut;

        switch (mode) {
            case "bottomUp":
                return bottomDelta;
            case "bottomDown":
                return -bottomDelta;
            case "topDown":
                return depthIn - outletTop;
            case "topUp":
            default:
                return outletTop - depthIn;
        }
    }

    function lerp(start, end, t) {
        return start + (end - start) * t;
    }

    function calculateSplit(data) {
        const outletLeft = outletLeftFromMode(
            data.widthIn,
            data.widthOut,
            data.offsetWidth,
            data.offsetWidthMode
        );

        const outletBottom = outletBottomFromMode(
            data.depthIn,
            data.depthOut,
            data.offsetDepth,
            data.offsetDepthMode
        );

        const stations = [];

        for (let index = 0; index <= data.splitCount; index += 1) {
            const t = index / data.splitCount;

            stations.push({
                t,
                lengthPosition: data.length * t,
                width: lerp(data.widthIn, data.widthOut, t),
                depth: lerp(data.depthIn, data.depthOut, t),
                left: outletLeft * t,
                bottom: outletBottom * t
            });
        }

        const fittings = [];

        for (let index = 0; index < data.splitCount; index += 1) {
            const inlet = stations[index];
            const outlet = stations[index + 1];
            const localLeftDelta = outlet.left - inlet.left;
            const localBottomDelta = outlet.bottom - inlet.bottom;

            fittings.push({
                number: index + 1,
                widthIn: cleanNumber(inlet.width),
                depthIn: cleanNumber(inlet.depth),
                widthOut: cleanNumber(outlet.width),
                depthOut: cleanNumber(outlet.depth),
                length: cleanNumber(outlet.lengthPosition - inlet.lengthPosition),
                offsetWidth: cleanNumber(
                    offsetWidthForSegment(
                        inlet.width,
                        outlet.width,
                        localLeftDelta,
                        data.offsetWidthMode
                    )
                ),
                offsetDepth: cleanNumber(
                    offsetDepthForSegment(
                        inlet.depth,
                        outlet.depth,
                        localBottomDelta,
                        data.offsetDepthMode
                    )
                ),
                offsetWidthMode: data.offsetWidthMode,
                offsetDepthMode: data.offsetDepthMode
            });
        }

        return {
            ...data,
            outletLeft,
            outletBottom,
            stations,
            fittings
        };
    }

    function widthModeLabel(value) {
        return {
            leftIn: "Left In",
            leftOut: "Left Out",
            rightIn: "Right In",
            rightOut: "Right Out"
        }[value] || "Left In";
    }

    function depthModeLabel(value) {
        return {
            topUp: "Top Up",
            topDown: "Top Down",
            bottomUp: "Bottom Up",
            bottomDown: "Bottom Down"
        }[value] || "Top Up";
    }

    function svg(tag, attrs = {}, text = "") {
        const element = document.createElementNS(NS, tag);

        for (const [key, value] of Object.entries(attrs)) {
            element.setAttribute(key, String(value));
        }

        if (text) {
            element.textContent = text;
        }

        return element;
    }

    function viewCoordinates(result, dimensionKey, positionKey) {
        const stations = result.stations;
        const minEdge = Math.min(
            ...stations.map(station => station[positionKey])
        );
        const maxEdge = Math.max(
            ...stations.map(station => station[positionKey] + station[dimensionKey])
        );
        const span = Math.max(1, maxEdge - minEdge);
        const length = Math.max(1, result.length);

        const viewWidth = 620;
        const viewHeight = 520;
        const padX = 74;
        const padTop = 62;
        const padBottom = 74;
        const availableWidth = viewWidth - padX * 2;
        const availableHeight = viewHeight - padTop - padBottom;
        const scale = Math.min(
            availableWidth / span,
            availableHeight / length
        );
        const renderedSpan = span * scale;
        const renderedLength = length * scale;
        const originX = (viewWidth - renderedSpan) / 2 - minEdge * scale;
        const baseY = padTop + renderedLength;

        return {
            viewWidth,
            viewHeight,
            scale,
            originX,
            baseY,
            point(station, side) {
                const edge = side === "low"
                    ? station[positionKey]
                    : station[positionKey] + station[dimensionKey];

                return {
                    x: originX + edge * scale,
                    y: baseY - station.lengthPosition * scale
                };
            }
        };
    }

    function addArrowDefs(drawing, prefix) {
        const defs = svg("defs");
        const marker = svg("marker", {
            id: `${prefix}Arrow`,
            markerWidth: 7,
            markerHeight: 7,
            refX: 6,
            refY: 3.5,
            orient: "auto-start-reverse",
            viewBox: "0 0 7 7"
        });

        marker.appendChild(svg("path", {
            d: "M 0 0 L 7 3.5 L 0 7",
            fill: "none",
            stroke: "#f5b941",
            "stroke-width": 1.2,
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        }));

        defs.appendChild(marker);
        drawing.appendChild(defs);
    }

    function renderTransitionView(container, result, options) {
        if (!container) {
            return;
        }

        container.replaceChildren();

        const coordinates = viewCoordinates(
            result,
            options.dimensionKey,
            options.positionKey
        );

        const drawing = svg("svg", {
            viewBox: `0 0 ${coordinates.viewWidth} ${coordinates.viewHeight}`,
            role: "img",
            "aria-label": options.ariaLabel,
            class: "transition-view-svg"
        });

        addArrowDefs(drawing, options.prefix);

        const segmentPalette = [
            "rgba(79,140,255,.26)",
            "rgba(34,211,238,.16)",
            "rgba(139,92,246,.18)",
            "rgba(79,140,255,.20)"
        ];

        result.fittings.forEach((fitting, index) => {
            const stationA = result.stations[index];
            const stationB = result.stations[index + 1];
            const aLow = coordinates.point(stationA, "low");
            const aHigh = coordinates.point(stationA, "high");
            const bLow = coordinates.point(stationB, "low");
            const bHigh = coordinates.point(stationB, "high");

            drawing.appendChild(svg("polygon", {
                points: [aLow, aHigh, bHigh, bLow]
                    .map(point => `${point.x},${point.y}`)
                    .join(" "),
                fill: segmentPalette[index % segmentPalette.length],
                stroke: "#76a5ff",
                "stroke-width": 2
            }));

            const centerX = (
                aLow.x + aHigh.x + bLow.x + bHigh.x
            ) / 4;
            const centerY = (
                aLow.y + aHigh.y + bLow.y + bHigh.y
            ) / 4;

            drawing.appendChild(svg("rect", {
                x: centerX - 42,
                y: centerY - 15,
                width: 84,
                height: 30,
                rx: 15,
                fill: "rgba(11,18,32,.88)",
                stroke: "#4f8cff",
                "stroke-width": 1
            }));

            drawing.appendChild(svg("text", {
                x: centerX,
                y: centerY + 1,
                fill: "#f8fafc",
                "font-size": 15,
                "font-weight": 750,
                "text-anchor": "middle",
                "dominant-baseline": "middle"
            }, `Fitting ${fitting.number}`));
        });

        result.stations.forEach((station, index) => {
            const low = coordinates.point(station, "low");
            const high = coordinates.point(station, "high");
            const isEnd = index === 0 || index === result.stations.length - 1;

            drawing.appendChild(svg("line", {
                x1: low.x,
                y1: low.y,
                x2: high.x,
                y2: high.y,
                stroke: isEnd ? "#a8c4ff" : "#f5b941",
                "stroke-width": isEnd ? 2.4 : 2,
                "stroke-dasharray": isEnd ? "" : "7 5"
            }));

            if (!isEnd) {
                const middleX = (low.x + high.x) / 2;
                drawing.appendChild(svg("text", {
                    x: middleX,
                    y: low.y - 10,
                    fill: "#f5b941",
                    "font-size": 12,
                    "font-weight": 700,
                    "text-anchor": "middle"
                }, `Break ${index}`));
            }
        });

        const inletLow = coordinates.point(result.stations[0], "low");
        const inletHigh = coordinates.point(result.stations[0], "high");
        const outletStation = result.stations[result.stations.length - 1];
        const outletLow = coordinates.point(outletStation, "low");
        const outletHigh = coordinates.point(outletStation, "high");

        const dimY = Math.min(
            coordinates.viewHeight - 25,
            Math.max(inletLow.y, inletHigh.y) + 35
        );

        drawing.appendChild(svg("line", {
            x1: inletLow.x,
            y1: dimY,
            x2: inletHigh.x,
            y2: dimY,
            stroke: "#f5b941",
            "stroke-width": 1.6,
            "marker-start": `url(#${options.prefix}Arrow)`,
            "marker-end": `url(#${options.prefix}Arrow)`
        }));

        drawing.appendChild(svg("text", {
            x: (inletLow.x + inletHigh.x) / 2,
            y: dimY + 22,
            fill: "#f5b941",
            "font-size": 14,
            "font-weight": 750,
            "text-anchor": "middle"
        }, `${options.inletLabel}: ${formatMeasurement(result[options.inletValueKey])}`));

        drawing.appendChild(svg("text", {
            x: (outletLow.x + outletHigh.x) / 2,
            y: Math.min(outletLow.y, outletHigh.y) - 17,
            fill: "#f5b941",
            "font-size": 14,
            "font-weight": 750,
            "text-anchor": "middle"
        }, `${options.outletLabel}: ${formatMeasurement(result[options.outletValueKey])}`));

        const leftMost = Math.min(
            ...result.stations.flatMap(station => {
                const low = coordinates.point(station, "low");
                const high = coordinates.point(station, "high");
                return [low.x, high.x];
            })
        );

        const lengthX = Math.max(30, leftMost - 34);
        const bottomY = coordinates.point(result.stations[0], "low").y;
        const topY = coordinates.point(outletStation, "low").y;

        drawing.appendChild(svg("line", {
            x1: lengthX,
            y1: bottomY,
            x2: lengthX,
            y2: topY,
            stroke: "#f5b941",
            "stroke-width": 1.6,
            "marker-start": `url(#${options.prefix}Arrow)`,
            "marker-end": `url(#${options.prefix}Arrow)`
        }));

        const lengthText = svg("text", {
            x: lengthX - 14,
            y: (bottomY + topY) / 2,
            fill: "#f5b941",
            "font-size": 14,
            "font-weight": 750,
            "text-anchor": "middle"
        }, `Length: ${formatMeasurement(result.length)}`);

        lengthText.setAttribute(
            "transform",
            `rotate(-90 ${lengthX - 14} ${(bottomY + topY) / 2})`
        );
        drawing.appendChild(lengthText);

        container.appendChild(drawing);
    }

    function renderSummary(result) {
        const summary = byId(IDS.summary);

        if (!summary) {
            return;
        }

        const eachLength = result.length / result.splitCount;

        summary.innerHTML = `
            <div class="transition-summary-card">
                <span>Original Length</span>
                <strong>${formatMeasurement(result.length)}</strong>
            </div>
            <div class="transition-summary-card transition-summary-primary">
                <span>Split Into</span>
                <strong>${result.splitCount} Fittings</strong>
            </div>
            <div class="transition-summary-card">
                <span>Each Length</span>
                <strong>${formatMeasurement(eachLength)}</strong>
            </div>
            <div class="transition-summary-card">
                <span>Intermediate Breaks</span>
                <strong>${result.splitCount - 1}</strong>
            </div>
        `;
    }

    function entry(label, value, className = "", measurement = false) {
        const mainValue = measurement
            ? formatCamduct(value)
            : value;

        const fraction = measurement
            ? `<small>${formatMeasurement(value)}</small>`
            : "";

        return `
            <div class="transition-entry ${className}">
                <span>${label}</span>
                <strong>${mainValue}</strong>
                ${fraction}
            </div>
        `;
    }

    function renderFittings(result) {
        const list = byId(IDS.fittingList);

        if (!list) {
            return;
        }

        list.innerHTML = result.fittings.map(fitting => `
            <article class="transition-fitting-card">
                <div class="transition-fitting-heading">
                    <div>
                        <span>CAMDUCT ENTRY</span>
                        <h3>Fitting ${fitting.number}</h3>
                    </div>
                    <div class="transition-fitting-size">
                        ${formatMeasurement(fitting.widthIn)} × ${formatMeasurement(fitting.depthIn)}
                        <b>→</b>
                        ${formatMeasurement(fitting.widthOut)} × ${formatMeasurement(fitting.depthOut)}
                    </div>
                </div>

                <div class="transition-entry-grid">
                    ${entry("A) Width In", fitting.widthIn, "", true)}
                    ${entry("B) Depth In", fitting.depthIn, "", true)}
                    ${entry("C) Width Out", fitting.widthOut, "", true)}
                    ${entry("D) Depth Out", fitting.depthOut, "", true)}
                    ${entry("E) Length", fitting.length, "transition-entry-emphasis", true)}
                    ${entry("H) Offset Width", fitting.offsetWidth, "", true)}
                    ${entry("Offset Width Mode", widthModeLabel(fitting.offsetWidthMode))}
                    ${entry("I) Offset Depth", fitting.offsetDepth, "", true)}
                    ${entry("Offset Depth Mode", depthModeLabel(fitting.offsetDepthMode))}
                </div>
            </article>
        `).join("");
    }

    function showError(message) {
        const summary = byId(IDS.summary);
        const list = byId(IDS.fittingList);
        const topView = byId(IDS.topView);
        const sideView = byId(IDS.sideView);

        if (summary) {
            summary.innerHTML = `
                <div class="transition-error">
                    <strong>Check Transition Inputs</strong>
                    <span>${message}</span>
                </div>
            `;
        }

        if (list) {
            list.innerHTML = "";
        }

        for (const view of [topView, sideView]) {
            if (view) {
                view.innerHTML = `
                    <div class="transition-view-placeholder">
                        Enter valid dimensions to build the split transition.
                    </div>
                `;
            }
        }
    }

    function update() {
        const data = readInputs();
        const error = validate(data);

        if (error) {
            showError(error);
            return;
        }

        const result = calculateSplit(data);

        renderTransitionView(byId(IDS.topView), result, {
            dimensionKey: "width",
            positionKey: "left",
            ariaLabel: "Top view of split rectangular transition",
            prefix: "transitionTop",
            inletLabel: "Width In",
            outletLabel: "Width Out",
            inletValueKey: "widthIn",
            outletValueKey: "widthOut"
        });

        renderTransitionView(byId(IDS.sideView), result, {
            dimensionKey: "depth",
            positionKey: "bottom",
            ariaLabel: "Side view of split rectangular transition",
            prefix: "transitionSide",
            inletLabel: "Depth In",
            outletLabel: "Depth Out",
            inletValueKey: "depthIn",
            outletValueKey: "depthOut"
        });

        renderSummary(result);
        renderFittings(result);
    }

    function activateOnly(targetId) {
        const dashboard = byId(IDS.dashboard);
        const workspaceIds = [
            IDS.airflow,
            IDS.equivalent,
            IDS.sheetMetal,
            IDS.workspace
        ];

        dashboard?.classList.remove("active");

        for (const id of workspaceIds) {
            byId(id)?.classList.toggle("active", id === targetId);
        }
    }

    function goDashboard() {
        for (const id of [
            IDS.airflow,
            IDS.equivalent,
            IDS.sheetMetal,
            IDS.workspace
        ]) {
            byId(id)?.classList.remove("active");
        }

        byId(IDS.dashboard)?.classList.add("active");
        closeMobileMenu();
    }

    const transitionSidebar = document.querySelector(".transition-sidebar");

    function isMobile() {
        return window.innerWidth <= 900;
    }

    function openMobileMenu() {
        transitionSidebar?.classList.add("mobile-open");
        byId(IDS.mobileOverlay)?.classList.add("active");
    }

    function closeMobileMenu() {
        transitionSidebar?.classList.remove("mobile-open");
        byId(IDS.mobileOverlay)?.classList.remove("active");
    }

    function bindNavigation() {
        const transitionOpeners = [
            IDS.openDashboard,
            IDS.fromAirflow,
            IDS.fromEquivalent,
            IDS.fromSheetMetal
        ];

        transitionOpeners.forEach(id => {
            byId(id)?.addEventListener("click", () => {
                activateOnly(IDS.workspace);
                update();
            });
        });

        byId(IDS.home)?.addEventListener("click", goDashboard);
        byId(IDS.openAirflow)?.addEventListener("click", () => {
            activateOnly(IDS.airflow);
            closeMobileMenu();
        });
        byId(IDS.openEquivalent)?.addEventListener("click", () => {
            activateOnly(IDS.equivalent);
            closeMobileMenu();
        });
        byId(IDS.openSheetMetal)?.addEventListener("click", () => {
            activateOnly(IDS.sheetMetal);
            closeMobileMenu();
        });

        byId(IDS.mobileButton)?.addEventListener("click", openMobileMenu);
        byId(IDS.mobileOverlay)?.addEventListener("click", closeMobileMenu);
        byId(IDS.sidebarToggle)?.addEventListener("click", () => {
            if (isMobile()) {
                closeMobileMenu();
            } else {
                transitionSidebar?.classList.toggle("collapsed");
            }
        });

        window.addEventListener("resize", () => {
            if (!isMobile()) {
                closeMobileMenu();
            }
        });
    }

    function bindInputs() {
        const inputs = [
            IDS.widthIn,
            IDS.depthIn,
            IDS.widthOut,
            IDS.depthOut,
            IDS.length,
            IDS.offsetWidth,
            IDS.offsetWidthMode,
            IDS.offsetDepth,
            IDS.offsetDepthMode,
            IDS.splitCount
        ];

        inputs.forEach(id => {
            const element = byId(id);

            element?.addEventListener("input", update);
            element?.addEventListener("change", update);
        });

        byId(IDS.calculate)?.addEventListener("click", update);
    }

    function initialize() {
        bindNavigation();
        bindInputs();
        update();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
