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
        const byRun = DC.val("dgMode") === "run";
        DC.show("dgAngleGroup", !byRun);
        DC.show("dgRunGroup", byRun);
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
        const lean = (W / 2) * Math.tan(half);
        const Lc = Math.hypot(O, L);
        // Corners of the sloped piece (both miters are parallel, so the
        // piece is a parallelogram): its cheek edges are Lc long, and its
        // bottom corners are exactly L apart along the run.
        const BL = [lean, -W / 2];
        const BR = [L + lean, O - W / 2];
        const TL = [-lean, W / 2];
        const TR = [L - lean, O + W / 2];
        const outEnd = [L + lead, O - W / 2]; // bottom corner of the outlet's end

        return {
            roll: 0,
            dimW: H / 2,
            parts: [{ kind: "rect", w: W, h: H, path: path.points }],
            dims: [
                { a: [-lead, -W / 2], b: [-lead, W / 2], dir: [-1, 0], base: W * 0.3, label: `${DC.fmt(W)} cheek` },
                // Run between the miters, from the sloped piece's bottom corners.
                { a: BL, b: [BR[0], -W / 2], dir: [0, -1], base: W * 0.4, ea: BL, eb: BR, label: `Length ${DC.fmt(L)}` },
                // Offset between the bottom edges of the inlet and outlet.
                { a: [outEnd[0], -W / 2], b: outEnd, dir: [1, 0], base: W * 0.35, ea: BL, eb: outEnd, label: `Offset ${DC.fmt(O)}` },
                // Cheek edge of the sloped piece, corner to corner.
                { a: TL, b: TR, dir: nrm, base: W * 0.3, ea: TL, eb: TR, label: `Sloped ${DC.fmt(Lc)}` },
                // Angle at the bottom corner, off the inlet's bottom edge.
                { type: "angle", c: BL, a0: 0, a1: alpha, r: W * 0.55, label: DC.deg(alpha) }
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

    /*
     * Field dogleg from a straight joint.
     *   Two parallel cuts across the joint, each β = α/2 off square on the
     *   cheek. Rolling the middle piece over (180° about its length) flips
     *   the lean of its ends, so each joint becomes an α elbow, one each way.
     *   middle piece M (centerline; both edges are M too, the cuts being parallel)
     *   offset  O = M · sin α          run between elbows  L = M · cos α
     *   lean    t = (W/2) · tan β      (each cut runs 2t along the duct)
     *   the joint gets shorter by M · (1 − cos α)
     */
    function dogleg(out) {
        const W = DC.meas("dgW");
        const O = DC.meas("dgO");
        const J = DC.meas("dgJ");
        const byRun = DC.val("dgMode") === "run";

        if (!(W > 0)) {
            return DC.renderProblem(out, "Enter the cheek width", "Width is the side of the duct the offset moves across.");
        }
        if (!(O > 0)) {
            return DC.renderProblem(out, "Enter the offset", "Measure the offset in the field: how far the duct has to move over.");
        }
        if (!(J > 0)) {
            return DC.renderProblem(out, "Enter the joint length", "The length of the straight joint you're cutting (for example 48 or 60).");
        }

        let alpha;
        if (byRun) {
            const run = DC.meas("dgRun");
            if (!(run > 0)) {
                return DC.renderProblem(out, "Enter the run", "Run is along the duct, from one elbow's centerline point to the other's.");
            }
            alpha = DC.degOf(Math.atan(O / run));
        } else {
            alpha = DC.num("dgAngle");
            if (!(alpha > 0 && alpha < 90)) {
                return DC.renderProblem(out, "Enter the elbow angle", "Elbow angle must be greater than 0° and less than 90° (45° or 30° is typical).");
            }
        }

        const a = DC.rad(alpha);
        const beta = alpha / 2;
        const M = O / Math.sin(a);
        const L = M * Math.cos(a);
        const t = (W / 2) * Math.tan(DC.rad(beta));
        const startText = String(DC.val("dgStart") || "").trim();
        const d1 = startText ? DC.meas("dgStart") : (J - M) / 2;
        const d2 = d1 + M;
        const shorter = M - L;

        if (startText && !(d1 >= 0)) {
            return DC.renderProblem(out, "Check the first cut", "Enter the first cut's distance from the end of the joint, or leave it blank to center the offset.");
        }

        if (J < M + 2 * t + 0.001) {
            const need = DC.quarterUp(M + 2 * t);
            return DC.renderProblem(out, "The joint is too short", "Both cuts don't fit on this joint.", [
                `Use a joint at least ${DC.fmt(need)} long (${DC.fmtFt(need)}).`,
                byRun ? "Or use a shorter run (a steeper offset)." : "Or try a different elbow angle."
            ]);
        }

        if (d1 - t < -0.001 || d2 + t > J + 0.001) {
            return DC.renderProblem(out, "The cuts run off the joint", "At this first-cut position a cut runs past the end of the joint.", [
                `Put the first cut between ${DC.fmt(DC.quarterUp(t))} and ${DC.fmt(Math.floor((J - M - t) * 4) / 4)} from the end.`,
                "Or leave it blank to center the offset."
            ]);
        }

        const f = DC.fmt;
        const b = v => `<b>${v}</b>`;
        const step = (n, html) => ({ text: `<span class="dg-step"><b class="dg-n">${n}</b><span>${html}</span></span>` });
        DC.renderRows(out, [
            { label: "Cut each joint", note: "off square, on the cheek", value: DC.deg(beta), main: true },
            { label: "Elbow angle (each)", value: DC.deg(alpha) },
            { head: "Steps" },
            step(1, `Hook your tape on one end of the joint. On one cheek, mark the ${b("top edge")} at ${b(f(d1 - t))} and ${b(f(d2 - t))}.`),
            step(2, `Same cheek, same end: mark the ${b("bottom edge")} at ${b(f(d1 + t))} and ${b(f(d2 + t))}.`),
            step(3, `Draw the cut lines: ${b(f(d1 - t))} to ${b(f(d1 + t))}, and ${b(f(d2 - t))} to ${b(f(d2 + t))}. Both lines lean the same way, ${DC.deg(beta)} off square.`),
            step(4, `Carry the marks around: square across the top and bottom sides at those marks, and draw the same two lines on the other cheek.`),
            step(5, `Cut on the lines. The middle piece is ${b(DC.len(M))} on every edge.`),
            step(6, `${b("Roll the middle piece over")}: turn it 180° on its length, so its top edge becomes the bottom edge. Keep the same ends facing the end pieces.`),
            step(7, `Fit it back between the end pieces and fasten. Each joint is now a ${DC.deg(alpha)} elbow and the duct moves over ${b(f(O))}.`),
            { head: "Check" },
            { label: "Offset made", value: f(O) },
            { label: "Run between the elbows", note: "centerline", value: DC.len(L) },
            { label: "Lean across the cheek", note: "each cut runs this far along the duct", value: f(2 * t) },
            { label: "Joint gets shorter by", value: f(shorter) },
            { label: "Finished length", note: "end to end, along the duct", value: DC.len(J - shorter) },
            { text: "No allowance is added at the cuts. Add your own for drives, cleats or tabs. Tap Finished on the 3D view to watch it fold." }
        ]);

        drawDogLayout({ W, J, d1, d2, t });

        // ---------- 3D scene ----------
        const H = DC.meas("dgH") > 0 ? DC.meas("dgH") : W * 0.5;
        dgGeom = { W, H, J, O, L, M, t, d1, d2, alpha, beta, shorter };
        return dogScene(dgGeom, dgU);
    }

    /*
     * Dogleg pieces in joint coordinates: x along the joint (0 to J), y
     * across the cheek (top edge +W/2), w through the depth. Each cut runs
     * from x = d − t at the top edge to d + t at the bottom edge.
     *
     * u = 0 straight joint with the cuts marked, u = 1 finished offset.
     * In between: the pieces part (0–.25), the middle piece rolls 180° on
     * its length (.25–.6), then it swings to the elbow angle and the
     * outlet piece follows until the cut faces meet (.6–1).
     */
    let dgGeom = null;
    let dgU = 0;
    let dgAnim = null;

    const clamp01 = v => Math.max(0, Math.min(1, v));
    const ease = v => v * v * (3 - 2 * v);

    function dogScene(g, u) {
        const { W, H, J, O, L, M, t, d1, d2, alpha, beta, shorter } = g;
        const a = DC.rad(alpha);
        const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
        // face ring at centerline position d (lean = slanted cut)
        const face = (d, lean) => corners.map(([cy, cw]) => [d - (lean ? t * cy : 0), cy * W / 2, cw * H / 2]);
        const lerpRing = (r0, r1, f) => r0.map((p, k) => p.map((v, m) => v + (r1[k][m] - v) * f));
        // rings for a piece from face f0 to face f1, split for depth sorting
        const piece = (f0, f1, len) => {
            const n = Math.max(1, Math.ceil(len / Math.max(W * 0.6, 4)));
            const out = [];
            for (let k = 0; k <= n; k += 1) out.push(lerpRing(f0, f1, k / n));
            return out;
        };
        const A = piece(face(0, false), face(d1, true), d1);
        const B = piece(face(d1, true), face(d2, true), M);
        const C = piece(face(d2, true), face(J, false), J - d2);

        const s1 = ease(clamp01(u / 0.25));
        const s2 = ease(clamp01((u - 0.25) / 0.35));
        const s3 = ease(clamp01((u - 0.6) / 0.4));
        const gap = W * 0.35 * s1 * (1 - s3);
        const phi = Math.PI * s2;
        const th = a * s3;
        const bLeft = [d1 + gap, 0];
        const bRight = [bLeft[0] + M * Math.cos(th), M * Math.sin(th)];
        const cLeft = [bRight[0] + gap, bRight[1]];

        const moveB = ([x, y, w]) => {
            // roll about the piece's own centerline, then swing about its left end
            const yr = y * Math.cos(phi) - w * Math.sin(phi);
            const wr = y * Math.sin(phi) + w * Math.cos(phi);
            const px = x - d1;
            return [bLeft[0] + px * Math.cos(th) - yr * Math.sin(th), bLeft[1] + px * Math.sin(th) + yr * Math.cos(th), wr];
        };
        const moveC = ([x, y, w]) => [x - d2 + cLeft[0], y + cLeft[1], w];
        const ringsOf = (rs, f, flags) => rs.map((pts, k) => ({ pts: pts.map(f), ...(flags(k, rs.length) || {}) }));
        const id = p => p;
        const ends = (k, n) => (k === 0 || k === n - 1 ? { joint: true } : null);

        const base = { kind: "rect", w: W, h: H };
        let parts;
        if (u <= 0) {
            // one straight joint, cut lines marked
            const rings = [
                ...ringsOf(A, id, k => (k === 0 ? { joint: true } : null)),
                ...ringsOf(B.slice(1), id, (k, n) => (k === 0 ? null : null)),
                ...ringsOf(C.slice(1), id, (k, n) => (k === n - 1 ? { joint: true } : null))
            ];
            for (const k of [A.length - 1, A.length - 1 + B.length - 1]) Object.assign(rings[k], { cut: true, joint: true });
            parts = [{ ...base, rings }];
        } else if (u >= 1) {
            const rings = [
                ...ringsOf(A, id, k => (k === 0 ? { joint: true } : null)),
                // rolling 180° moves each corner to the opposite one: renumber
                // so the stitched surface doesn't twist
                ...ringsOf(B.slice(1).map(r => [r[2], r[3], r[0], r[1]]), moveB, () => null),
                ...ringsOf(C.slice(1), moveC, (k, n) => (k === n - 1 ? { joint: true } : null))
            ];
            rings[A.length - 1].joint = true;
            rings[A.length - 1 + B.length - 1].joint = true;
            parts = [{ ...base, rings }];
        } else {
            parts = [
                { ...base, rings: ringsOf(A, id, ends) },
                { ...base, rings: ringsOf(B, moveB, ends), tone: "main" },
                { ...base, rings: ringsOf(C, moveC, ends) }
            ];
        }

        let dims = [];
        let caption;
        if (u <= 0) {
            const top = d => [d - t, W / 2];
            const bot = d => [d + t, -W / 2];
            dims = [
                { a: [0, -W / 2], b: [0, W / 2], dir: [-1, 0], base: W * 0.3, label: `${DC.fmt(W)} cheek` },
                { a: [0, W / 2], b: top(d1), dir: [0, 1], base: W * 0.25, ea: [0, W / 2], eb: top(d1), label: `Cut 1 top ${DC.fmt(d1 - t)}` },
                { a: [0, W / 2], b: top(d2), dir: [0, 1], base: W * 0.25, ea: [0, W / 2], eb: top(d2), label: `Cut 2 top ${DC.fmt(d2 - t)}` },
                { a: [0, -W / 2], b: bot(d1), dir: [0, -1], base: W * 0.25, ea: [0, -W / 2], eb: bot(d1), label: `Cut 1 bottom ${DC.fmt(d1 + t)}` },
                { a: [0, -W / 2], b: bot(d2), dir: [0, -1], base: W * 0.25, ea: [0, -W / 2], eb: bot(d2), label: `Cut 2 bottom ${DC.fmt(d2 + t)}` }
            ];
            caption = `Straight joint ${DC.fmt(J)} · cut on the yellow lines, ${DC.deg(beta)} off square, both leaning the same way`;
        } else if (u >= 1) {
            const C0 = J - d2;
            const BL = [d1 + t, -W / 2];
            const TL = [d1 - t, W / 2];
            const TR = [d1 + L - t, O + W / 2];
            const endBottom = [d1 + L + C0, O - W / 2];
            const slope = a;
            const nrm = [-Math.sin(slope), Math.cos(slope)];
            dims = [
                { a: [0, -W / 2], b: [0, W / 2], dir: [-1, 0], base: W * 0.3, label: `${DC.fmt(W)} cheek` },
                { a: [0, -W / 2], b: [endBottom[0], -W / 2], dir: [0, -1], base: W * 0.4, ea: [0, -W / 2], eb: endBottom, label: `Finished ${DC.fmt(J - shorter)}` },
                { a: [endBottom[0], -W / 2], b: endBottom, dir: [1, 0], base: W * 0.35, ea: BL, eb: endBottom, label: `Offset ${DC.fmt(O)}` },
                { a: TL, b: TR, dir: nrm, base: W * 0.3, ea: TL, eb: TR, label: `Middle ${DC.fmt(M)}` }
            ];
            caption = `${DC.deg(alpha)} elbows · middle piece rolled over · depth ${DC.fmt(H)}`;
        } else {
            caption = u < 0.25 ? "Cut the joint at both marks…" : u < 0.6 ? "Roll the middle piece over…" : "Fit the faces back together…";
        }

        return { roll: 0, dimW: H / 2, parts, dims, caption };
    }

    // Straight joint ⇄ finished: animate the fold.
    function setDogView(target) {
        if (!dgGeom) return;
        const view = DC.Fit3D.views.rectView;
        cancelAnimationFrame(dgAnim);
        syncDogToggle(target);
        const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const from = dgU;
        if (reduce || from === target) {
            dgU = target;
            if (view) view.lock = null;
            DC.Fit3D.render("rectView", dogScene(dgGeom, dgU));
            return;
        }
        // hold the framing of the straight joint (the wider of the two) while folding
        if (view) view.lock = dgStraightFrame || view.frame || null;
        const dur = 2400 * Math.abs(target - from);
        const t0 = performance.now();
        const step = now => {
            const f = clamp01((now - t0) / dur);
            dgU = from + (target - from) * f;
            if (f >= 1) {
                dgU = target;
                dgAnim = null;
                if (view) view.lock = null;
                DC.Fit3D.render("rectView", dogScene(dgGeom, dgU));
                if (dgU === 0) dgStraightFrame = view?.frame || null;
                return;
            }
            DC.Fit3D.render("rectView", dogScene(dgGeom, dgU));
            dgAnim = requestAnimationFrame(step);
        };
        dgAnim = requestAnimationFrame(step);
    }

    let dgStraightFrame = null;

    function syncDogToggle(target) {
        document.querySelectorAll("#dgToggle [data-dgv]").forEach(b => {
            const on = Number(b.dataset.dgv) === target;
            b.classList.toggle("is-on", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    document.querySelectorAll("#dgToggle [data-dgv]").forEach(b => {
        b.addEventListener("click", () => setDogView(Number(b.dataset.dgv)));
    });

    // Flat layout of the straight joint (cheek face) with both cuts marked.
    // Marks are running dimensions from the left end, like a tape hooked on it.
    function drawDogLayout({ W, J, d1, d2, t }) {
        const svg = DC.get("dgLayout");
        if (!svg) return;
        const VW = 340, VH = 210;
        const s = Math.min((VW - 40) / J, 92 / W);
        const len = J * s, h = W * s;
        const left = (VW - len) / 2, top = 64, bottom = top + h;
        const X = d => left + d * s;
        const f = v => DC.fmt(v);
        const run = (d, y, side) => {
            const x = X(d), xa = X(0), up = side < 0;
            const ty = up ? y - 6 : y + 15;
            return `<path class="dm" d="M${xa} ${y}H${x}M${x} ${up ? y - 4 : y + 4}V${up ? top : bottom}" stroke-width="1.2"/>
                <path class="dm" d="M${x - 5} ${y - 3}L${x} ${y}L${x - 5} ${y + 3}" stroke-width="1.2"/>
                <text class="fig-t fig-y" x="${x - 4}" y="${ty}" text-anchor="end">${f(d)}</text>`;
        };
        const cut = d => `<path class="dm" d="M${X(d + t)} ${bottom}L${X(d - t)} ${top}" stroke-width="2.2"/>`;
        svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
        svg.innerHTML = `
            <polygon points="${X(d1 - t)},${top} ${X(d2 - t)},${top} ${X(d2 + t)},${bottom} ${X(d1 + t)},${bottom}" fill="rgba(110,190,230,.18)" stroke="none"/>
            <rect class="ln" x="${left}" y="${top}" width="${len}" height="${h}"/>
            <path class="hd" d="M${left} ${(top + bottom) / 2}H${left + len}"/>
            <path class="dm" d="M${X(0)} ${top - 40}V${bottom + 40}" stroke-width="1.2"/>
            ${cut(d1)}${cut(d2)}
            ${run(d1 - t, top - 16, -1)}${run(d2 - t, top - 36, -1)}
            ${run(d1 + t, bottom + 16, 1)}${run(d2 + t, bottom + 36, 1)}
            <text class="fig-t" x="${left + len}" y="${top - 8}" text-anchor="end">top edge</text>
            <text class="fig-t" x="${left + len}" y="${bottom + 16}" text-anchor="end">bottom edge</text>`;
    }

    function compute() {
        syncFields();

        const out = DC.get("rectResults");
        const tab = DC.val("rectTab") || "mitered";
        if (dgAnim) {
            cancelAnimationFrame(dgAnim);
            dgAnim = null;
            dgU = Math.round(dgU);
            if (DC.Fit3D.views.rectView) DC.Fit3D.views.rectView.lock = null;
        }
        DC.show("dgToggle", tab === "dogleg");
        syncDogToggle(dgU >= 1 ? 1 : 0);
        const scene = tab === "lateral" ? lateral(out) : tab === "dogleg" ? dogleg(out) : mitered(out);

        if (scene) {
            DC.Fit3D.render("rectView", scene);
            if (tab === "dogleg" && dgU === 0) dgStraightFrame = DC.Fit3D.views.rectView?.frame || null;
        } else {
            DC.Fit3D.clear("rectView");
        }
    }

    DC.Fit3D.bindView("rectView");

    DC.tabs(SCREEN, compute);
    DC.live(SCREEN, compute);
})();
