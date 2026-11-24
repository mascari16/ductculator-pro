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
    }

    function compute() {
        syncFields();

        const tab = DC.val("roundTab") || "offset";
        const out = DC.get("roundResults");

        if (tab === "lateral") {
            lateral(out);
        } else if (tab === "gored") {
            gored(out);
        } else {
            offset(out);
        }
    }

    DC.tabs(SCREEN, compute);
    DC.live(SCREEN, compute);
})();
