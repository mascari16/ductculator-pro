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
    function lateralScene({ kind, main, size, depth, angle, r, R, smooth, roll, label }) {
        const a = DC.rad(angle);
        const gap = Math.max(main, size) * 0.8 + 3;
        const tail = size * 1.6;
        // where the branch clears the main (drawing starts there)
        const clear = (main / 2) / Math.sin(a) + (size / 2) / Math.tan(a);
        const start = Math.min(clear, r.straight);
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
        const mainLeft = -main * 1.6 - (size / 2) / Math.tan(a);
        const mainRight = Math.max(end.x, elbowEnd.x + size) + (r.orient === "parallel" ? 0 : main * 1.4);
        const mainPath = DC.Fit3D.Path(mainLeft, 0, 0).line(mainRight - mainLeft, true);
        const section = kind === "round" ? { d: main } : { w: main, h: depth };
        const branch = kind === "round" ? { d: size } : { w: size, h: depth };
        const mid = r.straight / 2;
        const dims = [
            { a: [mainLeft, -main / 2], b: [mainLeft, main / 2], off: [-gap, 0], label: label(main) }
        ];
        const notes = [
            { at: [Math.cos(a / 2) * (main * 0.5 + gap * 1.1), Math.sin(a / 2) * (main * 0.5 + gap * 1.1) + main / 2], text: DC.deg(angle) },
            r.straight > 0.01 && {
                at: [mid * Math.cos(a) - Math.sin(a) * (size / 2 + gap * 0.8), mid * Math.sin(a) + Math.cos(a) * (size / 2 + gap * 0.8)],
                text: `Straight ${DC.fmt(r.straight)}`
            }
        ];

        if (r.orient === "parallel") {
            const T = r.trueOffset;
            dims.push({ a: [end.x + gap, 0], b: [end.x + gap, T], ea: [mainRight, 0], eb: [end.x, end.y], label: `${roll ? "True offset" : "Offset"} ${DC.fmt(T)}` });
        } else {
            const A = elbowEnd.x;
            dims.push({ a: [0, 0], b: [A, 0], off: [0, -(main / 2 + gap)], eb: [end.x, end.y], label: `Along main ${DC.fmt(A)}` });
        }

        if (roll) {
            notes.push({ at: [end.x, end.y + size / 2 + gap], text: `Rolled ${roll.toFixed(1)}° from vertical` });
        }

        return {
            roll: roll || 0,
            parts: [
                { kind, ...section, path: mainPath.points, tone: "main" },
                { kind, ...branch, path: path.points }
            ],
            dims,
            notes: notes.filter(Boolean)
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
        const gap = D * 0.9 + 3;
        const path = DC.Fit3D.Path(-lead, 0, 0)
            .line(lead, true)
            .gored(R, angle, gores)
            .line(Math.max(0, straight), true)
            .gored(R, -angle, gores)
            .line(lead, true);
        const half = DC.rad(angle / 2);
        const elbowMid = [R * Math.sin(half), R - R * Math.cos(half)];
        const out1 = [Math.sin(half), -Math.cos(half)];
        const rollDeg = roll > 0 ? (rise > 0 ? DC.degOf(Math.atan(roll / rise)) : 90) : 0;
        const slopeMid = [
            (R * Math.sin(DC.rad(angle)) + length - R * Math.sin(DC.rad(angle))) / 2,
            T / 2
        ];

        return {
            roll: rollDeg,
            parts: [{ kind: "round", d: D, path: path.points }],
            dims: [
                { a: [-lead, -D / 2], b: [-lead, D / 2], off: [-gap, 0], label: `Ø ${DC.fmt(D)}` },
                { a: [0, 0], b: [length, 0], off: [0, -(D / 2 + gap)], eb: [length, T], label: `Length ${DC.fmt(length)}` },
                { a: [length + lead + gap, 0], b: [length + lead + gap, T], ea: null, eb: [length + lead, T], label: `${roll > 0 ? "True offset" : "Offset"} ${DC.fmt(T)}` }
            ],
            notes: [
                { at: [elbowMid[0] + out1[0] * (D / 2 + gap * 0.45), elbowMid[1] + out1[1] * (D / 2 + gap * 0.45)], text: DC.deg(angle) },
                straight > 0.01 && { at: [slopeMid[0] - Math.sin(DC.rad(angle)) * (D / 2 + gap * 0.7), slopeMid[1] + Math.cos(DC.rad(angle)) * (D / 2 + gap * 0.7)], text: `Straight ${DC.fmt(straight)}` },
                roll > 0 && { at: [length + lead, T + D / 2 + gap], text: `Rolled ${rollDeg.toFixed(1)}° from vertical` }
            ].filter(Boolean)
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
            { label: "Branch straight to elbow", note: "from the main centerline", value: DC.len(r.straight) },
            { label: "Branch travel to elbow center", value: DC.len(r.travel) },
            r.orient === "parallel"
                ? { label: "Along the main to elbow end", value: DC.len(r.advanceToElbowEnd) }
                : { label: "Elbow end above main centerline", value: DC.len(r.elbowEndHeight) },
            { label: "Elbow centerline radius", value: DC.fmt(R) },
            { text: "Straight is measured from where the branch centerline crosses the main centerline. Subtract your lateral fitting's own length." }
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
        const gap = D * 0.9 + 3;
        const path = DC.Fit3D.Path(-lead, 0, 0).line(lead, true).gored(R, angle, gores).line(lead, true);
        const half = DC.rad(angle / 2);
        const mid = [R * Math.sin(half), R - R * Math.cos(half)];

        return {
            roll: 0,
            parts: [{ kind: "round", d: D, path: path.points }],
            dims: [
                { a: [-lead, -D / 2], b: [-lead, D / 2], off: [-gap, 0], label: `Ø ${DC.fmt(D)}` },
                { a: [0, R], b: mid, ea: null, eb: null, label: `CLR ${DC.fmt(R)}` }
            ],
            notes: [
                { at: [mid[0] + Math.sin(half) * (D / 2 + gap * 0.45), mid[1] - Math.cos(half) * (D / 2 + gap * 0.45)], text: `${DC.deg(angle)} · ${gores} gores` },
                { at: [-lead, D / 2 + gap * 0.9], text: `Miter ${DC.deg(g.miter)}` }
            ]
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
