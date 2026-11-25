// =====================================================
// DUCTWORK PRO
// layoutMath.js
// Shop layout math: right triangle, rolling offset, arc / rolled
// radius and swing radius.
// =====================================================

(function () {
    "use strict";

    const DC = window.DC;
    const SCREEN = "mathWorkspace";

    // Right triangle from any two of rise, run, diagonal and angle.
    function triangle(out) {
        const given = {
            rise: DC.meas("tmRise"),
            run: DC.meas("tmRun"),
            diag: DC.meas("tmDiag"),
            angle: DC.num("tmAngle")
        };

        const have = Object.keys(given).filter(key => Number.isFinite(given[key]) && given[key] > 0);

        if (have.length < 2) {
            return DC.renderProblem(out, "Enter any two values", "Fill in two of rise, run, diagonal or angle and leave the others blank.");
        }

        if (have.length > 2) {
            return DC.renderProblem(out, "Enter only two values", "Clear the extra field so the triangle has exactly two known values.");
        }

        let { rise, run, diag, angle } = given;
        const key = have.sort().join("+");

        if (given.angle && !(angle < 90)) {
            return DC.renderProblem(out, "Angle must be under 90°", "The angle is measured from the run, between 0° and 90°.");
        }

        const A = DC.rad(angle || 0);

        switch (key) {
            case "rise+run":
                diag = Math.hypot(rise, run);
                angle = DC.degOf(Math.atan(rise / run));
                break;
            case "diag+rise":
                if (diag <= rise) {
                    return DC.renderProblem(out, "Diagonal is too short", "The diagonal must be longer than the rise.");
                }
                run = Math.sqrt(diag * diag - rise * rise);
                angle = DC.degOf(Math.asin(rise / diag));
                break;
            case "diag+run":
                if (diag <= run) {
                    return DC.renderProblem(out, "Diagonal is too short", "The diagonal must be longer than the run.");
                }
                rise = Math.sqrt(diag * diag - run * run);
                angle = DC.degOf(Math.acos(run / diag));
                break;
            case "angle+rise":
                run = rise / Math.tan(A);
                diag = rise / Math.sin(A);
                break;
            case "angle+run":
                rise = run * Math.tan(A);
                diag = run / Math.cos(A);
                break;
            case "angle+diag":
                rise = diag * Math.sin(A);
                run = diag * Math.cos(A);
                break;
        }

        DC.renderRows(out, [
            { label: "Diagonal", value: DC.len(diag), main: !given.diag },
            { label: "Rise", value: DC.len(rise), main: !given.rise && !!given.diag },
            { label: "Run", value: DC.len(run) },
            { label: "Angle from run", value: DC.deg(angle) },
            { label: "Angle from rise", value: DC.deg(90 - angle) },
            { label: "Slope", value: `${DC.fmt(12 * rise / run)} per 12" · ${(100 * rise / run).toFixed(1)}%` }
        ]);
    }

    // Rolling offset: true offset, roll angle, travel and advance.
    function rolling(out) {
        const rise = DC.meas("roRise");
        const roll = DC.meas("roRoll");
        const angle = DC.num("roAngle");

        if (!(rise >= 0) || !(roll >= 0) || rise + roll <= 0) {
            return DC.renderProblem(out, "Enter the rise and roll", "Rise is the vertical offset and roll is the sideways offset.");
        }

        if (!(angle > 0 && angle < 90)) {
            return DC.renderProblem(out, "Enter the fitting angle", "Use the elbow angle you will build, such as 45°.");
        }

        const T = Math.hypot(rise, roll);
        const a = DC.rad(angle);
        const rollFromVertical = rise > 0 ? DC.degOf(Math.atan(roll / rise)) : 90;

        DC.renderRows(out, [
            { label: "True offset", note: "√(rise² + roll²)", value: DC.len(T), main: true },
            { label: "Roll angle from vertical", value: DC.deg(rollFromVertical, 1) },
            { label: "Roll angle from horizontal", value: DC.deg(90 - rollFromVertical, 1) },
            { label: "Travel", note: "center to center at the fitting angle", value: DC.len(T / Math.sin(a)) },
            { label: "Advance along the run", value: DC.len(T / Math.tan(a)) },
            { text: "Center-to-center values with no elbow radius. Use Round Fittings or Elbow Offset to include the radius." }
        ]);
    }

    // Arc / rolled radius: arc length, chord and rise; heel/throat arcs.
    function arc(out) {
        const R = DC.meas("arR");
        let angle = DC.num("arAngle");
        const arcLength = DC.meas("arArc");
        const W = DC.meas("arW");

        if (!(R > 0)) {
            return DC.renderProblem(out, "Enter the radius", "Radius is measured to the centerline (or to the edge you are laying out).");
        }

        const fromArc = !(angle > 0) && arcLength > 0;

        if (fromArc) {
            angle = DC.degOf(arcLength / R);
        }

        if (!(angle > 0 && angle <= 360)) {
            return DC.renderProblem(out, "Enter the angle or the arc length", "Fill in one of them; the other is worked out.");
        }

        const t = DC.rad(angle);

        DC.renderRows(out, [
            { label: fromArc ? "Angle" : "Arc length", value: fromArc ? DC.deg(angle) : DC.len(R * t), main: true },
            !fromArc ? null : { label: "Arc length", value: DC.len(R * t) },
            { label: "Chord", value: DC.len(2 * R * Math.sin(t / 2)) },
            { label: "Rise (sagitta)", value: DC.len(R * (1 - Math.cos(t / 2))) },
            W > 0 && { head: `Cheek ${DC.fmt(W)} wide` },
            W > 0 && { label: "Heel arc", note: "radius + W/2", value: DC.len((R + W / 2) * t) },
            W > 0 && { label: "Throat arc", note: "radius − W/2", value: R - W / 2 >= 0 ? DC.len((R - W / 2) * t) : "—" }
        ]);
    }

    // Swing point radius for an S-offset made of two arcs, no straight.
    function swing(out) {
        const O = DC.meas("swO");
        const L = DC.meas("swL");

        if (!(O > 0) || !(L > 0)) {
            return DC.renderProblem(out, "Enter the offset and length", "Both must be greater than zero.");
        }

        if (O >= L) {
            return DC.renderProblem(out, "Offset is too large", "For two arcs under 90°, the offset must be smaller than the length.");
        }

        const R = (O * O + L * L) / (4 * O);
        const angle = 2 * DC.degOf(Math.atan(O / L));

        DC.renderRows(out, [
            { label: "Swing point radius", note: "(O² + L²) ÷ (4 × O)", value: DC.len(R), main: true },
            { label: "Arc angle (each)", value: DC.deg(angle) },
            { label: "Arc length (each, centerline)", value: DC.len(R * DC.rad(angle)) },
            { text: "Same geometry as Elbow Offset with Elbows only, no straight." }
        ]);
    }

    function compute() {
        const out = DC.get("mathResults");
        const tab = DC.val("mathTab") || "triangle";

        ({ triangle, rolling, arc, swing }[tab] || triangle)(out);
    }

    DC.tabs(SCREEN, compute);
    DC.live(SCREEN, compute);
})();
