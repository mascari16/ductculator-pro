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
        maxPiece: "transitionMaxPiece",
        maxPieceGroup: "transitionMaxPieceGroup",
        taperLimit: "transitionTaperLimit",
        taperNote: "transitionTaperNote",
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

    function formatCamductCompact(value) {
        if (!Number.isFinite(value)) {
            return "—";
        }

        return value
            .toFixed(3)
            .replace(/\.000$/, "")
            .replace(/(\.\d*[1-9])0+$/, "$1");
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
            splitCount: Number(byId(IDS.splitCount)?.value || 2),
            splitMode: byId(IDS.splitCount)?.value === "auto" ? "auto" : "fixed",
            maxPiece: parseMeasurement(byId(IDS.maxPiece)?.value),
            taperLimit: Number(byId(IDS.taperLimit)?.value)
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

        if (data.splitMode === "auto") {
            if (!Number.isFinite(data.maxPiece) || data.maxPiece <= 0) {
                return "Enter a valid Max piece length greater than zero.";
            }

            data.splitCount = Math.ceil(data.length / data.maxPiece - 1e-9);

            if (data.splitCount < 2) {
                return `The whole transition (${formatMeasurement(data.length)}) already fits in one piece at a max of ${formatMeasurement(data.maxPiece)}. No split is needed.`;
            }

            if (data.splitCount > 12) {
                return `That would take ${data.splitCount} pieces. Use a longer Max piece length (12 pieces is the most this tool lays out).`;
            }

            return "";
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

    function viewCoordinates(
        result,
        dimensionKey,
        positionKey,
        reverseHorizontal = false
    ) {
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

                const normalX =
                    originX +
                    edge *
                    scale;

                const x = reverseHorizontal
                    ? viewWidth - normalX
                    : normalX;

                return {
                    x,
                    y:
                        baseY -
                        station.lengthPosition *
                        scale
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
            stroke: "#f2c231",
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
            options.positionKey,
            Boolean(options.reverseHorizontal)
        );

        const drawing = svg("svg", {
            viewBox: `0 0 ${coordinates.viewWidth} ${coordinates.viewHeight}`,
            role: "img",
            "aria-label": options.ariaLabel,
            class: "transition-view-svg"
        });

        addArrowDefs(drawing, options.prefix);

        /*
         * Make the viewing direction impossible to miss.
         */
        drawing.appendChild(svg("text", {
            x: 18,
            y: 25,
            fill: "#9ed1e8",
            "font-size": 12,
            "font-weight": 850,
            "letter-spacing": ".10em"
        }, options.viewLabel));

        drawing.appendChild(svg("text", {
            x: 18,
            y: 43,
            fill: "#8d9ca7",
            "font-size": 10.5,
            "font-weight": 650
        }, options.viewDirection));

        const segmentPalette = [
            "rgba(107,184,220,.26)",
            "rgba(34,211,238,.16)",
            "rgba(139,92,246,.18)",
            "rgba(107,184,220,.20)"
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
                stroke: "#8ac7e4",
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
                fill: "rgba(24,28,31,.88)",
                stroke: "#6bb8dc",
                "stroke-width": 1
            }));

            drawing.appendChild(svg("text", {
                x: centerX,
                y: centerY + 1,
                fill: "#f9fafb",
                "font-size": 15,
                "font-weight": 750,
                "text-anchor": "middle",
                "dominant-baseline": "middle"
            }, `Fitting ${fitting.number}`));
        });

        /*
         * End stations are solid.
         * Intermediate split stations are yellow dashed lines with the
         * complete W × D break size shown directly below the break label.
         */
        result.stations.forEach((station, index) => {
            const low = coordinates.point(station, "low");
            const high = coordinates.point(station, "high");
            const isEnd = index === 0 || index === result.stations.length - 1;

            drawing.appendChild(svg("line", {
                x1: low.x,
                y1: low.y,
                x2: high.x,
                y2: high.y,
                stroke: isEnd ? "#acd8ec" : "#f2c231",
                "stroke-width": isEnd ? 2.4 : 2,
                "stroke-dasharray": isEnd ? "" : "7 5"
            }));

            if (!isEnd) {
                const middleX = (low.x + high.x) / 2;
                const lineY = (low.y + high.y) / 2;

                drawing.appendChild(svg("text", {
                    x: middleX,
                    y: lineY - 9,
                    fill: "#f2c231",
                    "font-size": 11.5,
                    "font-weight": 800,
                    "text-anchor": "middle"
                }, `Break ${index}`));

                drawing.appendChild(svg("text", {
                    x: middleX,
                    y: lineY + 18,
                    fill: "#f9fafb",
                    "font-size": 12.5,
                    "font-weight": 800,
                    "text-anchor": "middle"
                }, `${formatMeasurement(station.width)} × ${formatMeasurement(station.depth)}`));
            }
        });

        const inletStation = result.stations[0];
        const inletLow = coordinates.point(inletStation, "low");
        const inletHigh = coordinates.point(inletStation, "high");
        const outletStation = result.stations[result.stations.length - 1];
        const outletLow = coordinates.point(outletStation, "low");
        const outletHigh = coordinates.point(outletStation, "high");

        /*
         * Inlet dimension.
         */
        const dimY = Math.min(
            coordinates.viewHeight - 25,
            Math.max(inletLow.y, inletHigh.y) + 35
        );

        drawing.appendChild(svg("line", {
            x1: inletLow.x,
            y1: dimY,
            x2: inletHigh.x,
            y2: dimY,
            stroke: "#f2c231",
            "stroke-width": 1.6,
            "marker-start": `url(#${options.prefix}Arrow)`,
            "marker-end": `url(#${options.prefix}Arrow)`
        }));

        drawing.appendChild(svg("text", {
            x: (inletLow.x + inletHigh.x) / 2,
            y: dimY + 22,
            fill: "#f2c231",
            "font-size": 14,
            "font-weight": 750,
            "text-anchor": "middle"
        }, `${options.inletLabel}: ${formatMeasurement(result[options.inletValueKey])}`));

        if (options.offsetAxis === "depth") {
            /*
             * With the right view mirrored, inletHigh (TOP) appears on
             * screen-left and inletLow (BOTTOM) appears on screen-right.
             */
            drawing.appendChild(svg("text", {
                x: inletLow.x,
                y: dimY + 39,
                fill: "#8d9ca7",
                "font-size": 9.5,
                "font-weight": 800,
                "text-anchor": "middle",
                "letter-spacing": ".08em"
            }, "BOTTOM"));

            drawing.appendChild(svg("text", {
                x: inletHigh.x,
                y: dimY + 39,
                fill: "#8d9ca7",
                "font-size": 9.5,
                "font-weight": 800,
                "text-anchor": "middle",
                "letter-spacing": ".08em"
            }, "TOP"));
        }

        /*
         * Outlet dimension.
         */
        drawing.appendChild(svg("text", {
            x: (outletLow.x + outletHigh.x) / 2,
            y: Math.min(outletLow.y, outletHigh.y) - 17,
            fill: "#f2c231",
            "font-size": 14,
            "font-weight": 750,
            "text-anchor": "middle"
        }, `${options.outletLabel}: ${formatMeasurement(result[options.outletValueKey])}`));

        /*
         * Overall length dimension.
         */
        const leftMost = Math.min(
            ...result.stations.flatMap(station => {
                const low = coordinates.point(station, "low");
                const high = coordinates.point(station, "high");
                return [low.x, high.x];
            })
        );

        const lengthX = Math.max(30, leftMost - 34);
        const bottomY = coordinates.point(inletStation, "low").y;
        const topY = coordinates.point(outletStation, "low").y;

        drawing.appendChild(svg("line", {
            x1: lengthX,
            y1: bottomY,
            x2: lengthX,
            y2: topY,
            stroke: "#f2c231",
            "stroke-width": 1.6,
            "marker-start": `url(#${options.prefix}Arrow)`,
            "marker-end": `url(#${options.prefix}Arrow)`
        }));

        const lengthText = svg("text", {
            x: lengthX - 14,
            y: (bottomY + topY) / 2,
            fill: "#f2c231",
            "font-size": 14,
            "font-weight": 750,
            "text-anchor": "middle"
        }, `Length: ${formatMeasurement(result.length)}`);

        lengthText.setAttribute(
            "transform",
            `rotate(-90 ${lengthX - 14} ${(bottomY + topY) / 2})`
        );
        drawing.appendChild(lengthText);

        /*
         * Offset dimension.
         *
         * CAMduct measures Left modes from the left/low edge and Right
         * modes from the right/high edge. Top modes use the high edge;
         * Bottom modes use the low edge.
         */
        const offsetValue = Math.abs(result[options.offsetValueKey]);

        if (offsetValue > 0.0001) {
            const mode = result[options.offsetModeKey];
            let inletReference;
            let outletReference;

            if (options.offsetAxis === "width") {
                const useHigh = mode === "rightIn" || mode === "rightOut";
                inletReference = useHigh ? inletHigh : inletLow;
                outletReference = useHigh ? outletHigh : outletLow;
            } else {
                const useHigh = mode === "topUp" || mode === "topDown";
                inletReference = useHigh ? inletHigh : inletLow;
                outletReference = useHigh ? outletHigh : outletLow;
            }

            /*
             * Put the offset dimension near the middle of the view. The
             * dashed projection lines make clear which inlet/outlet edges
             * the CAMduct offset is measured between.
             */
            let offsetDimY;

            if (options.offsetAxis === "depth") {
                const bottomMode =
                    mode === "bottomUp" ||
                    mode === "bottomDown";

                /*
                 * Keep Bottom offsets visually down by the inlet/bottom
                 * side of the right view, and Top offsets up by the outlet/
                 * top side. This does not change the CAMduct geometry or
                 * the calculated offset — only where the dimension is shown.
                 */
                offsetDimY = bottomMode
                    ? bottomY - 38
                    : topY + 38;
            } else {
                offsetDimY =
                    topY +
                    (bottomY - topY) *
                    0.34;
            }

            const minX = Math.min(inletReference.x, outletReference.x);
            const maxX = Math.max(inletReference.x, outletReference.x);

            drawing.appendChild(svg("line", {
                x1: inletReference.x,
                y1: inletReference.y,
                x2: inletReference.x,
                y2: offsetDimY,
                stroke: "#f2c231",
                "stroke-width": 1,
                "stroke-dasharray": "4 5",
                opacity: .72
            }));

            drawing.appendChild(svg("line", {
                x1: outletReference.x,
                y1: outletReference.y,
                x2: outletReference.x,
                y2: offsetDimY,
                stroke: "#f2c231",
                "stroke-width": 1,
                "stroke-dasharray": "4 5",
                opacity: .72
            }));

            drawing.appendChild(svg("line", {
                x1: minX,
                y1: offsetDimY,
                x2: maxX,
                y2: offsetDimY,
                stroke: "#f2c231",
                "stroke-width": 1.8,
                "marker-start": `url(#${options.prefix}Arrow)`,
                "marker-end": `url(#${options.prefix}Arrow)`
            }));

            drawing.appendChild(svg("text", {
                x: (minX + maxX) / 2,
                y: offsetDimY - 11,
                fill: "#f2c231",
                "font-size": 13,
                "font-weight": 850,
                "text-anchor": "middle"
            }, formatMeasurement(offsetValue)));
        }

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
                <span>Original length</span>
                <strong>${formatMeasurement(result.length)}</strong>
            </div>
            <div class="transition-summary-card transition-summary-primary">
                <span>Split into</span>
                <strong>${result.splitCount} fittings</strong>
            </div>
            <div class="transition-summary-card">
                <span>Each length</span>
                <strong>${formatMeasurement(eachLength)}</strong>
            </div>
            <div class="transition-summary-card">
                <span>Intermediate breaks</span>
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

        list.innerHTML = result.fittings.map(fitting => {
            const widthOffsetText =
                `${widthModeLabel(fitting.offsetWidthMode)} ` +
                `${formatCamductCompact(fitting.offsetWidth)}"`;

            const depthOffsetText =
                `${depthModeLabel(fitting.offsetDepthMode)} ` +
                `${formatCamductCompact(fitting.offsetDepth)}"`;

            return `
                <article class="transition-fitting-card">
                    <div class="transition-fitting-heading">
                        <div>
                            <span>CAMduct entry</span>
                            <h3>Fitting ${fitting.number}</h3>
                        </div>
                        <div class="transition-fitting-size">
                            ${formatMeasurement(fitting.widthIn)} × ${formatMeasurement(fitting.depthIn)}
                            <b>→</b>
                            ${formatMeasurement(fitting.widthOut)} × ${formatMeasurement(fitting.depthOut)}
                        </div>
                    </div>

                    <div class="transition-entry-grid transition-entry-grid-refined">
                        ${entry("A) Width In", fitting.widthIn, "", true)}
                        ${entry("B) Depth In", fitting.depthIn, "", true)}
                        ${entry("C) Width Out", fitting.widthOut, "", true)}
                        ${entry("D) Depth Out", fitting.depthOut, "", true)}
                        ${entry("E) Length", fitting.length, "transition-entry-length", true)}
                        ${entry("H) Offset Width", widthOffsetText, "transition-entry-offset")}
                        ${entry("I) Offset Depth", depthOffsetText, "transition-entry-offset")}
                    </div>
                </article>
            `;
        }).join("");
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

    /*
     * Side (taper) angles of the original transition. Every piece of the
     * split lies on the same straight edges, so splitting never changes
     * these angles; only a longer transition makes them shallower.
     */
    function taperAngles(result) {
        const L = result.length;
        const sides = [
            ["Left side", result.outletLeft],
            ["Right side", result.outletLeft + result.widthOut - result.widthIn],
            ["Bottom", result.outletBottom],
            ["Top", result.outletBottom + result.depthOut - result.depthIn]
        ].map(([name, shift]) => ({
            name,
            shift: Math.abs(shift),
            angle: Math.atan(Math.abs(shift) / L) * 180 / Math.PI
        }));

        sides.sort((a, b) => b.angle - a.angle);
        return sides;
    }

    function renderTaperNote(result) {
        const note = byId(IDS.taperNote);

        if (!note) {
            return;
        }

        if (!result) {
            note.innerHTML = "";
            note.hidden = true;
            return;
        }

        const sides = taperAngles(result);
        const steepest = sides[0];
        const limit = result.taperLimit;
        const hasLimit = Number.isFinite(limit) && limit > 0 && limit < 90;
        const over = hasLimit && steepest.angle > limit + 1e-9;

        let text =
            `<strong>Steepest side: ${steepest.angle.toFixed(1)}° (${steepest.name.toLowerCase()})</strong>` +
            `<span>Other sides: ` +
            sides.slice(1).map(side => `${side.name.toLowerCase()} ${side.angle.toFixed(1)}°`).join(", ") +
            ".</span>";

        if (over) {
            const minimumLength =
                Math.ceil(steepest.shift / Math.tan(limit * Math.PI / 180) * 4) / 4;

            text +=
                `<span>That is over your ${limit}° limit. Splitting doesn't change side angles because the pieces stay in line. ` +
                `To meet ${limit}°, the transition needs to be at least ${formatMeasurement(minimumLength)} long.</span>`;
        } else if (hasLimit) {
            text += `<span>Within your ${limit}° limit.</span>`;
        }

        note.className = over
            ? "transition-taper-note is-over"
            : "transition-taper-note";
        note.innerHTML = text;
        note.hidden = false;
    }

    function syncSplitMode() {
        const group = byId(IDS.maxPieceGroup);

        if (group) {
            group.hidden = byId(IDS.splitCount)?.value !== "auto";
        }
    }

    function update() {
        syncSplitMode();

        const data = readInputs();
        const error = validate(data);

        if (error) {
            showError(error);
            renderTaperNote(null);
            return;
        }

        const result = calculateSplit(data);

        renderTransitionView(byId(IDS.topView), result, {
            dimensionKey: "width",
            positionKey: "left",
            ariaLabel: "Top view looking down at split rectangular transition",
            prefix: "transitionTop",
            viewLabel: "TOP VIEW",
            viewDirection: "LOOKING DOWN",
            inletLabel: "Width In",
            outletLabel: "Width Out",
            inletValueKey: "widthIn",
            outletValueKey: "widthOut",
            offsetValueKey: "offsetWidth",
            offsetModeKey: "offsetWidthMode",
            offsetAxis: "width",
            offsetLabel: "Offset Width",
            reverseHorizontal: false
        });

        renderTransitionView(byId(IDS.sideView), result, {
            dimensionKey: "depth",
            positionKey: "bottom",
            ariaLabel: "Right view looking from the right side at split rectangular transition",
            prefix: "transitionRight",
            viewLabel: "RIGHT VIEW",
            viewDirection: "LOOKING FROM RIGHT",
            inletLabel: "Depth In",
            outletLabel: "Depth Out",
            inletValueKey: "depthIn",
            outletValueKey: "depthOut",
            offsetValueKey: "offsetDepth",
            offsetModeKey: "offsetDepthMode",
            offsetAxis: "depth",
            offsetLabel: "Offset Depth",

            /*
             * Looking at the fitting FROM THE RIGHT:
             * TOP is shown on the left side of the screen and
             * BOTTOM is shown on the right side, matching the
             * shop/CAMduct right-view convention.
             */
            reverseHorizontal: true
        });

        renderSummary(result);
        renderFittings(result);
        renderTaperNote(result);
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
            IDS.splitCount,
            IDS.maxPiece,
            IDS.taperLimit
        ];

        inputs.forEach(id => {
            const element = byId(id);

            element?.addEventListener("input", update);
            element?.addEventListener("change", update);
        });

        byId(IDS.calculate)?.addEventListener("click", update);
    }

    function initialize() {
        const widthMode = byId(IDS.offsetWidthMode);
        const depthMode = byId(IDS.offsetDepthMode);

        /*
         * Requested shop defaults. Do this once at initial page load so
         * browser form restoration cannot change the starting directions.
         */
        if (widthMode) {
            widthMode.value = "leftIn";
        }

        if (depthMode) {
            depthMode.value = "topUp";
        }

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
