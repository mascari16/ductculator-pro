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
    let activeOffsetError = window.__ductculatorOffsetError || null;


    function ensureClrWarningStyles() {

        if (
            document.getElementById(
                "offsetIsoClrWarningStyles"
            )
        ) {

            return;

        }

        const style =
            document.createElement("style");

        style.id =
            "offsetIsoClrWarningStyles";

        style.textContent = `
            #offsetIsoContainer{
                position:relative;
            }

            .offset-iso-clr-warning{
                position:absolute;
                top:5px;
                right:14px;
                z-index:10;

                display:inline-flex;
                align-items:center;
                gap:8px;

                max-width:240px;
                padding:9px 12px;

                border:1px solid #ff6b6b;
                border-radius:999px;

                background:
                    rgba(125, 14, 14, .97);

                color:#fff;
                font-size:12px;
                line-height:1.2;
                font-weight:700;
                letter-spacing:.02em;

                cursor:help;

                box-shadow:
                    0 0 8px rgba(255, 70, 70, .40),
                    0 0 18px rgba(255, 45, 45, .18);

                animation:
                    offsetIsoClrWarningPulse
                    1.4s
                    ease-in-out
                    infinite;
            }

            .offset-iso-clr-warning-icon{
                flex:0 0 auto;
                font-size:15px;
                line-height:1;
            }

            .offset-iso-clr-warning-value{
                color:#ffb0b0;
                white-space:nowrap;
            }

            .offset-iso-clr-warning-tooltip strong{
                display:block;
                margin-bottom:5px;
                color:#ffb0b0;
                font-size:12px;
                letter-spacing:.04em;
            }

            .offset-iso-clr-warning-tooltip{
                position:absolute;
                top:calc(100% + 9px);
                right:0;

                width:285px;
                padding:12px 14px;

                border:1px solid #ff5a5a;
                border-radius:9px;

                background:
                    rgba(45, 7, 7, .98);

                color:#fff;
                font-size:12px;
                line-height:1.45;
                font-weight:500;
                letter-spacing:0;

                opacity:0;
                visibility:hidden;
                transform:translateY(-4px);
                transition:
                    opacity .16s ease,
                    transform .16s ease,
                    visibility .16s ease;

                pointer-events:none;
            }

            .offset-iso-clr-warning:hover
            .offset-iso-clr-warning-tooltip,
            .offset-iso-clr-warning:focus
            .offset-iso-clr-warning-tooltip{
                opacity:1;
                visibility:visible;
                transform:translateY(0);
            }

            @keyframes offsetIsoClrWarningPulse{

                0%,
                100%{
                    border-color:#ff6b6b;
                    background:
                        rgba(125, 14, 14, .97);
                    box-shadow:
                        0 0 8px rgba(255, 70, 70, .40),
                        0 0 18px rgba(255, 45, 45, .18);
                    filter:brightness(1);
                }

                50%{
                    border-color:#ffd0d0;
                    background:
                        rgba(170, 22, 22, .99);
                    box-shadow:
                        0 0 18px rgba(255, 90, 90, .95),
                        0 0 38px rgba(255, 45, 45, .62);
                    filter:brightness(1.18);
                }

            }


            @media (max-width:700px){

                .offset-iso-svg-mobile{
                    display:block;
                    width:100%;
                    max-width:none;
                    height:auto;
                    margin:0;
                    border:0;
                    border-radius:0;
                    background:transparent;
                }

                .offset-iso-clr-warning{
                    top:10px;
                    right:10px;
                    left:auto;
                    max-width:210px;
                    padding:8px 11px;
                    font-size:11px;
                }

            }

            @media (
                prefers-reduced-motion:
                reduce
            ){

                .offset-iso-clr-warning{
                    animation:none;
                }

            }
        `;

        document.head.appendChild(
            style
        );

    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }

    function addOffsetProblemOverlay(
        container,
        problem
    ) {

        if (!problem) {
            return;
        }

        container.classList.add(
            "has-offset-error"
        );

        const overlay =
            document.createElement("div");

        overlay.className =
            "offset-iso-problem-overlay";

        overlay.setAttribute(
            "role",
            "alert"
        );

        const steps = Array.isArray(problem.steps)
            ? problem.steps
            : [];

        overlay.innerHTML = `
            <div class="offset-iso-problem-heading">
                <span class="offset-iso-problem-icon" aria-hidden="true">!</span>
                <h4 class="offset-iso-problem-title">
                    ${escapeHtml(problem.title || "Geometry needs adjustment")}
                </h4>
            </div>

            <p class="offset-iso-problem-message">
                ${escapeHtml(problem.message || "The entered geometry cannot produce a valid offset.")}
            </p>

            ${steps.length ? `
                <p class="offset-iso-problem-label">What to change</p>
                <ol class="offset-iso-problem-steps">
                    ${steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}
                </ol>
            ` : ""}
        `;

        container.appendChild(overlay);

    }

    function addClrWarning(
        container,
        model
    ) {

        const equivalentClr =
            model.centerlineRadius /
            model.ductWidth;

        if (
            !Number.isFinite(
                equivalentClr
            ) ||
            equivalentClr >= 0.75
        ) {

            return;

        }

        ensureClrWarningStyles();

        const warning =
            document.createElement("div");

        warning.className =
            "offset-iso-clr-warning";

        warning.setAttribute(
            "tabindex",
            "0"
        );

        warning.setAttribute(
            "role",
            "status"
        );

        warning.innerHTML = `
            <span
                class="
                    offset-iso-clr-warning-icon
                "
                aria-hidden="true"
            >
                ⚠
            </span>

            <span>
                LOW CLR
            </span>

            <span
                class="
                    offset-iso-clr-warning-value
                "
            >
                ${equivalentClr.toFixed(2)}×
            </span>

            <span
                class="
                    offset-iso-clr-warning-tooltip
                "
            >
                <strong>
                    LOW EQUIVALENT CLR
                </strong>

                Equivalent CLR is
                ${equivalentClr.toFixed(2)}× CLR,
                which is below the recommended
                0.75× minimum. The throat radius
                may become extremely small,
                making the elbow difficult or
                impractical to fabricate.
                Consider increasing the
                centerline radius.
            </span>
        `;

        container.appendChild(
            warning
        );

    }

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

        /*
         * Match the main calculator's exact offset solution.
         * Substituting t = tan(angle / 2) into:
         *
         * L = O / tan(angle) + 2R tan(angle / 2)
         *
         * gives:
         * (4R - O)t² - 2Lt + O = 0
         */
        const coefficientA =
            4 * radius - offset;

        const coefficientB =
            -2 * overallLength;

        const coefficientC =
            offset;

        const candidates = [];

        if (Math.abs(coefficientA) < 0.000001) {
            const t =
                -coefficientC /
                coefficientB;

            if (t > 0) {
                candidates.push(t);
            }
        } else {
            const discriminant =
                Math.pow(coefficientB, 2) -
                4 * coefficientA * coefficientC;

            if (discriminant < -0.000001) {
                return NaN;
            }

            const squareRoot =
                Math.sqrt(
                    Math.max(0, discriminant)
                );

            const firstT =
                (-coefficientB + squareRoot) /
                (2 * coefficientA);

            const secondT =
                (-coefficientB - squareRoot) /
                (2 * coefficientA);

            if (firstT > 0) {
                candidates.push(firstT);
            }

            if (
                secondT > 0 &&
                Math.abs(secondT - firstT) > 0.000001
            ) {
                candidates.push(secondT);
            }
        }

        const validAngles =
            candidates
                .map(t =>
                    2 *
                    Math.atan(t) *
                    180 /
                    Math.PI
                )
                .filter(angle => {
                    if (
                        angle <= 0 ||
                        angle >= 90
                    ) {
                        return false;
                    }

                    const radians =
                        angle * Math.PI / 180;

                    const straight =
                        offset / Math.sin(radians) -
                        2 * radius *
                        Math.tan(radians / 2);

                    return straight >= -0.001;
                });

        return validAngles.length
            ? Math.max(...validAngles)
            : NaN;

    }

    const AUTO_CLR_MULTIPLIERS = [
        1.00,
        0.95,
        0.90,
        0.85,
        0.80,
        0.75,
        0.70,
        0.65,
        0.60
    ];

    function selectPreviewAutoClr(
        offset,
        overallLength,
        bendDimension,
        mode,
        knownAngle
    ) {
        for (const multiplier of AUTO_CLR_MULTIPLIERS) {
            const radius = bendDimension * multiplier;
            let angle = knownAngle;

            if (mode === "solveAngle") {
                angle = solveOffsetAngle(
                    offset,
                    overallLength,
                    radius
                );
            }

            if (!Number.isFinite(angle)) {
                continue;
            }

            const radians = angle * Math.PI / 180;
            const straight =
                offset / Math.sin(radians) -
                2 * radius * Math.tan(radians / 2);

            if (straight >= -0.001) {
                return { radius, angle, multiplier };
            }
        }

        return null;
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

        const modeElement =
            document.getElementById(
                ids.mode
            );

        const mode =
            modeElement
                ? modeElement.value
                : "solveAngle";

        let elbowAngle =
            mode === "knownAngle"
                ? Math.max(
                    0.1,
                    Math.min(
                        89.9,
                        getValue(
                            ids.angle,
                            45
                        )
                    )
                )
                : NaN;

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
            const autoSelection =
                selectPreviewAutoClr(
                    offset,
                    overallLength,
                    bendDimension,
                    mode,
                    elbowAngle
                );

            if (autoSelection) {
                centerlineRadius =
                    autoSelection.radius;
                elbowAngle =
                    autoSelection.angle;
            } else {
                centerlineRadius =
                    bendDimension * 0.60;

                if (mode === "solveAngle") {
                    elbowAngle =
                        solveOffsetAngle(
                            offset,
                            overallLength,
                            centerlineRadius
                        );
                }
            }
        } else {
            centerlineRadius =
                bendDimension *
                Number(clrMode);
        }

        if (
            mode === "solveAngle" &&
            clrMode !== "auto"
        ) {
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

        /*
         * Use a small visual-only minimum radius when the calculated
         * throat radius is zero or extremely small. This prevents the
         * SVG throat from looking like a sharp square corner while the
         * fabrication data continues to show the true calculated radius.
         */
        const minimumVisualThroatRadius =
            Math.min(
                4,
                Math.max(
                    0.75,
                    model.bendDimension * 0.03
                )
            );

        const throatRadius =
            Math.max(
                minimumVisualThroatRadius,
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

        /*
         * Compact open arrowheads.
         * The marker reference point is placed at the arrow tip so the
         * arrow ends exactly on the dimension line instead of extending
         * beyond it.
         */
        const arrow =
            svg("marker", {
                id: "singleElbowArrow",
                markerWidth: 6,
                markerHeight: 6,
                refX: 5,
                refY: 2.5,
                orient: "auto-start-reverse",
                markerUnits: "strokeWidth",
                viewBox: "0 0 5 5",
                overflow: "visible"
            });

        arrow.appendChild(
            svg("path", {
                d: "M 0 0 L 5 2.5 L 0 5",
                fill: "none",
                stroke: "#f4b942",
                "stroke-width": 1.35,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
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
        value,
        metrics = {}
    ) {

        const cardHeight =
            metrics.cardHeight || 70;

        const labelSize =
            metrics.labelSize || 12;

        const valueSize =
            metrics.valueSize || 18;

        const horizontalPadding =
            metrics.horizontalPadding || 14;

        const labelY =
            y +
            (metrics.labelOffsetY || 22);

        const valueY =
            y +
            (metrics.valueOffsetY || 50);

        group.appendChild(
            svg("rect", {
                x,
                y,
                width,
                height: cardHeight,
                rx: metrics.cardRadius || 10,
                fill: "#111d31",
                stroke: "#2a3d5c",
                "stroke-width": 1.1
            })
        );

        group.appendChild(
            svg("text", {
                x: x + horizontalPadding,
                y: labelY,
                fill: "#8fa6c9",
                "font-size": labelSize,
                "font-weight": 700
            }, label.toUpperCase())
        );

        group.appendChild(
            svg("text", {
                x: x + horizontalPadding,
                y: valueY,
                fill: "#f4f7ff",
                "font-size": valueSize,
                "font-weight": 780
            }, value)
        );

    }

    function addDataPanel(
        drawing,
        model,
        panelLayout = null
    ) {

        const panel = panelLayout || {
            x: 1250,
            y: 35,
            width: 420,
            height: 590,
            mobile: false
        };

        const isMobilePanel =
            panel.mobile === true;

        const metrics = isMobilePanel
            ? {
                padding: 20,
                gap: 12,
                titleSize: 25,
                titleOffsetY: 39,
                subtitleSize: 14,
                subtitleOffsetY: 66,
                cardsStartY: 94,
                cardHeight: 82,
                rowStep: 94,
                cardRadius: 11,
                labelSize: 13.5,
                valueSize: 21,
                horizontalPadding: 14,
                labelOffsetY: 25,
                valueOffsetY: 58,
                quantityGap: 13,
                quantityHeight: 56,
                quantityLabelSize: 13.5,
                quantityValueSize: 20,
                noteGap: 15,
                noteSize: 14
            }
            : {
                padding: 24,
                gap: 12,
                titleSize: 23,
                titleOffsetY: 38,
                subtitleSize: 14,
                subtitleOffsetY: 63,
                cardsStartY: 91,
                cardHeight: 76,
                rowStep: 88,
                cardRadius: 10,
                labelSize: 13,
                valueSize: 20,
                horizontalPadding: 14,
                labelOffsetY: 24,
                valueOffsetY: 54,
                quantityGap: 13,
                quantityHeight: 54,
                quantityLabelSize: 13,
                quantityValueSize: 20,
                noteGap: 15,
                noteSize: 14
            };

        const group =
            svg("g");

        group.appendChild(
            svg("rect", {
                x: panel.x,
                y: panel.y,
                width: panel.width,
                height: panel.height,
                rx: isMobilePanel ? 20 : 18,
                fill:
                    "url(#singleElbowDataGradient)",
                stroke: "#2a3d5c",
                "stroke-width": 1.5
            })
        );

        group.appendChild(
            svg("text", {
                x:
                    panel.x +
                    metrics.padding,
                y:
                    panel.y +
                    metrics.titleOffsetY,
                fill: "#f4f7ff",
                "font-size":
                    metrics.titleSize,
                "font-weight": 780
            }, "One-Elbow Fabrication Data")
        );

        group.appendChild(
            svg("text", {
                x:
                    panel.x +
                    metrics.padding,
                y:
                    panel.y +
                    metrics.subtitleOffsetY,
                fill: "#8097ba",
                "font-size":
                    metrics.subtitleSize,
                "font-weight": 520
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
                "Equivalent CLR",
                `${(
                    model.centerlineRadius /
                    model.ductWidth
                ).toFixed(2)}× CLR`
            ],
            [
                "Throat Radius",
                formatMeasurement(
                    model.throatRadius
                )
            ],
            [
                "CLR",
                formatMeasurement(
                    model.centerlineRadius
                )
            ],
            [
                "Straight",
                formatMeasurement(
                    model.straightPerElbow
                )
            ],
            [
                "Offset",
                formatMeasurement(
                    model.offset
                )
            ]
        ];

        const cardWidth =
            (
                panel.width -
                metrics.padding * 2 -
                metrics.gap
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
                        metrics.padding +
                        column *
                        (
                            cardWidth +
                            metrics.gap
                        ),
                    panel.y +
                        metrics.cardsStartY +
                        row *
                        metrics.rowStep,
                    cardWidth,
                    entry[0],
                    entry[1],
                    metrics
                );

            }
        );

        const cardsBottom =
            panel.y +
            metrics.cardsStartY +
            3 * metrics.rowStep +
            metrics.cardHeight;

        const quantityY =
            cardsBottom +
            metrics.quantityGap;

        group.appendChild(
            svg("rect", {
                x:
                    panel.x +
                    metrics.padding,
                y: quantityY,
                width:
                    panel.width -
                    metrics.padding * 2,
                height:
                    metrics.quantityHeight,
                rx: 10,
                fill: "#111d31",
                stroke: "#2a3d5c",
                "stroke-width": 1.1
            })
        );

        group.appendChild(
            svg("text", {
                x:
                    panel.x +
                    metrics.padding +
                    14,
                y:
                    quantityY +
                    22,
                fill: "#8fa6c9",
                "font-size":
                    metrics.quantityLabelSize,
                "font-weight": 700
            }, "QUANTITY")
        );

        group.appendChild(
            svg("text", {
                x:
                    panel.x +
                    panel.width -
                    metrics.padding -
                    14,
                y:
                    quantityY +
                    36,
                fill: "#f4f7ff",
                "font-size":
                    metrics.quantityValueSize,
                "font-weight": 780,
                "text-anchor": "end"
            }, "2 Elbows")
        );

        const noteY =
            quantityY +
            metrics.quantityHeight +
            metrics.noteGap;

        group.appendChild(
            svg("line", {
                x1:
                    panel.x +
                    metrics.padding,
                y1: noteY,
                x2:
                    panel.x +
                    panel.width -
                    metrics.padding,
                y2: noteY,
                stroke: "#2a3d5c",
                "stroke-width": 1
            })
        );

        group.appendChild(
            svg("text", {
                x:
                    panel.x +
                    metrics.padding,
                y: noteY + 31,
                fill: "#9aadd0",
                "font-size":
                    metrics.noteSize,
                "font-weight": 520
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
                x:
                    panel.x +
                    metrics.padding,
                y: noteY + 57,
                fill: "#9aadd0",
                "font-size":
                    metrics.noteSize,
                "font-weight": 520
            }, "Use two matching elbows for this offset.")
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

        container.innerHTML = "";
        container.classList.remove(
            "has-offset-error"
        );

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

        /*
         * Use a stacked layout on phones so the elbow and
         * fabrication data remain large enough to read.
         */
        /*
         * Detect the actual browser viewport instead of the
         * SVG container. The container can briefly report a
         * small or zero width while the desktop page is
         * rendering, which incorrectly triggered mobile mode.
         */
        const isMobile =
            window.matchMedia(
                "(max-width: 700px)"
            ).matches;

        const viewWidth =
            isMobile ? 500 : 1680;

        const viewHeight =
            isMobile ? 1310 : 660;

        const drawingArea =
            isMobile
                ? {
                    x: 8,
                    y: 35,
                    width: 484,
                    height: 570
                }
                : {
                    x: 45,
                    y: 20,
                    width: 900,
                    height: 550
                };

        const dataPanelLayout =
            isMobile
                ? {
                    x: 4,
                    y: 635,
                    width: 492,
                    height: 640,
                    mobile: true
                }
                : {
                    x: 1250,
                    y: 35,
                    width: 420,
                    height: 590,
                    mobile: false
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
                class:
                    isMobile
                        ? "offset-iso-svg offset-iso-svg-mobile"
                        : "offset-iso-svg",
                width: "100%",
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
                    "offset-iso-back-panel",
                stroke: "none"
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
            "offset-iso-top-panel",
        fill: "#31518a",
        stroke: "none"
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
            "offset-iso-bottom-panel",
        fill: "#274474",
        stroke: "none"
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
                    "offset-iso-side-panel",
                stroke: "none"
            })
        );

        /*
         * Explicit visible linework only.
         * These two near-side edges are the edges actually facing the viewer.
         */
        drawing.appendChild(
            svg("path", {
                d: path(nearHeel),
                fill: "none",
                stroke: "#78a7ff",
                "stroke-width": 2,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            })
        );

        drawing.appendChild(
            svg("path", {
                d: path(nearThroat),
                fill: "none",
                stroke: "#78a7ff",
                "stroke-width": 2,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            })
        );

        /*
         * Hidden far-side edges.
         * Draw only the middle curved portions as dashed lines. The ends are
         * omitted because the inlet and outlet faces already define them.
         */
        const hiddenStart = 12;
        const hiddenEnd =
            Math.max(
                hiddenStart + 2,
                farHeelT.length - 12
            );

        drawing.appendChild(
            svg("path", {
                d: path(
                    farHeelT.slice(
                        hiddenStart,
                        hiddenEnd
                    )
                ),
                fill: "none",
                stroke: "#9fb0ca",
                "stroke-width": 1.15,
                "stroke-dasharray": "5 8",
                "stroke-linecap": "round",
                opacity: 0.34
            })
        );

        drawing.appendChild(
            svg("path", {
                d: path(
                    farThroatT.slice(
                        hiddenStart,
                        hiddenEnd
                    )
                ),
                fill: "none",
                stroke: "#9fb0ca",
                "stroke-width": 1.15,
                "stroke-dasharray": "5 8",
                "stroke-linecap": "round",
                opacity: 0.34
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
         * Subtle near centerline only.
         */
        drawing.appendChild(
            svg("path", {
                d: path(center),
                fill:"none",
                stroke:"#9fb7dc",
                "stroke-width":1.0,
                "stroke-dasharray":"10 5 2 5",
                opacity:0.24
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

            /*
             * Offset the dimension line perpendicular to the straight.
             * Both ends are projected directly from the tangent seam and
             * the outlet edge, so the dimension terminates at the end face
             * instead of drifting past it as the elbow angle changes.
             */
            const straightDx =
                straightEnd.x -
                straightStart.x;

            const straightDy =
                straightEnd.y -
                straightStart.y;

            const straightLength =
                Math.hypot(
                    straightDx,
                    straightDy
                ) || 1;

            const normal = {
                x:
                    -straightDy /
                    straightLength,
                y:
                    straightDx /
                    straightLength
            };

            /*
             * Keep the annotation on the outside/left side of the elbow.
             */
            const preferredNormal =
                normal.x <= 0
                    ? normal
                    : {
                        x: -normal.x,
                        y: -normal.y
                    };

            const dimensionOffset = 34;

            const dimensionStart = {
                x:
                    straightStart.x +
                    preferredNormal.x *
                    dimensionOffset,
                y:
                    straightStart.y +
                    preferredNormal.y *
                    dimensionOffset
            };

            const dimensionEnd = {
                x:
                    straightEnd.x +
                    preferredNormal.x *
                    dimensionOffset,
                y:
                    straightEnd.y +
                    preferredNormal.y *
                    dimensionOffset
            };

            /*
             * Extension lines tie the dimension exactly to the tangent seam
             * and the final outlet edge.
             */
            dimensionGroup.appendChild(
                svg("line", {
                    x1: straightStart.x,
                    y1: straightStart.y,
                    x2: dimensionStart.x,
                    y2: dimensionStart.y,
                    class:
                        "offset-iso-extension-line"
                })
            );

            dimensionGroup.appendChild(
                svg("line", {
                    x1: straightEnd.x,
                    y1: straightEnd.y,
                    x2: dimensionEnd.x,
                    y2: dimensionEnd.y,
                    class:
                        "offset-iso-extension-line"
                })
            );

            const straightLabelAngle =
                Math.atan2(
                    straightDy,
                    straightDx
                ) *
                180 /
                Math.PI;

            addDimension(
                dimensionGroup,
                dimensionStart,
                dimensionEnd,
                `Straight: ${
                    formatMeasurement(
                        model.straightPerElbow
                    )
                }`,
                {
                    dy: -14,
                    rotate:
                        straightLabelAngle
                }
            );

        }


        /*
         * WIDTH (CHEEK)
         * Dimensioned directly under the near inlet cheek.
         * It always spans the visible cheek width and stays centered.
         */
        const widthLeft =
            nearThroat[0];

        const widthRight =
            nearHeel[0];

        const widthDimensionY =
            Math.max(
                widthLeft.y,
                widthRight.y
            ) + 34;

        const widthStart = {
            x: widthLeft.x,
            y: widthDimensionY
        };

        const widthEnd = {
            x: widthRight.x,
            y: widthDimensionY
        };

        dimensionGroup.appendChild(
            svg("line", {
                x1: widthLeft.x,
                y1: widthLeft.y,
                x2: widthStart.x,
                y2: widthStart.y,
                class:
                    "offset-iso-extension-line"
            })
        );

        dimensionGroup.appendChild(
            svg("line", {
                x1: widthRight.x,
                y1: widthRight.y,
                x2: widthEnd.x,
                y2: widthEnd.y,
                class:
                    "offset-iso-extension-line"
            })
        );

        addDimension(
            dimensionGroup,
            widthStart,
            widthEnd,
            `Width: ${
                formatMeasurement(
                    model.ductWidth
                )
            }`,
            {
                dy: 18
            }
        );

        /*
         * DEPTH
         * Dimensioned along the isometric extrusion under the throat.
         * It always starts at the near throat corner and ends at the
         * matching far throat corner.
         */
        const depthNear =
            nearThroat[0];

        const depthFar =
            farThroatT[0];

        const depthDx =
            depthFar.x -
            depthNear.x;

        const depthDy =
            depthFar.y -
            depthNear.y;

        const depthLength =
            Math.hypot(
                depthDx,
                depthDy
            ) || 1;

        const depthNormal = {
            x:
                -depthDy /
                depthLength,
            y:
                depthDx /
                depthLength
        };

        /*
         * Put the depth annotation below the throat.
         */
        const chosenDepthNormal =
            depthNormal.y >= 0
                ? depthNormal
                : {
                    x: -depthNormal.x,
                    y: -depthNormal.y
                };

        const depthOffset = 38;

        const depthStart = {
            x:
                depthNear.x +
                chosenDepthNormal.x *
                depthOffset,
            y:
                depthNear.y +
                chosenDepthNormal.y *
                depthOffset
        };

        const depthEnd = {
            x:
                depthFar.x +
                chosenDepthNormal.x *
                depthOffset,
            y:
                depthFar.y +
                chosenDepthNormal.y *
                depthOffset
        };

        dimensionGroup.appendChild(
            svg("line", {
                x1: depthNear.x,
                y1: depthNear.y,
                x2: depthStart.x,
                y2: depthStart.y,
                class:
                    "offset-iso-extension-line"
            })
        );

        dimensionGroup.appendChild(
            svg("line", {
                x1: depthFar.x,
                y1: depthFar.y,
                x2: depthEnd.x,
                y2: depthEnd.y,
                class:
                    "offset-iso-extension-line"
            })
        );

        const depthLabelAngle =
            Math.atan2(
                depthDy,
                depthDx
            ) *
            180 /
            Math.PI;

        addDimension(
            dimensionGroup,
            depthStart,
            depthEnd,
            `Depth: ${
                formatMeasurement(
                    model.ductDepth
                )
            }`,
            {
                dy: 17,
                rotate:
                    depthLabelAngle
            }
        );

        drawing.appendChild(
            dimensionGroup
        );



        addDataPanel(
            drawing,
            model,
            dataPanelLayout
        );

        container.appendChild(
            drawing
        );

        if (activeOffsetError) {
            addOffsetProblemOverlay(
                container,
                activeOffsetError
            );
        } else {
            addClrWarning(
                container,
                model
            );
        }

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

                activeOffsetError = null;
                window.__ductculatorOffsetError = null;

                render();

            }
        );

        document.addEventListener(
            "ductculator:offset-error",
            event => {

                activeOffsetError =
                    event.detail || null;

                window.__ductculatorOffsetError =
                    activeOffsetError;

                render();

            }
        );

        window.OffsetIso = {
            render,
            bindInputs: bind,
            showError(problem) {
                activeOffsetError = problem || null;
                window.__ductculatorOffsetError = activeOffsetError;
                render();
            }
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