// =====================================================
// DUCTCULATOR PRO
// rectFittings.js
// Rectangular duct: mitered (straight-elbow) offsets and laterals.
// Radius-elbow offsets live on the Elbow Offset screen.
// =====================================================

(function () {
    "use strict";

    const DC = window.DC;
    const SCREEN = "rectWorkspace";

    function syncFields() {
        const perpendicular = DC.val("xlOrient") === "perpendicular";
        DC.show("xlOffsetGroup", !perpendicular);
        DC.show("xlAdvanceGroup", perpendicular);
        DC.show("xlClrGroup", DC.val("xlType") === "radius");
    }

    /*
     * Mitered offset with two straight elbows.
     *   slope angle α = atan(O ÷ L)        (each elbow turns α)
     *   miter cut     = α ÷ 2 off square
     *   sloped piece  = √(O² + L²) on the centerline; both cheek edges
     *                   are this long because each miter adds to one
     *                   edge and takes the same off the other.
     *   end lean      = W · tan(α/2) across the cheek at each miter
     *   O × W ÷ L     = W · tan(α), the shop quick check
     */
    function mitered(out) {
        const W = DC.meas("moW");
        const O = DC.meas("moO");
        const L = DC.meas("moL");

        if (!(W > 0)) {
            return DC.renderProblem(out, "Enter the cheek width", "Width is the side of the duct that turns (the cheek).");
        }

        if (!(O > 0)) {
            return DC.renderProblem(out, "Enter the offset", "Offset must be greater than zero.");
        }

        if (!(L > 0)) {
            return DC.renderProblem(out, "Enter the length", "Length is the run between the two miter points, on the centerline.");
        }

        const alpha = DC.degOf(Math.atan(O / L));
        const half = DC.rad(alpha / 2);

        DC.renderRows(out, [
            { label: "Elbow angle (each)", value: DC.deg(alpha), main: true },
            { label: "Miter cut", note: "off square, at each joint", value: DC.deg(alpha / 2) },
            { label: "Sloped piece length", note: "both cheek edges, miter to miter", value: DC.len(Math.hypot(O, L)) },
            { label: "End lean across the cheek", note: "W × tan(angle ÷ 2)", value: DC.fmt(W * Math.tan(half)) },
            { label: "O × W ÷ L", note: "W × tan(angle): shop quick check", value: DC.fmt(O * W / L) },
            { label: "Slope", value: `${DC.fmt(12 * O / L)} per 12" · ${(100 * O / L).toFixed(1)}%` }
        ]);

        // ---------- 3D scene ----------
        const H = DC.meas("moH") > 0 ? DC.meas("moH") : W * 0.5;
        const lead = Math.max(W * 0.9, 6);
        const gap = W * 0.8 + 3;
        const path = DC.Fit3D.Path(-lead, 0, 0)
            .line(lead, true)
            .corner(alpha)
            .line(Math.hypot(O, L), true)
            .corner(-alpha)
            .line(lead, true);

        const slope = DC.rad(alpha);
        const nrm = [-Math.sin(slope), Math.cos(slope)];
        const vertex = [(W / 2) * Math.tan(half), -W / 2];
        const Lc = Math.hypot(O, L);

        return {
            roll: 0,
            dimW: H / 2,
            parts: [{ kind: "rect", w: W, h: H, path: path.points }],
            dims: [
                { a: [-lead, -W / 2], b: [-lead, W / 2], dir: [-1, 0], base: W * 0.3, label: `${DC.fmt(W)} cheek` },
                { a: [0, -W / 2], b: [L, -W / 2], dir: [0, -1], base: W * 0.45, ea: [0, 0], eb: [L, O], cl: true, label: `Length ${DC.fmt(L)}` },
                { a: [L + lead, 0], b: [L + lead, O], dir: [1, 0], base: W * 0.45, ea: [0, 0], eb: [L, O], cl: true, label: `Offset ${DC.fmt(O)}` },
                { a: [nrm[0] * W / 2, nrm[1] * W / 2], b: [L + nrm[0] * W / 2, O + nrm[1] * W / 2], dir: nrm, base: W * 0.45, label: `Sloped ${DC.fmt(Lc)}` },
                { type: "angle", c: vertex, a0: 0, a1: alpha, r: W * 0.6, slide: [Math.cos(slope), Math.sin(slope)], slideMax: Math.max(0, Lc - W), label: DC.deg(alpha) }
            ],
            caption: `Both miters cut ${DC.deg(alpha / 2)} off square · depth ${DC.fmt(H)}`
        };
    }

    function lateral(out) {
        const W = DC.meas("xlW");
        const angle = DC.num("xlAngle");
        const orient = DC.val("xlOrient");
        const type = DC.val("xlType");
        const clr = DC.num("xlClr");

        if (!(W > 0)) {
            return DC.renderProblem(out, "Enter the cheek width", "Width is the side of the branch that turns (in the plane of the bend).");
        }

        if (!(angle > 0 && angle < 90)) {
            return DC.renderProblem(out, "Enter the lateral angle", "The lateral angle must be between 0° and 90° (45° is standard).");
        }

        if (type === "radius" && !(clr >= 0.5)) {
            return DC.renderProblem(out, "Enter the elbow CLR", "CLR is a multiple of the cheek width, at least 0.5.");
        }

        const R = type === "radius" ? clr * W : 0;
        const input = {
            angle,
            orient,
            R,
            offset: DC.meas("xlOffset"),
            advance: DC.meas("xlAdvance"),
            roll: 0
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
                    "Or use a straight elbow or a smaller CLR."
                ]
            );
        }

        DC.renderRows(out, [
            { label: "Elbow angle", value: DC.deg(r.elbow), main: true },
            type === "straight" && { label: "Miter cut", note: "off square", value: DC.deg(r.elbow / 2) },
            type === "straight" && { label: "End lean across the cheek", value: DC.fmt(W * Math.tan(DC.rad(r.elbow / 2))) },
            ...DC.lateralSideRows(DC.meas("xlMainW") > 0 ? DC.meas("xlMainW") : W * 1.5, W, angle, r, type === "radius"),
            r.orient === "parallel"
                ? { label: "Along the main to elbow end", value: DC.len(r.advanceToElbowEnd) }
                : { label: "Elbow end above main centerline", value: DC.len(r.elbowEndHeight) },
            type === "radius" && { label: "Elbow centerline radius", value: DC.fmt(R) },
            type === "radius" && { label: "Throat / heel radius", value: `${DC.fmt(R - W / 2)} / ${DC.fmt(R + W / 2)}` },
            { text: "Long and short side run along the branch from where it meets the main to the start of the elbow. Subtract your lateral fitting's own length." }
        ]);

        // ---------- 3D scene ----------
        const Wm = DC.meas("xlMainW") > 0 ? DC.meas("xlMainW") : W * 1.5;
        const H = DC.meas("xlH") > 0 ? DC.meas("xlH") : W * 0.6;

        return DC.lateralScene({
            kind: "rect",
            main: Wm,
            size: W,
            depth: H,
            angle,
            r,
            R,
            smooth: type === "radius",
            roll: 0,
            label: s => `${DC.fmt(s)} main`
        });
    }

    function compute() {
        syncFields();

        const out = DC.get("rectResults");
        const scene = (DC.val("rectTab") || "mitered") === "lateral" ? lateral(out) : mitered(out);

        if (scene) {
            DC.Fit3D.render("rectView", scene);
        } else {
            DC.Fit3D.clear("rectView");
        }
    }

    DC.Fit3D.bindView("rectView");

    DC.tabs(SCREEN, compute);
    DC.live(SCREEN, compute);
})();
