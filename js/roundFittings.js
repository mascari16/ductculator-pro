// =====================================================
// DUCTCULATOR PRO
// roundFittings.js
// Round duct: two-elbow offsets (incl. rolling), laterals and
// gored elbow layout.
// =====================================================

(function () {
    "use strict";

    const DC = window.DC;
    const SCREEN = "roundWorkspace";

    function syncFields() {
        const known = DC.val("rfMode") === "knownAngle";
        DC.show("rfLenGroup", !known);
        DC.show("rfAngleGroup", known);

        const perpendicular = DC.val("rlOrient") === "perpendicular";
        DC.show("rlOffsetGroup", !perpendicular);
        DC.show("rlRollGroup", !perpendicular);
        DC.show("rlAdvanceGroup", perpendicular);
    }

    /*
     * 3D scene for a lateral: main along the run, branch leaving the
     * main centerline at the lateral angle, one elbow, then a tail.
     * Shared with Rect Fittings through DC.lateralScene.
     */
    /*
     * Straight on each edge of the branch, measured from where that edge
     * meets the main surface (the tap) to where the elbow starts. The long
     * side is the heel (obtuse) side, the short side the toe. For a mitered
     * elbow each edge runs to its own miter point.
     */
    function lateralSides({ main, size, angle, r, smooth }) {
        const a = DC.rad(angle);
        const turn = r.orient === "parallel" ? -r.elbow : r.elbow;
        const lean = smooth ? 0 : (size / 2) * Math.tan(DC.rad(Math.abs(turn)) / 2);
        const sign = turn > 0 ? 1 : -1; // inside of the turn: +1 = heel side
        const tHeel = (main / 2 - Math.cos(a) * size / 2) / Math.sin(a);
        const tToe = (main / 2 + Math.cos(a) * size / 2) / Math.sin(a);
        const endHeel = r.straight - sign * lean;
        const endToe = r.straight + sign * lean;
        return { tHeel, tToe, endHeel, endToe, heel: endHeel - tHeel, toe: endToe - tToe };
    }

    DC.lateralSides = lateralSides;

    // Result rows for the straight: both edges from the tap, plus the centerline.
    function sideRows(main, size, angle, r, smooth) {
        const sd = lateralSides({ main, size, angle, r, smooth });
        const rows = [
            { label: "Straight, long side", note: "heel edge, from the main to the elbow", value: sd.heel > 0 ? DC.len(sd.heel) : "—" },
            { label: "Straight, short side", note: "toe edge, from the main to the elbow", value: sd.toe > 0 ? DC.len(sd.toe) : "—" },
            { label: "Straight on the centerline", note: smooth ? "from the main centerline" : "from the main centerline to the miter point", value: DC.len(r.straight) }
        ];
        if (sd.toe <= 0) {
            rows.push({ text: "The elbow starts before the short side clears the main. Increase the offset (or distance along the main), or use a smaller elbow." });
        }
        return rows;
    }

    DC.lateralSideRows = sideRows;

    function lateralScene({ kind, main, size, depth, angle, r, R, smooth, roll, label }) {
        const a = DC.rad(angle);
        const tail = size * 1.6;
        // Branch starts on the main surface; its first ring is cut to the main.
        const start = Math.min((main / 2) / Math.sin(a), Math.max(0, r.straight));
        const turn = r.orient === "parallel" ? -r.elbow : r.elbow;
        const path = DC.Fit3D.Path(start * Math.cos(a), start * Math.sin(a), angle).line(r.straight - start, true);

        if (smooth) {
            path.arc(R, turn, 24);
        } else {
            path.corner(turn);
        }

        path.line(tail, true);

        const end = path.points[path.points.length - 1];
        const elbowEnd = path.points[path.points.length - 2];
        const parallel = r.orient === "parallel";
        const mainLeft = -main * 1.4 - (size / 2) / Math.tan(a);
        const mainRight = parallel ? end.x : elbowEnd.x + size / 2 + main * 1.4;
        const mainPath = DC.Fit3D.Path(mainLeft, 0, 0).line(mainRight - mainLeft, true);
        const section = kind === "round" ? { d: main } : { w: main, h: depth };
        const branch = kind === "round" ? { d: size } : { w: size, h: depth };
        const nrm = [-Math.sin(a), Math.cos(a)];
        const elbowStart = [r.straight * Math.cos(a), r.straight * Math.sin(a)];
        // Vertex where the branch's lower edge meets the main surface.
        const tapVertex = [(main / 2) / Math.tan(a) + (size / 2) / Math.sin(a), main / 2];
        const unit = Math.max(main, size);

        const dims = [
            { a: [mainLeft, -main / 2], b: [mainLeft, main / 2], dir: [-1, 0], base: main * 0.3, label: label(main) },
            {
                type: "angle", c: tapVertex, a0: 0, a1: angle, r: size * 0.7,
                // slide up the branch's lower edge, but not past the elbow
                slide: [Math.cos(a), Math.sin(a)],
                slideMax: Math.max(0, Math.hypot(elbowStart[0] + Math.sin(a) * size / 2 - tapVertex[0], elbowStart[1] - Math.cos(a) * size / 2 - tapVertex[1]) - size * 0.9),
                label: DC.deg(angle)
            },
        ];

        // Straight on the long side, from the tap on the main to the elbow.
        const sides = lateralSides({ main, size, angle, r, smooth });
        const edge = (t, o) => [t * Math.cos(a) + nrm[0] * o, t * Math.sin(a) + nrm[1] * o];
        if (sides.heel > 0.05) {
            const pa = edge(sides.tHeel, size / 2);
            const pb = edge(sides.endHeel, size / 2);
            dims.push({ a: pa, b: pb, dir: nrm, base: unit * 0.3, ea: pa, eb: pb, label: `Long side ${DC.fmt(sides.heel)}` });
        }
        // (The short side is listed in the results: on the drawing it sits
        // against the main, where its dimension can't be read.)

        if (parallel) {
            dims.push({ a: [end.x, 0], b: [end.x, end.y], dir: [1, 0], base: unit * 0.45, ea: [0, 0], eb: [elbowEnd.x, end.y], cl: true, label: `${roll ? "True offset" : "Offset"} ${DC.fmt(r.trueOffset)}` });
            dims.push({ a: [0, -main / 2], b: [elbowEnd.x, -main / 2], dir: [0, -1], base: main * 0.45, ea: [0, 0], eb: [elbowEnd.x, elbowEnd.y], cl: true, label: `Along main ${DC.fmt(elbowEnd.x)}` });
        } else {
            dims.push({ a: [0, -main / 2], b: [elbowEnd.x, -main / 2], dir: [0, -1], base: main * 0.45, ea: [0, 0], eb: [elbowEnd.x, end.y], cl: true, label: `Along main ${DC.fmt(elbowEnd.x)}` });
        }

        return {
            roll: roll || 0,
            dimW: kind === "rect" ? depth / 2 : 0,
            parts: [
                { kind, ...section, path: mainPath.points, tone: "main" },
                { kind, ...branch, path: path.points, tap: { kind, half: main / 2, angle } }
            ],
            dims: dims.filter(Boolean),
            caption: [
                `${DC.deg(r.elbow)} ${smooth ? "radius" : "straight"} elbow${smooth ? `, CLR ${DC.fmt(R)}` : ""}`,
                roll ? `rolled ${roll.toFixed(1)}° from vertical` : ""
            ].filter(Boolean).join(" · ")
        };
    }

    DC.lateralScene = lateralScene;

    // ---------- offset (two elbows, optional roll) ----------

    function offset(out) {
        const D = DC.meas("rfD");
        const rise = DC.meas("rfRise");
        const roll = DC.meas("rfRoll") || 0;
        const clr = DC.num("rfClr");
        const gores = Math.round(DC.num("rfGores"));
        const known = DC.val("rfMode") === "knownAngle";

        if (!(D > 0)) {
            return DC.renderProblem(out, "Enter the diameter", "Diameter must be greater than zero.");
        }

        if (!(rise >= 0) || !(roll >= 0) || rise + roll <= 0) {
            return DC.renderProblem(out, "Enter the offset", "Enter the rise (and the roll if the offset also moves sideways).");
        }

        if (!(clr > 0)) {
            return DC.renderProblem(out, "Enter the CLR", "CLR is a multiple of the diameter, such as 1 or 1.5.");
        }

        if (!(gores >= 2 && gores <= 20)) {
            return DC.renderProblem(out, "Enter the gores", "Use 2 to 20 gores per elbow (2 = a single miter).");
        }

        const R = clr * D;

        if (R < D / 2) {
            return DC.renderProblem(out, "CLR is too small", "A CLR under 0.5 × D leaves no throat.", ["Use a CLR of at least 0.5."]);
        }

        // Rolling offset: the true offset is the diagonal of rise and roll.
        const T = Math.hypot(rise, roll);
        let angle;
        let length;

        if (known) {
            angle = DC.num("rfAngle");

            if (!(angle > 0 && angle < 90)) {
                return DC.renderProblem(out, "Enter a usable elbow angle", "Elbow angle must be greater than 0° and less than 90°.");
            }

            const a = DC.rad(angle);
            length = T / Math.tan(a) + 2 * R * Math.tan(a / 2);
        } else {
            length = DC.meas("rfLen");

            if (!(length > 0)) {
                return DC.renderProblem(out, "Enter the length", "Length is the run along the duct from the start of the first elbow to the end of the second.");
            }

            // Same two-elbow geometry as Elbow Offset: L = T/tanθ + 2R·tan(θ/2)
            angle = solveOffsetAngle(T, length, R);

            if (!Number.isFinite(angle)) {
                const minimum = DC.quarterUp(Math.sqrt(Math.max(0, (4 * R - T) * T)));

                return DC.renderProblem(
                    out,
                    "More length is required",
                    "This offset will not fit in that length with the selected CLR.",
                    [
                        minimum > 0
                            ? `Increase the length to at least ${DC.fmtFt(minimum)} (${DC.fmt(minimum)}).`
                            : "Increase the length.",
                        "Or use a smaller CLR."
                    ]
                );
            }
        }

        const a = DC.rad(angle);
        const tangent = R * Math.tan(a / 2);
        const travel = T / Math.sin(a);
        const straight = travel - 2 * tangent;

        if (straight < -0.001) {
            const minimumOffset = DC.quarterUp(2 * R * Math.tan(a / 2) * Math.sin(a));

            return DC.renderProblem(
                out,
                "The two elbows overlap",
                "There isn't enough travel between the elbows at this angle and CLR.",
                [
                    `Increase the true offset to at least ${DC.fmt(minimumOffset)}, or use a smaller angle.`,
                    "Or use a smaller CLR."
                ]
            );
        }

        const rows = [
            { label: known ? "Elbow angle" : "Required elbow angle", value: DC.deg(angle), main: true },
            roll > 0 && { label: "True offset", note: "√(rise² + roll²)", value: DC.fmt(T) },
            roll > 0 && rise > 0 && {
                label: "Roll angle",
                note: "turn the offset this far from vertical",
                value: DC.deg(DC.degOf(Math.atan(roll / rise)), 1)
            },
            { label: known ? "Length (run)" : "Length (run)", value: DC.len(length) },
            { label: "Travel, elbow to elbow", note: "center-to-center along the offset", value: DC.len(travel) },
            { label: "Straight between elbows", value: DC.fmt(Math.max(0, straight)) },
            { label: "Centerline radius", value: DC.fmt(R) },
            { label: "Throat / heel radius", value: `${DC.fmt(R - D / 2)} / ${DC.fmt(R + D / 2)}` },
            ...DC.goreRows(D, R, angle, gores)
        ];

        DC.renderRows(out, rows);

        // ---------- 3D scene ----------
        const lead = Math.max(D * 1.2, 6);
        const path = DC.Fit3D.Path(-lead, 0, 0)
            .line(lead, true)
            .gored(R, angle, gores)
            .line(Math.max(0, straight), true)
            .gored(R, -angle, gores)
            .line(lead, true);
        const nrm = [-Math.sin(a), Math.cos(a)];
        const e1 = [R * Math.sin(a), R * (1 - Math.cos(a))];
        const e2 = [e1[0] + Math.max(0, straight) * Math.cos(a), e1[1] + Math.max(0, straight) * Math.sin(a)];
        const rollDeg = roll > 0 ? (rise > 0 ? DC.degOf(Math.atan(roll / rise)) : 90) : 0;
        const heelVertex = [(R + D / 2) * Math.tan(a / 2), -D / 2];

        return {
            roll: rollDeg,
            parts: [{ kind: "round", d: D, path: path.points }],
            dims: [
                { a: [-lead, -D / 2], b: [-lead, D / 2], dir: [-1, 0], base: D * 0.3, label: `Ø ${DC.fmt(D)}` },
                { a: [0, -D / 2], b: [length, -D / 2], dir: [0, -1], base: D * 0.45, ea: [0, -D / 2], eb: [length, T - D / 2], label: `Length ${DC.fmt(length)}` },
                { a: [length + lead, 0], b: [length + lead, T], dir: [1, 0], base: D * 0.45, ea: [0, 0], eb: [length, T], cl: true, label: `${roll > 0 ? "True offset" : "Offset"} ${DC.fmt(T)}` },
                straight > 0.05 && {
                    a: [e1[0] + nrm[0] * D / 2, e1[1] + nrm[1] * D / 2],
                    b: [e2[0] + nrm[0] * D / 2, e2[1] + nrm[1] * D / 2],
                    dir: nrm, base: D * 0.45, label: `Straight ${DC.fmt(straight)}`
                },
                { type: "angle", c: heelVertex, a0: 0, a1: angle, r: heelVertex[0] + D * 0.6, label: DC.deg(angle) }
            ].filter(Boolean),
            caption: [
                `${gores}-gore elbows, CLR ${DC.fmt(R)}`,
                roll > 0 ? `rolled ${rollDeg.toFixed(1)}° from vertical` : ""
            ].filter(Boolean).join(" · ")
        };
    }

    // ---------- lateral ----------

    function lateral(out) {
        const D = DC.meas("rlD");
        const angle = DC.num("rlAngle");
        const orient = DC.val("rlOrient");
        const clr = DC.num("rlClr");

        if (!(D > 0)) {
            return DC.renderProblem(out, "Enter the branch diameter", "Branch diameter must be greater than zero.");
        }

        if (!(angle > 0 && angle < 90)) {
            return DC.renderProblem(out, "Enter the lateral angle", "The lateral angle must be between 0° and 90° (45° is standard).");
        }

        if (!(clr >= 0.5)) {
            return DC.renderProblem(out, "Enter the elbow CLR", "CLR is a multiple of the branch diameter, at least 0.5.");
        }

        const R = clr * D;
        const input = {
            angle,
            orient,
            R,
            offset: DC.meas("rlOffset"),
            roll: DC.meas("rlRoll") || 0,
            advance: DC.meas("rlAdvance")
        };

        if (orient === "perpendicular" ? !(input.advance > 0) : !(input.offset > 0)) {
            return DC.renderProblem(
                out,
                orient === "perpendicular" ? "Enter the distance along the main" : "Enter the offset",
                orient === "perpendicular"
                    ? "Measure along the main from where the branch centerline meets the main centerline to the branch's final centerline."
                    : "Measure from the main centerline to where the branch centerline needs to end up."
            );
        }

        const r = DC.lateral(input);

        if (r.straight < -0.001) {
            return DC.renderProblem(
                out,
                "The elbow doesn't fit",
                "The elbow would start before the branch leaves the main.",
                [
                    orient === "perpendicular"
                        ? `Increase the distance along the main to at least ${DC.fmt(DC.quarterUp(r.minimumAdvance))}.`
                        : `Increase the offset to at least ${DC.fmt(DC.quarterUp(r.minimumOffset))}.`,
                    "Or use a smaller elbow CLR."
                ]
            );
        }

        const rows = [
            { label: "Elbow angle", value: DC.deg(r.elbow), main: true },
            r.rollAngle != null && { label: "True offset", note: "√(offset² + roll²)", value: DC.fmt(r.trueOffset) },
            r.rollAngle != null && { label: "Roll angle", note: "turn the lateral this far from vertical", value: DC.deg(r.rollAngle, 1) },
            ...sideRows(DC.meas("rlMainD") > 0 ? DC.meas("rlMainD") : D * 1.5, D, angle, r, true),
            { label: "Branch travel to elbow center", value: DC.len(r.travel) },
            r.orient === "parallel"
                ? { label: "Along the main to elbow end", value: DC.len(r.advanceToElbowEnd) }
                : { label: "Elbow end above main centerline", value: DC.len(r.elbowEndHeight) },
            { label: "Elbow centerline radius", value: DC.fmt(R) },
            { text: "Long and short side run along the branch from where it meets the main to the start of the elbow. Subtract your lateral fitting's own length." }
        ];

        DC.renderRows(out, rows);

        // ---------- 3D scene ----------
        const Dm = DC.meas("rlMainD") > 0 ? DC.meas("rlMainD") : D * 1.5;
        return lateralScene({
            kind: "round",
            main: Dm,
            size: D,
            angle,
            r,
            R,
            smooth: true,
            roll: r.rollAngle || 0,
            label: s => `Ø ${DC.fmt(s)}`
        });
    }

    // ---------- gored elbow ----------

    function gored(out) {
        const D = DC.meas("rgD");
        const angle = DC.num("rgAngle");
        const clr = DC.num("rgClr");
        const gores = Math.round(DC.num("rgGores"));

        if (!(D > 0)) {
            return DC.renderProblem(out, "Enter the diameter", "Diameter must be greater than zero.");
        }

        if (!(angle > 0 && angle <= 90)) {
            return DC.renderProblem(out, "Enter the elbow angle", "Elbow angle must be greater than 0° and at most 90°.");
        }

        if (!(clr >= 0.5)) {
            return DC.renderProblem(out, "Enter the CLR", "CLR is a multiple of the diameter, at least 0.5.");
        }

        if (!(gores >= 2 && gores <= 20)) {
            return DC.renderProblem(out, "Enter the gores", "Use 2 to 20 gores (2 = a single miter).");
        }

        const R = clr * D;
        const g = DC.gores(D, R, angle, gores);

        DC.renderRows(out, [
            { label: "Miter (cut) angle", note: "angle ÷ (2 × gores − 2)", value: DC.deg(g.miter), main: true },
            { label: "Centerline radius", value: DC.fmt(R) },
            { label: "Full gore angle", value: DC.deg(g.goreAngle) },
            { head: `Full gores (${g.fullCount})` },
            g.fullCount > 0 && { label: "Heel length", value: DC.fmt(g.full.heel) },
            g.fullCount > 0 && { label: "Throat length", value: DC.fmt(g.full.throat) },
            g.fullCount > 0 && { label: "Centerline length", value: DC.fmt(g.full.centerline) },
            g.fullCount === 0 && { text: "With 2 gores the elbow is a single miter: just the two end gores." },
            { head: "End gores (2)" },
            { label: "Heel length", value: DC.fmt(g.end.heel) },
            { label: "Throat length", value: DC.fmt(g.end.throat) },
            { label: "Centerline length", value: DC.fmt(g.end.centerline) },
            { head: "Whole elbow" },
            { label: "Stretchout (π × D)", value: DC.len(g.stretchout) },
            { label: "Centerline length", note: "tan(miter) × CLR × (2n − 2)", value: DC.len(g.totalCenterline) }
        ]);

        // ---------- 3D scene ----------
        const lead = D * 0.9;
        const path = DC.Fit3D.Path(-lead, 0, 0).line(lead, true).gored(R, angle, gores).line(lead, true);
        const half = DC.rad(angle / 2);
        const mid = [R * Math.sin(half), R - R * Math.cos(half)];

        return {
            roll: 0,
            parts: [{ kind: "round", d: D, path: path.points }],
            dims: [
                { a: [-lead, -D / 2], b: [-lead, D / 2], dir: [-1, 0], base: D * 0.3, label: `Ø ${DC.fmt(D)}` },
                { a: [0, R], b: mid, fixed: true, radius: true, label: `CLR ${DC.fmt(R)}` },
                { type: "angle", c: [0, R], a0: -90, a1: -90 + angle, r: Math.max(R - D / 2, R * 0.3) * 0.45, fixed: true, noRays: true, keepOnSmall: true, label: DC.deg(angle) }
            ],
            caption: `${gores} gores · miter ${DC.deg(g.miter)} · full gore ${DC.deg(g.goreAngle)}`
        };
    }

    function compute() {
        syncFields();

        const tab = DC.val("roundTab") || "offset";
        const out = DC.get("roundResults");
        const scene =
            tab === "lateral" ? lateral(out) :
            tab === "gored" ? gored(out) :
            offset(out);

        if (scene) {
            DC.Fit3D.render("roundView", scene);
        } else {
            DC.Fit3D.clear("roundView");
        }
    }

    DC.Fit3D.bindView("roundView");

    DC.tabs(SCREEN, compute);
    DC.live(SCREEN, compute);
})();
