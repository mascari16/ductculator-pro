/* =========================================================
   DUCTWORK PRO
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

            /*
             * Desktop: top-left corner, which is empty in both desktop
             * layouts. Top-right collided with the fabrication data panel.
             */
            .offset-iso-clr-warning{
                position:absolute;
                top:5px;
                left:14px;
                right:auto;
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
                left:0;
                right:auto;

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
                    /* The stacked layout is tall by design; the 620px
                       desktop cap was shrinking it to ~65% width. */
                    max-height:none;
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

                .offset-iso-clr-warning-tooltip{
                    left:auto;
                    right:0;
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

                Equivalent CLR: ${equivalentClr.toFixed(2)}×.
                This is below the app's 0.75×
                low-CLR warning threshold. The throat radius
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

        /*
         * Elbows only, no straight: the geometry fixes angle and radius.
         */
        const noStraightElement =
            document.getElementById("noStraightElbows");

        if (noStraightElement && noStraightElement.checked) {
            if (
                mode === "solveAngle" &&
                overallLength > offset
            ) {
                elbowAngle =
                    2 * Math.atan(offset / overallLength) *
                    180 / Math.PI;

                centerlineRadius =
                    overallLength /
                    (2 * Math.sin(elbowAngle * Math.PI / 180));
            } else if (mode === "knownAngle") {
                centerlineRadius =
                    offset /
                    (2 * (1 - Math.cos(elbowAngle * Math.PI / 180)));
            }
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
                stroke: "#f2c231",
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
                "stop-color": "#2a3035"
            })
        );

        gradient.appendChild(
            svg("stop", {
                offset: "100%",
                "stop-color": "#1d2125"
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

        // Solid dark tag behind the label, sized from the text.
        const fontSize =
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--offset-iso-label-size")) ||
            (window.matchMedia("(max-width: 700px)").matches ? 19 : 18);
        const tagWidth = String(label).length * fontSize * 0.6 + 12;
        const tagHeight = fontSize * 1.35;
        const tag =
            svg("rect", {
                x: middle.x + (options.dx || 0) - tagWidth / 2,
                y: middle.y + (options.dy || 0) - tagHeight / 2,
                width: tagWidth,
                height: tagHeight,
                rx: 5,
                class: "offset-iso-label-tag"
            });

        if (options.rotate) {

            const turn = `rotate(${
                options.rotate
            } ${
                middle.x
            } ${
                middle.y
            })`;

            text.setAttribute("transform", turn);
            tag.setAttribute("transform", turn);

        }

        group.appendChild(tag);
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
                fill: "#23282c",
                stroke: "#434c55",
                "stroke-width": 1.1
            })
        );

        group.appendChild(
            svg("text", {
                x: x + horizontalPadding,
                y: labelY,
                fill: "#a1aeb7",
                "font-size": labelSize,
                "font-weight": 700
            }, label.toUpperCase())
        );

        group.appendChild(
            svg("text", {
                x: x + horizontalPadding,
                y: valueY,
                fill: "#f8fafb",
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
            x: 1100,
            y: 20,
            width: 560,
            height: 620,
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
                padding: 26,
                gap: 14,
                titleSize: 28,
                titleOffsetY: 42,
                subtitleSize: 16,
                subtitleOffsetY: 70,
                cardsStartY: 101,
                cardHeight: 82,
                rowStep: 94,
                cardRadius: 11,
                labelSize: 14.5,
                valueSize: 23,
                horizontalPadding: 16,
                labelOffsetY: 26,
                valueOffsetY: 59,
                quantityGap: 14,
                quantityHeight: 60,
                quantityLabelSize: 14.5,
                quantityValueSize: 23,
                noteGap: 14,
                noteSize: 15
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
                stroke: "#434c55",
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
                fill: "#f8fafb",
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
                fill: "#909faa",
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
                ).toFixed(2)}×`
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
                fill: "#23282c",
                stroke: "#434c55",
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
                fill: "#a1aeb7",
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
                fill: "#f8fafb",
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
                stroke: "#434c55",
                "stroke-width": 1
            })
        );

        group.appendChild(
            svg("text", {
                x:
                    panel.x +
                    metrics.padding,
                y: noteY + 31,
                fill: "#abb7bf",
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
                fill: "#abb7bf",
                "font-size":
                    metrics.noteSize,
                "font-weight": 520
            }, "Use two matching elbows for this offset.")
        );

        drawing.appendChild(group);

    }

    /*
     * Choose the desktop layout from the preview container's real width.
     * A zero width (hidden workspace, first paint) falls back to the
     * full layout; the ResizeObserver re-renders once a width is known.
     */
    const OFFSET_ISO_COMPACT_BELOW = 1150;

    function getOffsetIsoLayoutMode(container) {

        if (
            window.matchMedia(
                "(max-width: 700px)"
            ).matches
        ) {
            return "mobile";
        }

        const width =
            container ? container.clientWidth : 0;

        return width > 0 && width < OFFSET_ISO_COMPACT_BELOW
            ? "compact"
            : "full";

    }

    let lastOffsetIsoLayoutMode = null;

    /*
     * The preview is the shared live 3D view (DC.Fit3D), the same as Round
     * and Rect Fittings: a rectangular duct with two radius elbows, the
     * straight between them, and drafting dimensions.
     */
    function offsetScene(model) {
        const W = model.ductWidth;
        const H = model.ductDepth;
        const O = model.offset;
        const R = model.centerlineRadius;
        const angle = model.elbowAngle;
        const S = Math.max(0, model.totalStraight || 0);
        const a = angle * Math.PI / 180;
        const L = O / Math.tan(a) + 2 * R * Math.tan(a / 2);
        // Two elbows, each carrying half the straight; they meet in the
        // middle (the only seam between the ends).
        const path = DC.Fit3D.Path(0, 0, 0).arc(R, angle, 28, false);
        if (S > 0.01) {
            path.line(S / 2, true);
            path.line(S / 2, false);
        } else {
            path.points[path.points.length - 1].joint = true;
        }
        path.arc(R, -angle, 28, false);
        path.points[path.points.length - 1].joint = true;

        const nrm = [-Math.sin(a), Math.cos(a)];
        const e1 = [R * Math.sin(a), R * (1 - Math.cos(a))];
        const e2 = [e1[0] + S * Math.cos(a), e1[1] + S * Math.sin(a)];
        const top = p => [p[0] + nrm[0] * W / 2, p[1] + nrm[1] * W / 2];
        const fmt = formatMeasurement;

        const dims = [
            { a: [0, -W / 2], b: [0, W / 2], dir: [-1, 0], base: W * 0.3, label: `${fmt(W)} cheek` },
            { a: [0, -W / 2], b: [L, -W / 2], dir: [0, -1], base: W * 0.4, ea: [0, -W / 2], eb: [L, O - W / 2], label: `Length ${fmt(L)}` },
            { a: [L, -W / 2], b: [L, O - W / 2], dir: [1, 0], base: W * 0.35, ea: [0, -W / 2], eb: [L, O - W / 2], label: `Offset ${fmt(O)}` }
        ];
        if (S > 0.05) {
            // straight on each elbow (close in), the total straight outside it
            const m = [e1[0] + (S / 2) * Math.cos(a), e1[1] + (S / 2) * Math.sin(a)];
            // one chain of two equal pieces, labeled once
            dims.push({ a: top(e1), b: top(e2), dir: nrm, base: W * 0.25, ea: top(e1), eb: top(e2), mid: [top(m)], label: `${fmt(S / 2)} each elbow` });
            dims.push({ a: top(e1), b: top(e2), dir: nrm, base: W * 0.25 + Math.max(W * 0.3, 12), ea: top(e1), eb: top(e2), label: `Straight ${fmt(S)}` });
        }
        // centerline radius of the first elbow, from its center to the centerline
        const midArc = [R * Math.sin(a / 2), R - R * Math.cos(a / 2)];
        dims.push({ a: [0, R], b: midArc, fixed: true, radius: true, label: `CLR ${fmt(R)}` });

        return {
            roll: 0,
            dimW: H / 2,
            parts: [{ kind: "rect", w: W, h: H, path: path.points }],
            dims,
            caption: [
                `Two ${angle.toFixed(2)}° elbows`,
                `CLR ${fmt(R)}`,
                `throat ${fmt(R - W / 2)}`,
                S > 0.05 ? `${fmt(S / 2)} straight on each elbow` : "no straight",
                `depth ${fmt(H)}`
            ].join(" · ")
        };
    }

    let viewBound = false;

    function render() {

        const container =
            document.getElementById(
                ids.container
            );

        if (!container || !window.DC || !DC.Fit3D) {

            return;

        }

        if (!viewBound) {
            DC.Fit3D.bindView("offsetView");
            viewBound = true;
        }

        // Drop the previous warning or problem card (the 3D view stays).
        container
            .querySelectorAll(".offset-iso-problem-overlay, .offset-iso-clr-warning")
            .forEach(node => node.remove());
        container.classList.remove("has-offset-error");

        if (activeOffsetError) {
            DC.Fit3D.clear("offsetView", "");
            addOffsetProblemOverlay(container, activeOffsetError);
            return;
        }

        const model = getModel();

        if (
            !(model.ductWidth > 0) ||
            !(model.offset > 0) ||
            !(model.centerlineRadius > 0) ||
            !Number.isFinite(model.elbowAngle)
        ) {
            DC.Fit3D.clear("offsetView", "Enter the offset dimensions to see the elbows.");
            return;
        }

        DC.Fit3D.render("offsetView", offsetScene(model));
        addClrWarning(container, model);

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

        /*
         * Re-render only when the container crosses a layout breakpoint
         * (sidebar collapse, window resize, workspace becoming visible).
         */
        const isoContainer =
            document.getElementById(ids.container);

        if (
            isoContainer &&
            typeof ResizeObserver === "function"
        ) {
            new ResizeObserver(() => {
                if (
                    getOffsetIsoLayoutMode(isoContainer) !==
                    lastOffsetIsoLayoutMode
                ) {
                    render();
                }
            }).observe(isoContainer);
        }

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