/* =========================================================
   DUCTCULATOR PRO
   LIVE SINGLE RECTANGULAR RADIUS ELBOW PREVIEW
   File: offsetiso.js

   This preview shows ONE of the two matching elbows used
   to fabricate the calculated offset.

   Supported:
   - Full duct width × depth
   - Width is always the cheek side
   - Accurate centerline, throat, and heel radii
   - Correct calculated elbow angle
   - Straight added per elbow
   - Isometric depth based on the duct depth
   - Readable calculated-data panel
   ========================================================= */

(function () {
    "use strict";

    const NS =
        "http://www.w3.org/2000/svg";

    const ids = {
        container: "offsetIsoContainer",
        mode: "offsetMode",
        offset: "offsetInput",
        overall: "overallLengthInput",
        width: "ductWidthInput",
        depth: "ductDepthInput",
        clrMultiplier: "clrMultiplier",
        customClr: "customClrInput",
        angle: "elbowAngleInput"
    };

    let latestCalculatedData = null;

    function svg(
        tag,
        attributes = {},
        text = ""
    ) {

        const element =
            document.createElementNS(
                NS,
                tag
            );

        Object.entries(attributes)
            .forEach(([key, value]) => {

                element.setAttribute(
                    key,
                    String(value)
                );

            });

        if (text !== "") {

            element.textContent = text;

        }

        return element;

    }

    function parseMeasurement(
        value,
        fallback = 0
    ) {

        let text =
            String(value ?? "")
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

            const parts =
                text.split("'");

            const feet =
                Number(parts[0].trim());

            if (!Number.isFinite(feet)) {

                return fallback;

            }

            total += feet * 12;
            text =
                (parts[1] || "").trim();

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

                const values =
                    part.split("/");

                const numerator =
                    Number(values[0]);

                const denominator =
                    Number(values[1]);

                if (
                    !Number.isFinite(numerator) ||
                    !Number.isFinite(denominator) ||
                    denominator === 0
                ) {

                    return fallback;

                }

                total +=
                    numerator / denominator;

            } else {

                const number =
                    Number(part);

                if (!Number.isFinite(number)) {

                    return fallback;

                }

                total += number;

            }

        }

        return total;

    }

    function getValue(
        id,
        fallback = 0
    ) {

        const element =
            document.getElementById(id);

        return element
            ? parseMeasurement(
                element.value,
                fallback
            )
            : fallback;

    }

    function formatDecimal(value) {

        if (!Number.isFinite(value)) {

            return "—";

        }

        return value
            .toFixed(2)
            .replace(/\.00$/, "")
            .replace(/(\.\d)0$/, "$1");

    }

    function gcd(a, b) {

        while (b !== 0) {

            const temporary = b;

            b = a % b;
            a = temporary;

        }

        return Math.abs(a);

    }

    function formatMeasurement(value) {

        if (!Number.isFinite(value)) {

            return "—";

        }

        const sixteenths =
            Math.round(value * 16);

        const whole =
            Math.floor(
                sixteenths / 16
            );

        const remainder =
            sixteenths % 16;

        if (remainder === 0) {

            return `${whole}"`;

        }

        const divisor =
            gcd(remainder, 16);

        return `${whole} ${
            remainder / divisor
        }/${
            16 / divisor
        }"`;

    }

    function solveOffsetAngle(
        offset,
        overallLength,
        radius
    ) {

        function calculatedLength(
            angleDegrees
        ) {

            const angle =
                angleDegrees *
                Math.PI /
                180;

            const centerlineRise =
                radius *
                Math.tan(angle / 2);

            return (
                offset /
                Math.tan(angle) +
                2 *
                centerlineRise
            );

        }

        let low = 0.1;
        let high = 89.9;

        if (
            overallLength >
                calculatedLength(low) ||
            overallLength <
                calculatedLength(high)
        ) {

            return NaN;

        }

        for (
            let index = 0;
            index < 100;
            index += 1
        ) {

            const middle =
                (low + high) / 2;

            if (
                calculatedLength(middle) >
                overallLength
            ) {

                low = middle;

            } else {

                high = middle;

            }

        }

        return (low + high) / 2;

    }

    function calculateFromInputs() {

        const offset =
            Math.max(
                0.01,
                getValue(ids.offset, 46.25)
            );

        const overallLength =
            Math.max(
                0.01,
                getValue(ids.overall, 69)
            );

        const ductWidth =
            Math.max(
                0.01,
                getValue(ids.width, 60)
            );

        const ductDepth =
            Math.max(
                0.01,
                getValue(ids.depth, 24)
            );

        /*
         * Shop convention:
         * Width always controls the cheek profile.
         * Depth always controls the isometric extrusion.
         */
        const bendDimension =
            ductWidth;

        const elbowDepth =
            ductDepth;

        const clrElement =
            document.getElementById(
                ids.clrMultiplier
            );

        const clrMode =
            clrElement
                ? clrElement.value
                : "auto";

        let centerlineRadius;

        if (clrMode === "custom") {

            centerlineRadius =
                Math.max(
                    0.01,
                    getValue(
                        ids.customClr,
                        bendDimension
                    )
                );

        } else if (clrMode === "auto") {

            centerlineRadius =
                (
                    offset * offset +
                    overallLength *
                    overallLength
                ) /
                (4 * offset);

        } else {

            centerlineRadius =
                bendDimension *
                Number(clrMode);

        }

        const modeElement =
            document.getElementById(
                ids.mode
            );

        const mode =
            modeElement
                ? modeElement.value
                : "solveAngle";

        let elbowAngle;

        if (mode === "knownAngle") {

            elbowAngle =
                Math.max(
                    0.1,
                    Math.min(
                        89.9,
                        getValue(
                            ids.angle,
                            45
                        )
                    )
                );

        } else if (clrMode === "auto") {

            elbowAngle =
                2 *
                Math.atan(
                    offset /
                    overallLength
                ) *
                180 /
                Math.PI;

        } else {

            elbowAngle =
                solveOffsetAngle(
                    offset,
                    overallLength,
                    centerlineRadius
                );

        }

        if (!Number.isFinite(elbowAngle)) {

            elbowAngle = 45;

        }

        const radians =
            elbowAngle *
            Math.PI /
            180;

        const centerlineRise =
            centerlineRadius *
            Math.tan(radians / 2);

        const centerlineTravel =
            offset /
            Math.sin(radians);

        const totalStraight =
            Math.max(
                0,
                centerlineTravel -
                2 *
                centerlineRise
            );

        const straightPerElbow =
            totalStraight / 2;

        return {
            offset,
            overallLength,
            ductWidth,
            ductDepth,
            bendDimension,
            elbowDepth,
            centerlineRadius,
            throatRadius:
                centerlineRadius -
                bendDimension / 2,
            heelRadius:
                centerlineRadius +
                bendDimension / 2,
            elbowAngle,
            totalStraight,
            straightPerElbow,
            quantity: 2
        };

    }

    function getModel() {

        return {
            ...calculateFromInputs(),
            ...(latestCalculatedData || {})
        };

    }

    function pointOnArc(
        center,
        radius,
        angle
    ) {

        return {
            x:
                center.x +
                radius *
                Math.cos(angle),

            y:
                center.y +
                radius *
                Math.sin(angle)
        };

    }

    function buildElbowProfile(model) {

        const angle =
            model.elbowAngle *
            Math.PI /
            180;

        const centerRadius =
            model.centerlineRadius;

        const throatRadius =
            Math.max(
                0.05,
                model.throatRadius
            );

        const heelRadius =
            Math.max(
                throatRadius + 0.05,
                model.heelRadius
            );

        /*
         * Arc center is at the origin.
         * Incoming tangent is vertical.
         * Outgoing tangent turns clockwise by the elbow angle.
         */
        const startAngle = Math.PI;
        const endAngle =
            Math.PI - angle;

        const arcSteps = 120;

        function arc(radius) {

            const points = [];

            for (
                let index = 0;
                index <= arcSteps;
                index += 1
            ) {

                const progress =
                    index / arcSteps;

                const currentAngle =
                    startAngle -
                    angle * progress;

                points.push(
                    pointOnArc(
                        { x: 0, y: 0 },
                        radius,
                        currentAngle
                    )
                );

            }

            return points;

        }

        const throatArc =
            arc(throatRadius);

        const heelArc =
            arc(heelRadius);

        const centerArc =
            arc(centerRadius);

        const incomingDirection = {
            x: 0,
            y: 1
        };

        const outgoingDirection = {
            x: Math.sin(angle),
            y: Math.cos(angle)
        };

        /*
         * Show the calculated straight amount attached to this one elbow.
         * A small minimum lead keeps the inlet face readable even when
         * no added straight is required.
         */
        const minimumLead =
            Math.max(
                model.bendDimension * 0.18,
                3
            );

        const addedStraight =
            Math.max(
                0,
                model.straightPerElbow
            );

        const inletLead =
            minimumLead;

        const outletLead =
            minimumLead +
            addedStraight;

        const throatStart =
            throatArc[0];

        const heelStart =
            heelArc[0];

        const throatEnd =
            throatArc[
                throatArc.length - 1
            ];

        const heelEnd =
            heelArc[
                heelArc.length - 1
            ];

        const centerStart =
            centerArc[0];

        const centerEnd =
            centerArc[
                centerArc.length - 1
            ];

        const inletThroat = {
            x:
                throatStart.x -
                incomingDirection.x *
                inletLead,
            y:
                throatStart.y -
                incomingDirection.y *
                inletLead
        };

        const inletHeel = {
            x:
                heelStart.x -
                incomingDirection.x *
                inletLead,
            y:
                heelStart.y -
                incomingDirection.y *
                inletLead
        };

        const inletCenter = {
            x:
                centerStart.x -
                incomingDirection.x *
                inletLead,
            y:
                centerStart.y -
                incomingDirection.y *
                inletLead
        };

        const outletThroat = {
            x:
                throatEnd.x +
                outgoingDirection.x *
                outletLead,
            y:
                throatEnd.y +
                outgoingDirection.y *
                outletLead
        };

        const outletHeel = {
            x:
                heelEnd.x +
                outgoingDirection.x *
                outletLead,
            y:
                heelEnd.y +
                outgoingDirection.y *
                outletLead
        };

        const outletCenter = {
            x:
                centerEnd.x +
                outgoingDirection.x *
                outletLead,
            y:
                centerEnd.y +
                outgoingDirection.y *
                outletLead
        };

        return {
            nearThroat: [
                inletThroat,
                throatStart,
                ...throatArc.slice(1),
                outletThroat
            ],
            nearHeel: [
                inletHeel,
                heelStart,
                ...heelArc.slice(1),
                outletHeel
            ],
            centerline: [
                inletCenter,
                centerStart,
                ...centerArc.slice(1),
                outletCenter
            ],
            inlet: {
                throat: inletThroat,
                heel: inletHeel,
                center: inletCenter
            },
            outlet: {
                throat: outletThroat,
                heel: outletHeel,
                center: outletCenter
            },
            tangentStart: {
                throat: throatStart,
                heel: heelStart
            },
            tangentEnd: {
                throat: throatEnd,
                heel: heelEnd
            },
            outgoingDirection,
            inletLead,
            outletLead,
            addedStraight
        };

    }

    function path(points, close = false) {

        if (!points.length) {

            return "";

        }

        const result =
            points
                .map(
                    (point, index) =>
                        `${
                            index === 0
                                ? "M"
                                : "L"
                        } ${point.x} ${point.y}`
                )
                .join(" ");

        return close
            ? `${result} Z`
            : result;

    }

    function shift(
        points,
        vector
    ) {

        return points.map((point) => ({
            x: point.x + vector.x,
            y: point.y + vector.y
        }));

    }

    function bounds(points) {

        const xs =
            points.map(point => point.x);

        const ys =
            points.map(point => point.y);

        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };

    }

    function createTransform(
        points,
        area
    ) {

        const box =
            bounds(points);

        const sourceWidth =
            Math.max(
                1,
                box.maxX - box.minX
            );

        const sourceHeight =
            Math.max(
                1,
                box.maxY - box.minY
            );

        const scale =
            Math.min(
                area.width / sourceWidth,
                area.height / sourceHeight
            );

        const renderedWidth =
            sourceWidth * scale;

        const renderedHeight =
            sourceHeight * scale;

        const originX =
            area.x +
            (
                area.width -
                renderedWidth
            ) /
            2;

        const originY =
            area.y +
            (
                area.height -
                renderedHeight
            ) /
            2;

        return function (point) {

            return {
                x:
                    originX +
                    (
                        point.x -
                        box.minX
                    ) *
                    scale,

                y:
                    originY +
                    (
                        box.maxY -
                        point.y
                    ) *
                    scale
            };

        };

    }

    function transformPoints(
        points,
        transform
    ) {

        return points.map(transform);

    }

    function addDefinitions(drawing) {

        const defs =
            svg("defs");

        const arrow =
            svg("marker", {
                id: "singleElbowArrow",
                markerWidth: 8,
                markerHeight: 8,
                refX: 4,
                refY: 4,
                orient: "auto-start-reverse",
                markerUnits: "strokeWidth"
            });

        arrow.appendChild(
            svg("path", {
                d: "M 0 0 L 8 4 L 0 8",
                fill: "none",
                stroke: "#f4b942",
                "stroke-width": 1.4
            })
        );

        defs.appendChild(arrow);

        const gradient =
            svg("linearGradient", {
                id: "singleElbowDataGradient",
                x1: "0%",
                y1: "0%",
                x2: "100%",
                y2: "100%"
            });

        gradient.appendChild(
            svg("stop", {
                offset: "0%",
                "stop-color": "#17243a"
            })
        );

        gradient.appendChild(
            svg("stop", {
                offset: "100%",
                "stop-color": "#0d1728"
            })
        );

        defs.appendChild(gradient);
        drawing.appendChild(defs);

    }

    function addDimension(
        group,
        start,
        end,
        label,
        options = {}
    ) {

        group.appendChild(
            svg("line", {
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y,
                class:
                    "offset-iso-dimension-line",
                "marker-start":
                    "url(#singleElbowArrow)",
                "marker-end":
                    "url(#singleElbowArrow)"
            })
        );

        const middle = {
            x:
                (start.x + end.x) / 2,
            y:
                (start.y + end.y) / 2
        };

        const text =
            svg("text", {
                x:
                    middle.x +
                    (options.dx || 0),
                y:
                    middle.y +
                    (options.dy || 0),
                class:
                    "offset-iso-dimension-text",
                "text-anchor": "middle",
                "dominant-baseline":
                    "middle"
            }, label);

        if (options.rotate) {

            text.setAttribute(
                "transform",
                `rotate(${
                    options.rotate
                } ${
                    middle.x
                } ${
                    middle.y
                })`
            );

        }

        group.appendChild(text);

    }

    function addDataCard(
        group,
        x,
        y,
        width,
        label,
        value
    ) {

        group.appendChild(
            svg("rect", {
                x,
                y,
                width,
                height: 70,
                rx: 10,
                fill: "#111d31",
                stroke: "#2a3d5c",
                "stroke-width": 1.1
            })
        );

        group.appendChild(
            svg("text", {
                x: x + 14,
                y: y + 22,
                fill: "#8fa6c9",
                "font-size": 12,
                "font-weight": 650
            }, label.toUpperCase())
        );

        group.appendChild(
            svg("text", {
                x: x + 14,
                y: y + 50,
                fill: "#f4f7ff",
                "font-size": 18,
                "font-weight": 750
            }, value)
        );

    }

    function addDataPanel(
        drawing,
        model
    ) {

        const panel = {
            x: 790,
            y: 50,
            width: 400,
            height: 560
        };

        const group =
            svg("g");

        group.appendChild(
            svg("rect", {
                x: panel.x,
                y: panel.y,
                width: panel.width,
                height: panel.height,
                rx: 18,
                fill:
                    "url(#singleElbowDataGradient)",
                stroke: "#2a3d5c",
                "stroke-width": 1.4
            })
        );

        group.appendChild(
            svg("text", {
                x: panel.x + 24,
                y: panel.y + 36,
                fill: "#f4f7ff",
                "font-size": 21,
                "font-weight": 760
            }, "One-Elbow Fabrication Data")
        );

        group.appendChild(
            svg("text", {
                x: panel.x + 24,
                y: panel.y + 59,
                fill: "#8097ba",
                "font-size": 13
            }, "Two matching elbows are required for the offset.")
        );

        const values = [
            [
                "Duct Size",
                `${
                    formatMeasurement(
                        model.ductWidth
                    )
                } × ${
                    formatMeasurement(
                        model.ductDepth
                    )
                }`
            ],
            [
                "Width (Cheek)",
                formatMeasurement(
                    model.ductWidth
                )
            ],
            [
                "Elbow Angle",
                `${
                    formatDecimal(
                        model.elbowAngle
                    )
                }°`
            ],
            [
                "CLR",
                formatMeasurement(
                    model.centerlineRadius
                )
            ],
            [
                "Throat Radius",
                formatMeasurement(
                    model.throatRadius
                )
            ],
            [
                "Quantity",
                "2 elbows"
            ],
            [
                "Straight / Elbow",
                formatMeasurement(
                    model.straightPerElbow
                )
            ],
            [
                "Depth",
                formatMeasurement(
                    model.ductDepth
                )
            ]
        ];

        const padding = 24;
        const gap = 12;

        const cardWidth =
            (
                panel.width -
                padding * 2 -
                gap
            ) / 2;

        values.forEach(
            (entry, index) => {

                const column =
                    index % 2;

                const row =
                    Math.floor(
                        index / 2
                    );

                addDataCard(
                    group,
                    panel.x +
                        padding +
                        column *
                        (
                            cardWidth +
                            gap
                        ),
                    panel.y +
                        86 +
                        row *
                        82,
                    cardWidth,
                    entry[0],
                    entry[1]
                );

            }
        );

        const noteY =
            panel.y +
            panel.height -
            82;

        group.appendChild(
            svg("line", {
                x1: panel.x + 24,
                y1: noteY,
                x2:
                    panel.x +
                    panel.width -
                    24,
                y2: noteY,
                stroke: "#2a3d5c",
                "stroke-width": 1
            })
        );

        group.appendChild(
            svg("text", {
                x: panel.x + 24,
                y: noteY + 28,
                fill: "#8fa6c9",
                "font-size": 13
            }, model.straightPerElbow > 0.01
                ? `Add ${
                    formatMeasurement(
                        model.straightPerElbow
                    )
                } of straight to each elbow.`
                : "No added straight is required."
            )
        );

        group.appendChild(
            svg("text", {
                x: panel.x + 24,
                y: noteY + 52,
                fill: "#8fa6c9",
                "font-size": 13
            }, `Use two matching elbows for this offset.`)
        );

        drawing.appendChild(group);

    }

    function render() {

        const container =
            document.getElementById(
                ids.container
            );

        if (!container) {

            return;

        }

        const model =
            getModel();

        const profile =
            buildElbowProfile(model);

        /*
         * The isometric extrusion is proportional to the real
         * non-bending duct dimension.
         */
        const depthVector = {
            x:
                Math.max(
                    3,
                    model.elbowDepth
                ) * 0.62,
            y:
                Math.max(
                    3,
                    model.elbowDepth
                ) * 0.34
        };

        const farThroat =
            shift(
                profile.nearThroat,
                depthVector
            );

        const farHeel =
            shift(
                profile.nearHeel,
                depthVector
            );

        const farCenter =
            shift(
                profile.centerline,
                depthVector
            );

        const allPoints = [
            ...profile.nearThroat,
            ...profile.nearHeel,
            ...farThroat,
            ...farHeel
        ];

        const viewWidth = 1240;
        const viewHeight = 660;

        const drawingArea = {
            x: 65,
            y: 55,
            width: 655,
            height: 520
        };

        const transform =
            createTransform(
                allPoints,
                drawingArea
            );

        const nearThroat =
            transformPoints(
                profile.nearThroat,
                transform
            );

        const nearHeel =
            transformPoints(
                profile.nearHeel,
                transform
            );

        const center =
            transformPoints(
                profile.centerline,
                transform
            );

        const farThroatT =
            transformPoints(
                farThroat,
                transform
            );

        const farHeelT =
            transformPoints(
                farHeel,
                transform
            );

        const farCenterT =
            transformPoints(
                farCenter,
                transform
            );

        container.replaceChildren();

        const drawing =
            svg("svg", {
                class: "offset-iso-svg",
                viewBox:
                    `0 0 ${
                        viewWidth
                    } ${
                        viewHeight
                    }`,
                preserveAspectRatio:
                    "xMidYMid meet",
                role: "img",
                "aria-label":
                    "Isometric rectangular radius elbow fabrication preview"
            });

        addDefinitions(drawing);

        /*
         * Far side face.
         */
        drawing.appendChild(
            svg("path", {
                d: path([
                    ...farHeelT,
                    ...farThroatT
                        .slice()
                        .reverse()
                ], true),
                class:
                    "offset-iso-back-panel"
            })
        );

        /*
         * Heel surface.
         */
        drawing.appendChild(
            svg("path", {
                d: path([
                    ...nearHeel,
                    ...farHeelT
                        .slice()
                        .reverse()
                ], true),
                class:
                    "offset-iso-top-panel"
            })
        );

        /*
         * Throat surface.
         */
        drawing.appendChild(
            svg("path", {
                d: path([
                    ...nearThroat,
                    ...farThroatT
                        .slice()
                        .reverse()
                ], true),
                class:
                    "offset-iso-bottom-panel"
            })
        );

        /*
         * Near cheek/side profile.
         */
        drawing.appendChild(
            svg("path", {
                d: path([
                    ...nearHeel,
                    ...nearThroat
                        .slice()
                        .reverse()
                ], true),
                class:
                    "offset-iso-side-panel"
            })
        );

        const last =
            nearHeel.length - 1;

        /*
         * Inlet and outlet faces.
         */
        drawing.appendChild(
            svg("polygon", {
                points: [
                    nearHeel[0],
                    farHeelT[0],
                    farThroatT[0],
                    nearThroat[0]
                ]
                    .map(
                        point =>
                            `${point.x},${point.y}`
                    )
                    .join(" "),
                class:
                    "offset-iso-end-face"
            })
        );

        drawing.appendChild(
            svg("polygon", {
                points: [
                    nearHeel[last],
                    farHeelT[last],
                    farThroatT[last],
                    nearThroat[last]
                ]
                    .map(
                        point =>
                            `${point.x},${point.y}`
                    )
                    .join(" "),
                class:
                    "offset-iso-end-face"
            })
        );

        /*
         * Centerlines on near and far cheek.
         */
        drawing.appendChild(
            svg("path", {
                d: path(center),
                class:
                    "offset-iso-center-line"
            })
        );

        drawing.appendChild(
            svg("path", {
                d: path(farCenterT),
                class:
                    "offset-iso-center-line offset-iso-center-line-back"
            })
        );

        /*
         * Tangent/seam lines where the radius begins and ends.
         */
        const tangentStartIndex = 1;
        const tangentEndIndex =
            nearHeel.length - 2;

        [
            tangentStartIndex,
            tangentEndIndex
        ].forEach(index => {

            drawing.appendChild(
                svg("line", {
                    x1: nearHeel[index].x,
                    y1: nearHeel[index].y,
                    x2: nearThroat[index].x,
                    y2: nearThroat[index].y,
                    class:
                        "offset-iso-joint-line"
                })
            );

            drawing.appendChild(
                svg("line", {
                    x1: farHeelT[index].x,
                    y1: farHeelT[index].y,
                    x2: farThroatT[index].x,
                    y2: farThroatT[index].y,
                    class:
                        "offset-iso-joint-line offset-iso-joint-back"
                })
            );

        });

        /*
         * Dimensions.
         */
        const dimensionGroup =
            svg("g");

        /*
         * Width (cheek), depth, CLR, and throat radius are shown
         * in the data panel. Keeping them off the fitting prevents
         * overlapping annotations on smaller screens.
         */

        if (model.straightPerElbow > 0.01) {

            const straightStart =
                transform(
                    profile.tangentEnd.heel
                );

            const straightEnd =
                nearHeel[last];

            const lineOffset = {
                x: 38,
                y: -38
            };

            const dimensionStart = {
                x:
                    straightStart.x +
                    lineOffset.x,
                y:
                    straightStart.y +
                    lineOffset.y
            };

            const dimensionEnd = {
                x:
                    straightEnd.x +
                    lineOffset.x,
                y:
                    straightEnd.y +
                    lineOffset.y
            };

            const straightLabelAngle =
                Math.atan2(
                    dimensionEnd.y -
                    dimensionStart.y,
                    dimensionEnd.x -
                    dimensionStart.x
                ) *
                180 /
                Math.PI;

            addDimension(
                dimensionGroup,
                dimensionStart,
                dimensionEnd,
                `Straight / Elbow: ${
                    formatMeasurement(
                        model.straightPerElbow
                    )
                }`,
                {
                    dy: -15,
                    rotate:
                        straightLabelAngle
                }
            );

        }

        drawing.appendChild(
            dimensionGroup
        );

        drawing.appendChild(
            svg("text", {
                x: 92,
                y: 36,
                class:
                    "offset-iso-size-text"
            }, `${formatDecimal(
                model.elbowAngle
            )}° RADIUS ELBOW`)
        );

        drawing.appendChild(
            svg("text", {
                x: 92,
                y: 620,
                class:
                    "offset-iso-title-text"
            }, `Duct: ${
                formatMeasurement(
                    model.ductWidth
                )
            } × ${
                formatMeasurement(
                    model.ductDepth
                )
            }  •  CLR: ${
                formatMeasurement(
                    model.centerlineRadius
                )
            }`)
        );

        addDataPanel(
            drawing,
            model
        );

        container.appendChild(
            drawing
        );

    }

    function bind() {

        const watchedIds = [
            ids.mode,
            ids.offset,
            ids.overall,
            ids.width,
            ids.depth,
            ids.clrMultiplier,
            ids.customClr,
            ids.angle
        ];

        watchedIds.forEach(id => {

            const element =
                document.getElementById(id);

            if (!element) {

                return;

            }

            element.addEventListener(
                "input",
                render
            );

            element.addEventListener(
                "change",
                render
            );

        });

        document.addEventListener(
            "ductculator:offset-calculated",
            event => {

                latestCalculatedData =
                    event.detail;

                render();

            }
        );

        window.OffsetIso = {
            render,
            bindInputs: bind
        };

        render();

    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            bind
        );

    } else {

        bind();

    }

})();