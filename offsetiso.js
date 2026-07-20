/* =========================================================
   LIVE ISOMETRIC RECTANGULAR DUCT OFFSET
   File: offsetiso.js
   ========================================================= */

(function () {
    "use strict";

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    const DEFAULT_OPTIONS = {
        containerId: "offsetIsoContainer",

        width: 24,
        height: 12,
        rise: 18,
        run: 36,

        showDimensions: true,
        showCenterline: true,
        showSizeLabels: true
    };

    let currentOptions = {
        ...DEFAULT_OPTIONS
    };

    function createSvgElement(tagName, attributes = {}) {
        const element = document.createElementNS(
            SVG_NAMESPACE,
            tagName
        );

        Object.entries(attributes).forEach(
            ([attributeName, attributeValue]) => {
                element.setAttribute(
                    attributeName,
                    String(attributeValue)
                );
            }
        );

        return element;
    }

    function appendSvgElement(
        parent,
        tagName,
        attributes = {}
    ) {
        const element = createSvgElement(
            tagName,
            attributes
        );

        parent.appendChild(element);

        return element;
    }

    function formatNumber(value) {
        if (!Number.isFinite(value)) {
            return "0";
        }

        if (Math.abs(value - Math.round(value)) < 0.001) {
            return String(Math.round(value));
        }

        return value
            .toFixed(2)
            .replace(/\.?0+$/, "");
    }

    function pointList(points) {
        return points
            .map((point) => {
                return `${point.x},${point.y}`;
            })
            .join(" ");
    }

    function shiftedPoint(point, xAmount, yAmount) {
        return {
            x: point.x + xAmount,
            y: point.y + yAmount
        };
    }

    function midpoint(pointA, pointB) {
        return {
            x: (pointA.x + pointB.x) / 2,
            y: (pointA.y + pointB.y) / 2
        };
    }

    function clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(
                container.firstChild
            );
        }
    }

    function createArrowMarkers(definitions) {
        const startMarker = appendSvgElement(
            definitions,
            "marker",
            {
                id: "offsetIsoArrowStart",
                markerWidth: 10,
                markerHeight: 10,
                refX: 5,
                refY: 5,
                orient: "auto",
                markerUnits: "strokeWidth"
            }
        );

        appendSvgElement(
            startMarker,
            "path",
            {
                d: "M 9 1 L 1 5 L 9 9",
                fill: "none",
                stroke: "#f4b942",
                "stroke-width": 1.5,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            }
        );

        const endMarker = appendSvgElement(
            definitions,
            "marker",
            {
                id: "offsetIsoArrowEnd",
                markerWidth: 10,
                markerHeight: 10,
                refX: 5,
                refY: 5,
                orient: "auto",
                markerUnits: "strokeWidth"
            }
        );

        appendSvgElement(
            endMarker,
            "path",
            {
                d: "M 1 1 L 9 5 L 1 9",
                fill: "none",
                stroke: "#f4b942",
                "stroke-width": 1.5,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            }
        );
    }

    function createLine(
        parent,
        pointA,
        pointB,
        className,
        arrows = false
    ) {
        const attributes = {
            x1: pointA.x,
            y1: pointA.y,
            x2: pointB.x,
            y2: pointB.y,
            class: className
        };

        if (arrows) {
            attributes["marker-start"] =
                "url(#offsetIsoArrowStart)";

            attributes["marker-end"] =
                "url(#offsetIsoArrowEnd)";
        }

        return appendSvgElement(
            parent,
            "line",
            attributes
        );
    }

    function createPolygon(
        parent,
        points,
        className
    ) {
        return appendSvgElement(
            parent,
            "polygon",
            {
                points: pointList(points),
                class: className
            }
        );
    }

    function createText(
        parent,
        position,
        value,
        className,
        rotation = null
    ) {
        const attributes = {
            x: position.x,
            y: position.y,
            class: className
        };

        if (rotation !== null) {
            attributes.transform =
                `rotate(${rotation} ${position.x} ${position.y})`;
        }

        const textElement = appendSvgElement(
            parent,
            "text",
            attributes
        );

        textElement.textContent = value;

        return textElement;
    }

    function normalizeOptions(options) {
        const mergedOptions = {
            ...currentOptions,
            ...options
        };

        mergedOptions.width =
            Number(mergedOptions.width);

        mergedOptions.height =
            Number(mergedOptions.height);

        mergedOptions.rise =
            Number(mergedOptions.rise);

        mergedOptions.run =
            Number(mergedOptions.run);

        return mergedOptions;
    }

    function validateOptions(options) {
        if (!Number.isFinite(options.width)) {
            return "Duct width must be a number.";
        }

        if (!Number.isFinite(options.height)) {
            return "Duct height must be a number.";
        }

        if (!Number.isFinite(options.rise)) {
            return "Offset rise must be a number.";
        }

        if (!Number.isFinite(options.run)) {
            return "Offset run must be a number.";
        }

        if (options.width <= 0) {
            return "Duct width must be greater than zero.";
        }

        if (options.height <= 0) {
            return "Duct height must be greater than zero.";
        }

        if (options.rise < 0) {
            return "Offset rise cannot be negative.";
        }

        if (options.run <= 0) {
            return "Offset run must be greater than zero.";
        }

        return null;
    }

    function showError(container, message) {
        clearContainer(container);

        const errorElement =
            document.createElement("div");

        errorElement.className =
            "offset-iso-error is-visible";

        errorElement.textContent = message;

        container.appendChild(errorElement);
    }

    function calculateDrawingGeometry(options) {
        const viewBoxWidth = 900;
        const viewBoxHeight = 560;

        const leftMargin = 110;
        const rightMargin = 180;
        const topMargin = 95;
        const bottomMargin = 130;

        const availableWidth =
            viewBoxWidth -
            leftMargin -
            rightMargin;

        const availableHeight =
            viewBoxHeight -
            topMargin -
            bottomMargin;

        const modelWidth =
            options.run +
            options.width;

        const modelHeight =
            options.rise +
            options.height;

        const calculatedScale = Math.min(
            availableWidth / modelWidth,
            availableHeight / modelHeight,
            9
        );

        const scale = Math.max(
            calculatedScale,
            1.25
        );

        const drawnWidth = Math.max(
            options.width * scale,
            52
        );

        const drawnHeight = Math.max(
            options.height * scale,
            36
        );

        const drawnRun = Math.max(
            options.run * scale,
            125
        );

        const drawnRise =
            options.rise * scale;

        const depthAmount = Math.max(
            24,
            Math.min(
                drawnWidth * 0.28,
                54
            )
        );

        const depthX = depthAmount;
        const depthY = -depthAmount * 0.62;

        const startX = leftMargin;
        const startBottomY =
            viewBoxHeight -
            bottomMargin;

        const outletX =
            startX +
            drawnRun;

        const outletBottomY =
            startBottomY -
            drawnRise;

        return {
            viewBoxWidth,
            viewBoxHeight,

            drawnWidth,
            drawnHeight,
            drawnRun,
            drawnRise,

            depthX,
            depthY,

            startX,
            startBottomY,

            outletX,
            outletBottomY
        };
    }

    function calculatePoints(geometry) {
        const inletFrontTopLeft = {
            x: geometry.startX,
            y:
                geometry.startBottomY -
                geometry.drawnHeight
        };

        const inletFrontTopRight = {
            x:
                geometry.startX +
                geometry.drawnWidth,
            y:
                geometry.startBottomY -
                geometry.drawnHeight
        };

        const inletFrontBottomRight = {
            x:
                geometry.startX +
                geometry.drawnWidth,
            y: geometry.startBottomY
        };

        const inletFrontBottomLeft = {
            x: geometry.startX,
            y: geometry.startBottomY
        };

        const outletFrontTopLeft = {
            x: geometry.outletX,
            y:
                geometry.outletBottomY -
                geometry.drawnHeight
        };

        const outletFrontTopRight = {
            x:
                geometry.outletX +
                geometry.drawnWidth,
            y:
                geometry.outletBottomY -
                geometry.drawnHeight
        };

        const outletFrontBottomRight = {
            x:
                geometry.outletX +
                geometry.drawnWidth,
            y: geometry.outletBottomY
        };

        const outletFrontBottomLeft = {
            x: geometry.outletX,
            y: geometry.outletBottomY
        };

        const inletBackTopLeft = shiftedPoint(
            inletFrontTopLeft,
            geometry.depthX,
            geometry.depthY
        );

        const inletBackTopRight = shiftedPoint(
            inletFrontTopRight,
            geometry.depthX,
            geometry.depthY
        );

        const inletBackBottomRight = shiftedPoint(
            inletFrontBottomRight,
            geometry.depthX,
            geometry.depthY
        );

        const inletBackBottomLeft = shiftedPoint(
            inletFrontBottomLeft,
            geometry.depthX,
            geometry.depthY
        );

        const outletBackTopLeft = shiftedPoint(
            outletFrontTopLeft,
            geometry.depthX,
            geometry.depthY
        );

        const outletBackTopRight = shiftedPoint(
            outletFrontTopRight,
            geometry.depthX,
            geometry.depthY
        );

        const outletBackBottomRight = shiftedPoint(
            outletFrontBottomRight,
            geometry.depthX,
            geometry.depthY
        );

        const outletBackBottomLeft = shiftedPoint(
            outletFrontBottomLeft,
            geometry.depthX,
            geometry.depthY
        );

        const inletCenter = {
            x:
                geometry.startX +
                geometry.drawnWidth / 2 +
                geometry.depthX / 2,

            y:
                geometry.startBottomY -
                geometry.drawnHeight / 2 +
                geometry.depthY / 2
        };

        const outletCenter = {
            x:
                geometry.outletX +
                geometry.drawnWidth / 2 +
                geometry.depthX / 2,

            y:
                geometry.outletBottomY -
                geometry.drawnHeight / 2 +
                geometry.depthY / 2
        };

        return {
            inletFrontTopLeft,
            inletFrontTopRight,
            inletFrontBottomRight,
            inletFrontBottomLeft,

            outletFrontTopLeft,
            outletFrontTopRight,
            outletFrontBottomRight,
            outletFrontBottomLeft,

            inletBackTopLeft,
            inletBackTopRight,
            inletBackBottomRight,
            inletBackBottomLeft,

            outletBackTopLeft,
            outletBackTopRight,
            outletBackBottomRight,
            outletBackBottomLeft,

            inletCenter,
            outletCenter
        };
    }

    function drawDuctPanels(group, points) {
        /*
         * Far side panel
         */
        createPolygon(
            group,
            [
                points.inletBackTopRight,
                points.inletBackBottomRight,
                points.outletBackBottomRight,
                points.outletBackTopRight
            ],
            "offset-iso-side-panel"
        );

        /*
         * Bottom panel
         */
        createPolygon(
            group,
            [
                points.inletFrontBottomLeft,
                points.inletBackBottomLeft,
                points.outletBackBottomLeft,
                points.outletFrontBottomLeft
            ],
            "offset-iso-bottom-panel"
        );

        /*
         * Top panel
         */
        createPolygon(
            group,
            [
                points.inletFrontTopLeft,
                points.inletBackTopLeft,
                points.outletBackTopLeft,
                points.outletFrontTopLeft
            ],
            "offset-iso-top-panel"
        );

        /*
         * Near side panel
         */
        createPolygon(
            group,
            [
                points.inletFrontTopLeft,
                points.inletFrontBottomLeft,
                points.outletFrontBottomLeft,
                points.outletFrontTopLeft
            ],
            "offset-iso-side-panel"
        );

        /*
         * Inlet end face
         */
        createPolygon(
            group,
            [
                points.inletFrontTopLeft,
                points.inletFrontTopRight,
                points.inletFrontBottomRight,
                points.inletFrontBottomLeft
            ],
            "offset-iso-end-face"
        );

        /*
         * Inlet top depth face
         */
        createPolygon(
            group,
            [
                points.inletFrontTopLeft,
                points.inletFrontTopRight,
                points.inletBackTopRight,
                points.inletBackTopLeft
            ],
            "offset-iso-top-panel"
        );

        /*
         * Inlet side depth face
         */
        createPolygon(
            group,
            [
                points.inletFrontTopRight,
                points.inletFrontBottomRight,
                points.inletBackBottomRight,
                points.inletBackTopRight
            ],
            "offset-iso-side-panel"
        );

        /*
         * Outlet end face
         */
        createPolygon(
            group,
            [
                points.outletFrontTopLeft,
                points.outletFrontTopRight,
                points.outletFrontBottomRight,
                points.outletFrontBottomLeft
            ],
            "offset-iso-end-face"
        );

        /*
         * Outlet top depth face
         */
        createPolygon(
            group,
            [
                points.outletFrontTopLeft,
                points.outletFrontTopRight,
                points.outletBackTopRight,
                points.outletBackTopLeft
            ],
            "offset-iso-top-panel"
        );

        /*
         * Outlet side depth face
         */
        createPolygon(
            group,
            [
                points.outletFrontTopRight,
                points.outletFrontBottomRight,
                points.outletBackBottomRight,
                points.outletBackTopRight
            ],
            "offset-iso-side-panel"
        );
    }

    function drawHiddenLines(group, points) {
        createLine(
            group,
            points.inletBackTopLeft,
            points.inletBackTopRight,
            "offset-iso-hidden-line"
        );

        createLine(
            group,
            points.inletBackTopRight,
            points.outletBackTopRight,
            "offset-iso-hidden-line"
        );

        createLine(
            group,
            points.outletBackTopLeft,
            points.outletBackTopRight,
            "offset-iso-hidden-line"
        );
    }

    function drawCenterline(group, points) {
        createLine(
            group,
            points.inletCenter,
            points.outletCenter,
            "offset-iso-center-line"
        );
    }

    function drawRunDimension(
        group,
        points,
        geometry,
        options
    ) {
        const dimensionY =
            geometry.viewBoxHeight -
            60;

        const startPoint = {
            x: points.inletCenter.x,
            y: dimensionY
        };

        const endPoint = {
            x: points.outletCenter.x,
            y: dimensionY
        };

        createLine(
            group,
            {
                x: points.inletCenter.x,
                y: points.inletCenter.y + 12
            },
            {
                x: points.inletCenter.x,
                y: dimensionY + 12
            },
            "offset-iso-extension-line"
        );

        createLine(
            group,
            {
                x: points.outletCenter.x,
                y: points.outletCenter.y + 12
            },
            {
                x: points.outletCenter.x,
                y: dimensionY + 12
            },
            "offset-iso-extension-line"
        );

        createLine(
            group,
            startPoint,
            endPoint,
            "offset-iso-dimension-line",
            true
        );

        createText(
            group,
            {
                x:
                    (
                        startPoint.x +
                        endPoint.x
                    ) / 2,

                y: dimensionY - 18
            },
            `Run: ${formatNumber(options.run)}"`,
            "offset-iso-dimension-text"
        );
    }

    function drawRiseDimension(
        group,
        points,
        geometry,
        options
    ) {
        const dimensionX =
            Math.min(
                geometry.viewBoxWidth - 60,
                points.outletFrontTopRight.x +
                    geometry.depthX +
                    85
            );

        const lowerPoint = {
            x: dimensionX,
            y: points.inletCenter.y
        };

        const upperPoint = {
            x: dimensionX,
            y: points.outletCenter.y
        };

        createLine(
            group,
            points.inletCenter,
            {
                x: dimensionX + 12,
                y: points.inletCenter.y
            },
            "offset-iso-extension-line"
        );

        createLine(
            group,
            points.outletCenter,
            {
                x: dimensionX + 12,
                y: points.outletCenter.y
            },
            "offset-iso-extension-line"
        );

        createLine(
            group,
            lowerPoint,
            upperPoint,
            "offset-iso-dimension-line",
            true
        );

        const riseTextPosition = {
            x: dimensionX + 28,
            y:
                (
                    lowerPoint.y +
                    upperPoint.y
                ) / 2
        };

        createText(
            group,
            riseTextPosition,
            `Offset: ${formatNumber(options.rise)}"`,
            "offset-iso-dimension-text",
            -90
        );
    }

    function drawLengthDimension(
        group,
        points,
        options
    ) {
        const trueLength = Math.sqrt(
            Math.pow(options.run, 2) +
            Math.pow(options.rise, 2)
        );

        const vectorX =
            points.outletCenter.x -
            points.inletCenter.x;

        const vectorY =
            points.outletCenter.y -
            points.inletCenter.y;

        const vectorLength = Math.sqrt(
            vectorX * vectorX +
            vectorY * vectorY
        );

        if (vectorLength === 0) {
            return;
        }

        const perpendicularX =
            -vectorY / vectorLength;

        const perpendicularY =
            vectorX / vectorLength;

        const spacing = 48;

        const dimensionStart = {
            x:
                points.inletCenter.x +
                perpendicularX * spacing,

            y:
                points.inletCenter.y +
                perpendicularY * spacing
        };

        const dimensionEnd = {
            x:
                points.outletCenter.x +
                perpendicularX * spacing,

            y:
                points.outletCenter.y +
                perpendicularY * spacing
        };

        createLine(
            group,
            points.inletCenter,
            {
                x:
                    dimensionStart.x +
                    perpendicularX * 10,

                y:
                    dimensionStart.y +
                    perpendicularY * 10
            },
            "offset-iso-extension-line"
        );

        createLine(
            group,
            points.outletCenter,
            {
                x:
                    dimensionEnd.x +
                    perpendicularX * 10,

                y:
                    dimensionEnd.y +
                    perpendicularY * 10
            },
            "offset-iso-extension-line"
        );

        createLine(
            group,
            dimensionStart,
            dimensionEnd,
            "offset-iso-dimension-line",
            true
        );

        const textPosition = midpoint(
            dimensionStart,
            dimensionEnd
        );

        const lineAngle =
            Math.atan2(
                vectorY,
                vectorX
            ) *
            180 /
            Math.PI;

        createText(
            group,
            {
                x:
                    textPosition.x +
                    perpendicularX * 18,

                y:
                    textPosition.y +
                    perpendicularY * 18
            },
            `Length: ${formatNumber(trueLength)}"`,
            "offset-iso-dimension-text",
            lineAngle
        );
    }

    function drawSizeLabels(
        group,
        points,
        geometry,
        options
    ) {
        const sizeText =
            `${formatNumber(options.width)}" × ` +
            `${formatNumber(options.height)}"`;

        createText(
            group,
            {
                x:
                    geometry.startX +
                    geometry.drawnWidth / 2,

                y:
                    geometry.startBottomY +
                    40
            },
            sizeText,
            "offset-iso-size-text"
        );

        createText(
            group,
            {
                x:
                    geometry.outletX +
                    geometry.drawnWidth / 2,

                y:
                    geometry.outletBottomY +
                    40
            },
            sizeText,
            "offset-iso-size-text"
        );

        createText(
            group,
            {
                x:
                    geometry.startX +
                    geometry.drawnWidth / 2,

                y:
                    geometry.startBottomY +
                    62
            },
            "INLET",
            "offset-iso-title-text"
        );

        createText(
            group,
            {
                x:
                    geometry.outletX +
                    geometry.drawnWidth / 2,

                y:
                    geometry.outletBottomY +
                    62
            },
            "OUTLET",
            "offset-iso-title-text"
        );
    }

    function render(options = {}) {
        const normalizedOptions =
            normalizeOptions(options);

        const container =
            document.getElementById(
                normalizedOptions.containerId
            );

        if (!container) {
            console.warn(
                `OffsetIso: Could not find container #${normalizedOptions.containerId}`
            );

            return;
        }

        const validationError =
            validateOptions(normalizedOptions);

        if (validationError) {
            showError(
                container,
                validationError
            );

            return;
        }

        currentOptions = {
            ...normalizedOptions
        };

        clearContainer(container);

        const geometry =
            calculateDrawingGeometry(
                normalizedOptions
            );

        const points =
            calculatePoints(geometry);

        const svg = createSvgElement(
            "svg",
            {
                class: "offset-iso-svg",

                viewBox:
                    `0 0 ` +
                    `${geometry.viewBoxWidth} ` +
                    `${geometry.viewBoxHeight}`,

                preserveAspectRatio:
                    "xMidYMid meet",

                role: "img",

                "aria-label":
                    "Live isometric rectangular duct offset drawing"
            }
        );

        const title =
            createSvgElement("title");

        title.textContent =
            `${formatNumber(normalizedOptions.width)} by ` +
            `${formatNumber(normalizedOptions.height)} inch duct, ` +
            `${formatNumber(normalizedOptions.rise)} inch offset, ` +
            `${formatNumber(normalizedOptions.run)} inch run.`;

        svg.appendChild(title);

        const definitions =
            appendSvgElement(
                svg,
                "defs"
            );

        createArrowMarkers(definitions);

        const hiddenLineGroup =
            appendSvgElement(
                svg,
                "g",
                {
                    id: "offsetIsoHiddenLines"
                }
            );

        const ductGroup =
            appendSvgElement(
                svg,
                "g",
                {
                    id: "offsetIsoDuct"
                }
            );

        const centerlineGroup =
            appendSvgElement(
                svg,
                "g",
                {
                    id: "offsetIsoCenterline"
                }
            );

        const dimensionGroup =
            appendSvgElement(
                svg,
                "g",
                {
                    id: "offsetIsoDimensions"
                }
            );

        const labelGroup =
            appendSvgElement(
                svg,
                "g",
                {
                    id: "offsetIsoLabels"
                }
            );

        drawHiddenLines(
            hiddenLineGroup,
            points
        );

        drawDuctPanels(
            ductGroup,
            points
        );

        if (normalizedOptions.showCenterline) {
            drawCenterline(
                centerlineGroup,
                points
            );
        }

        if (normalizedOptions.showDimensions) {
            drawRunDimension(
                dimensionGroup,
                points,
                geometry,
                normalizedOptions
            );

            if (normalizedOptions.rise > 0) {
                drawRiseDimension(
                    dimensionGroup,
                    points,
                    geometry,
                    normalizedOptions
                );
            }

            drawLengthDimension(
                dimensionGroup,
                points,
                normalizedOptions
            );
        }

        if (normalizedOptions.showSizeLabels) {
            drawSizeLabels(
                labelGroup,
                points,
                geometry,
                normalizedOptions
            );
        }

        container.appendChild(svg);
    }

    function getNumericInputValue(
        elementId,
        fallbackValue
    ) {
        const element =
            document.getElementById(elementId);

        if (!element) {
            return fallbackValue;
        }

        const parsedValue =
            Number(element.value);

        if (!Number.isFinite(parsedValue)) {
            return fallbackValue;
        }

        return parsedValue;
    }

    function bindInputs(config = {}) {
        const inputConfiguration = {
            widthInputId:
                config.widthInputId ||
                "offsetDuctWidth",

            heightInputId:
                config.heightInputId ||
                "offsetDuctHeight",

            riseInputId:
                config.riseInputId ||
                "offsetRise",

            runInputId:
                config.runInputId ||
                "offsetRun",

            containerId:
                config.containerId ||
                currentOptions.containerId
        };

        const inputIds = [
            inputConfiguration.widthInputId,
            inputConfiguration.heightInputId,
            inputConfiguration.riseInputId,
            inputConfiguration.runInputId
        ];

        function updateFromInputs() {
            render({
                containerId:
                    inputConfiguration.containerId,

                width:
                    getNumericInputValue(
                        inputConfiguration.widthInputId,
                        currentOptions.width
                    ),

                height:
                    getNumericInputValue(
                        inputConfiguration.heightInputId,
                        currentOptions.height
                    ),

                rise:
                    getNumericInputValue(
                        inputConfiguration.riseInputId,
                        currentOptions.rise
                    ),

                run:
                    getNumericInputValue(
                        inputConfiguration.runInputId,
                        currentOptions.run
                    )
            });
        }

        inputIds.forEach((inputId) => {
            const inputElement =
                document.getElementById(inputId);

            if (!inputElement) {
                console.warn(
                    `OffsetIso: Could not find input #${inputId}`
                );

                return;
            }

            inputElement.addEventListener(
                "input",
                updateFromInputs
            );

            inputElement.addEventListener(
                "change",
                updateFromInputs
            );
        });

        updateFromInputs();

        return updateFromInputs;
    }

    window.OffsetIso = {
        render,
        bindInputs
    };
})();