// =====================================================
// DUCTWORK PRO
// wheel.js
// Manual duct calculator wheel on the Airflow screen.
//
// A card with three colored arcs (blue airflow on top, red round duct
// diameter on the left, green air velocity at the bottom) and a white
// disc that turns. Every scale is logarithmic, so the friction chart
//   f = 0.109136 · Q^1.9 / D^5.02      (in. w.c./100 ft, CFM, in.)
// and the velocity  V = 183.346 · Q / D²   become plain angle sums.
// Angles are degrees clockwise from the top; the disc is turned by φ.
//
//   blue (card):        airflow      a(Q) = A·(log Q − 3.35)
//   disc index (top):   setting the index on Q makes φ = a(Q)
//   red (card):         diameter     r(D) = RD·log D + r0      RD = 5.02/1.9·A
//   disc, left edge:    friction     s(f) = −A/1.9·log f + s0  (+ φ)
//       r(D) = s(f) + φ  exactly when f is the friction for Q and D
//   green (card):       velocity     g(V) = A·log V + g0
//   disc, bottom edge:  diameter     t(D) = −2A·log D + t0     (+ φ)
//       g(V) = t(D) + φ  exactly when V = Q / area
// =====================================================

(function () {
    "use strict";

    const root = document.getElementById("afWheel");
    const svg = document.getElementById("wheelSvg");
    if (!root || !svg) return;

    const NS = "http://www.w3.org/2000/svg";
    const W = 760, H = 960, CX = 380, CY = 452;
    const LOG_K = Math.log10(0.109136);
    const LOG_V = Math.log10(183.346);

    const A = 38;                                   // degrees per decade, airflow
    const aQ = q => A * (Math.log10(q) - 3.35);     // blue (card)
    const R1 = (5.02 / 1.9) * A;
    const c1 = -9 - R1 * Math.log10(48);
    const r1 = d => R1 * Math.log10(d) + c1;        // red upper (disc): against the airflow
    const g0 = 110 - 2 * A;
    const gV = v => A * Math.log10(v) + g0;          // green (card)
    const c2 = A * 3.35 + A * LOG_V + g0;
    const r2 = d => -2 * A * Math.log10(d) + c2;     // red lower (disc): against the velocity
    const ARROW = 75;                                // window arrow, disc angle
    const WF = A / 1.9;
    const w0 = ARROW - A * 3.35 - c1 - WF * LOG_K;
    const wF = f => WF * Math.log10(f) + w0;         // friction (card, seen through the window)

    const RING = {
        disc: 214,
        red: [220, 288],
        outer: [292, 356],
        win: [152, 198], winA: 24
    };

    let phi = 0;            // disc turn
    let hair = 262;         // reading hairline, card angle

    const rad = d => (d * Math.PI) / 180;
    const pt = (r, a) => [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))];
    const norm = a => ((a % 360) + 540) % 360 - 180;

    function el(name, attrs, text) {
        const n = document.createElementNS(NS, name);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (text != null) n.textContent = text;
        return n;
    }

    function arcPath(r, a0, a1) {
        const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
        return `M${x0} ${y0}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1} ${y1}`;
    }

    function band(r0_, r1, a0, a1, cls, taper) {
        const big = a1 - a0 > 180 ? 1 : 0;
        const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0_, a1), [x3, y3] = pt(r0_, a0);
        let tip = "";
        if (taper) { const [tx, ty] = pt((r0_ + r1) / 2 + 26, a1 + 7); tip = `L${tx} ${ty}`; }
        return el("path", { class: cls, d: `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}${tip}L${x2} ${y2}A${r0_} ${r0_} 0 ${big} 0 ${x3} ${y3}Z` });
    }

    let uid = 0;
    // black tab with curved white lettering (reads left to right)
    function tab(g, text, r, aMid, width) {
        const id = `whp${uid++}`;
        const flip = Math.cos(rad(aMid)) < -0.2;
        const a0 = aMid - width / 2, a1 = aMid + width / 2;
        g.appendChild(el("path", { d: arcPath(r, a0, a1), class: "wh-tab" }));
        g.appendChild(el("path", { id, d: flip ? arcPath(r + 5, a1, a0) : arcPath(r - 5, a0, a1), fill: "none", stroke: "none" }));
        const t = el("text", { class: "wh-tab-t" });
        t.appendChild(el("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" }, text));
        g.appendChild(t);
    }

    function ticks(lo, hi, steps) {
        const out = [];
        for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e += 1) {
            const p = 10 ** e;
            for (const [m0, m1, st] of steps) {
                for (let m = m0; m < m1 - 1e-9; m = +(m + st).toFixed(4)) {
                    const v = +(m * p).toPrecision(6);
                    if (v < lo * 0.999 || v > hi * 1.001) continue;
                    out.push(v);
                }
            }
        }
        return [...new Set(out)].sort((a, b) => a - b);
    }
    const FINE = [[1, 2, 0.1], [2, 5, 0.2], [5, 10, 0.5]];

    // a scale: tick marks on a base line, numbers on one side; crowded labels drop out
    function scale(g, { values, labels, angle, rLine, dir, len = 9, lenMajor = 15, rText, isMajor, fmt, cls = "wh-num" }) {
        for (const v of values) {
            const a = angle(v);
            const major = isMajor(v);
            const [x0, y0] = pt(rLine, a), [x1, y1] = pt(rLine + dir * (major ? lenMajor : len), a);
            g.appendChild(el("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: major ? "wh-tk wh-tk-major" : "wh-tk" }));
        }
        const taken = [];
        const order = labels.slice().sort((p, q) => rank(p) - rank(q));
        for (const v of order) {
            const a = angle(v);
            const text = fmt(v);
            const half = ((text.length * 7 + 6) / 2 / rText) * 180 / Math.PI;
            if (taken.some(([b, h]) => Math.abs(norm(a - b)) < half + h)) continue;
            taken.push([a, half]);
            const [tx, ty] = pt(rText, a);
            const up = Math.cos(rad(a)) >= -0.25;
            g.appendChild(el("text", { x: tx, y: ty, class: cls, transform: `rotate(${up ? norm(a) : norm(a) + 180} ${tx} ${ty})`, "text-anchor": "middle", "dominant-baseline": "central" }, text));
        }
    }
    function rank(v) {
        const m = Math.round((v / 10 ** Math.floor(Math.log10(v) + 1e-9)) * 100) / 100;
        return m === 1 ? 0 : m === 2 || m === 5 ? 1 : m === 3 || m === 1.5 ? 2 : 3;
    }
    const num = v => (v >= 1000 ? v.toLocaleString("en-US").replace(/,/g, " ") : String(+v.toPrecision(3)));
    const dec = v => String(+v.toPrecision(3)).replace(/^0\./, ".");

    const base = el("g", {});
    const disc = el("g", { class: "wh-discg" });
    const over = el("g", {});
    svg.replaceChildren(base, disc, over);

    function unitLabel(g, text, r, a) {
        const [x, y] = pt(r, a);
        const up = Math.cos(rad(a)) >= -0.25;
        g.appendChild(el("text", { x, y, class: "wh-unit", transform: `rotate(${up ? norm(a) : norm(a) + 180} ${x} ${y})`, "text-anchor": "middle", "dominant-baseline": "central" }, text));
    }

    // ---------- the card (drawn once) ----------
    function drawCard() {
        base.appendChild(el("rect", { x: 6, y: 6, width: W - 12, height: H - 12, rx: 30, class: "wh-card" }));
        const [o0, o1] = RING.outer, om = (o0 + o1) / 2 - 2;

        // blue: airflow. CFM along the inner edge (faces the red), L/s outside
        base.appendChild(band(o0, o1, aQ(50) - 5, aQ(100000) + 5, "wh-blue"));
        scale(base, { values: ticks(50, 100000, FINE), labels: ticks(50, 100000, [[1, 2, 0.5], [2, 10, 1]]), angle: aQ, rLine: o0, dir: 1, rText: o0 + 25, isMajor: v => rank(v) <= 2, fmt: num });
        base.appendChild(el("path", { d: arcPath(om + 8, aQ(50) - 2, aQ(100000) + 2), class: "wh-line" }));
        scale(base, { values: ticks(25, 47000, FINE), labels: ticks(25, 47000, [[1, 2, 0.5], [2, 10, 1]]), angle: v => aQ(v / 0.471947), rLine: om + 8, dir: 1, len: 6, lenMajor: 10, rText: om + 26,
            isMajor: v => rank(v) <= 1, fmt: num, cls: "wh-num wh-num-sm" });
        tab(base, "AIRFLOW", o1 + 17, 0, 22);
        unitLabel(base, "CFM", o0 + 25, aQ(50) - 9);
        unitLabel(base, "L/s", om + 26, aQ(50) - 9);

        // green: air velocity. FPM along the inner edge (faces the red), m/s outside
        base.appendChild(band(o0, o1, gV(100) - 5, gV(10000) + 5, "wh-green"));
        scale(base, { values: ticks(100, 10000, FINE), labels: ticks(100, 10000, [[1, 2, 0.5], [2, 10, 1]]), angle: gV, rLine: o0, dir: 1, rText: o0 + 25, isMajor: v => rank(v) <= 2, fmt: num });
        base.appendChild(el("path", { d: arcPath(om + 8, gV(100) - 2, gV(10000) + 2), class: "wh-line" }));
        scale(base, { values: ticks(0.5, 50, FINE), labels: ticks(0.5, 50, [[1, 2, 0.5], [2, 10, 1]]), angle: v => gV(v * 196.85), rLine: om + 8, dir: 1, len: 6, lenMajor: 10, rText: om + 26,
            isMajor: v => rank(v) <= 1, fmt: v => String(+v.toPrecision(2)), cls: "wh-num wh-num-sm" });
        tab(base, "AIR VELOCITY", o1 + 17, gV(1000), 28);
        unitLabel(base, "FPM", o0 + 25, gV(10000) + 9);
        unitLabel(base, "m/s", om + 26, gV(10000) + 9);

        // friction rate: printed on the card under the disc, read through the window
        const fLo = 0.003, fHi = 10;
        base.appendChild(band(RING.win[0] - 6, RING.win[1] + 6, wF(fLo) - 3, wF(fHi) + 3, "wh-fplate"));
        scale(base, { values: ticks(fLo, fHi, [[1, 2, 0.1], [2, 5, 0.25], [5, 10, 0.5]]), labels: [0.003, 0.005, 0.01, 0.015, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 3, 5, 10],
            angle: wF, rLine: RING.win[0] + 2, dir: 1, len: 7, lenMajor: 12, rText: RING.win[0] + 26, isMajor: v => rank(v) <= 2, fmt: dec });

        // conversions, lower right
        const lines = [["1 CFM", "0.4719 L/s"], ["1 L/s", "2.119 CFM"], ["1 in.", "25.4 mm"], ["1 in. w.c./100 ft", "8.17 Pa/m"], ["1 FPM", "0.00508 m/s"], ["1 m/s", "196.9 FPM"]];
        const x = 560, y = 836;
        base.appendChild(el("text", { x: x + 80, y, class: "wh-conv-h", "text-anchor": "middle" }, "TO CONVERT UNITS"));
        lines.forEach(([a, b], k) => {
            base.appendChild(el("text", { x: x + 64, y: y + 21 + k * 17, class: "wh-conv", "text-anchor": "end" }, a));
            base.appendChild(el("text", { x: x + 70, y: y + 21 + k * 17, class: "wh-conv" }, `= ${b}`));
        });
        base.appendChild(el("text", { x: 34, y: H - 32, class: "wh-brand" }, "DUCTWORK PRO"));
        base.appendChild(el("text", { x: 34, y: H - 15, class: "wh-small" }, "Galvanized round duct, standard air (ASHRAE friction chart)"));
    }

    function tabIn(g, text, r, aMid, width) {
        const id = `whp${uid++}`;
        const flip = Math.cos(rad(aMid)) < -0.2;
        const a0 = aMid - width / 2, a1 = aMid + width / 2;
        g.appendChild(el("path", { d: arcPath(r, a0, a1), class: "wh-tab wh-tab-sm" }));
        g.appendChild(el("path", { id, d: flip ? arcPath(r + 4, a1, a0) : arcPath(r - 4, a0, a1), fill: "none", stroke: "none" }));
        const t = el("text", { class: "wh-tab-t wh-tab-t-sm" });
        t.appendChild(el("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" }, text));
        g.appendChild(t);
    }

    // white disc with the friction window cut out of it (disc angles)
    function discFace() {
        const R = RING.disc, [w0r, w1r] = RING.win, wa = RING.winA;
        const circle = `M${CX - R} ${CY}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z`;
        const [x0, y0] = pt(w1r, ARROW - wa), [x1, y1] = pt(w1r, ARROW + wa), [x2, y2] = pt(w0r, ARROW + wa), [x3, y3] = pt(w0r, ARROW - wa);
        const hole = `M${x0} ${y0}A${w1r} ${w1r} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${w0r} ${w0r} 0 0 0 ${x3} ${y3}Z`;
        return el("path", { d: circle + hole, "fill-rule": "evenodd", class: "wh-disc" });
    }

    // ---------- the disc and its red arc (drawn once, turned by a transform) ----------
    function drawDisc() {
        // red arc: duct diameter, part of the disc
        const [q0, q1] = RING.red, qm = q1 - 26;
        const rA0 = r2(60) - 5, rA1 = r1(48) + 360 + 5;
        disc.appendChild(band(q0, q1, rA0, rA1, "wh-red", true));
        // upper: against the airflow (blue)
        const r1n = d => r1(d) + 360;
        scale(disc, { values: ticks(3, 48, [[1, 2, 0.1], [2, 5, 0.25], [5, 10, 0.5]]), labels: [3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 42, 48],
            angle: r1n, rLine: q1, dir: -1, rText: q1 - 24, isMajor: v => v === Math.round(v), fmt: v => String(v) });
        // lower: against the velocity (green)
        scale(disc, { values: ticks(4, 60, [[1, 2, 0.1], [2, 5, 0.25], [5, 10, 0.5]]), labels: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 42, 48, 54, 60],
            angle: r2, rLine: q1, dir: -1, rText: q1 - 24, isMajor: v => v === Math.round(v), fmt: v => String(v) });
        const mm = [80, 100, 125, 150, 200, 250, 300, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1250, 1500];
        scale(disc, { values: [], labels: mm.filter(v => v / 25.4 <= 48), angle: v => r1n(v / 25.4), rLine: q1, dir: -1, rText: qm - 20, isMajor: () => false, fmt: v => String(v), cls: "wh-num wh-num-sm" });
        scale(disc, { values: [], labels: mm.filter(v => v / 25.4 >= 4), angle: v => r2(v / 25.4), rLine: q1, dir: -1, rText: qm - 20, isMajor: () => false, fmt: v => String(v), cls: "wh-num wh-num-sm" });
        tabIn(disc, "DUCT DIAMETER", (q0 + q1) / 2, (r2(4) + r1(3) + 360) / 2, 24);
        unitLabel(disc, "in.", q1 - 24, r1n(48) + 7);
        unitLabel(disc, "mm", qm - 20, r1n(48) + 7);
        unitLabel(disc, "in.", q1 - 24, r2(60) - 7);
        unitLabel(disc, "mm", qm - 20, r2(60) - 7);

        // white disc with the window
        disc.appendChild(discFace());
        // window frame, label and arrow
        const [w0r, w1r] = RING.win, wa = RING.winA;
        disc.appendChild(el("path", { d: arcPath(w1r, ARROW - wa, ARROW + wa) + arcPath(w0r, ARROW - wa, ARROW + wa), class: "wh-winframe" }));
        tabIn(disc, "FRICTION RATE  (in. w.c./100 ft)", w1r + 8, ARROW, 2 * wa + 14);
        const [ax0, ay0] = pt(w0r - 30, ARROW), [ax1, ay1] = pt(w0r - 4, ARROW);
        disc.appendChild(el("line", { x1: ax0, y1: ay0, x2: ax1, y2: ay1, class: "wh-index" }));
        const [hx, hy] = pt(w0r - 2, ARROW);
        disc.appendChild(el("path", { d: `M${hx} ${hy}l-14 -7v14z`, class: "wh-index-head", transform: `rotate(${ARROW - 90} ${hx} ${hy})` }));

        // index at the top: arrow and hairline out to the airflow scale
        const [ix0, iy0] = pt(RING.disc - 4, 0), [ix1, iy1] = pt(RING.outer[1] + 4, 0);
        disc.appendChild(el("line", { x1: ix0, y1: iy0, x2: ix1, y2: iy1, class: "wh-index" }));
        disc.appendChild(el("path", { d: `M${CX} ${CY - RING.disc + 2}l-9 -16h18z`, class: "wh-index-head" }));
        tabIn(disc, "INDEX", RING.disc - 22, 0, 16);

        // title and how-to
        disc.appendChild(el("text", { x: CX - 12, y: CY - 122, class: "wh-title", "text-anchor": "middle" }, "DUCT CALCULATOR"));
        disc.appendChild(el("text", { x: CX - 12, y: CY - 96, class: "wh-sub", "text-anchor": "middle" }, "U.S. AND S.I. UNITS"));
        const steps = [
            ["1. FRICTION RATE:", "line the duct size (red) up with the airflow", "(blue). Read the friction rate at the arrow."],
            ["2. DUCT SIZE:", "turn the arrow to the friction rate. Read", "the size on the red opposite the airflow."],
            ["3. VELOCITY:", "set the index on the airflow. Read the", "velocity (green) opposite the duct size."],
            ["4. AIRFLOW:", "set the duct size opposite the velocity.", "Read the airflow at the index."]
        ];
        let y = CY - 68;
        for (const [h, l1, l2] of steps) {
            disc.appendChild(el("text", { x: CX - 150, y, class: "wh-step-h" }, h));
            disc.appendChild(el("text", { x: CX - 150, y: y + 13, class: "wh-step" }, l1));
            disc.appendChild(el("text", { x: CX - 150, y: y + 25, class: "wh-step" }, l2));
            y += 40;
        }
        disc.appendChild(el("circle", { cx: CX - 40, cy: CY + 100, r: 10, class: "wh-pivot" }));
    }

    // ---------- reading hairline (on top, does not turn) ----------
    const hairLine = el("line", { class: "wh-hair" });
    const hairGrip = el("circle", { r: 14, class: "wh-hair-grip", "data-grip": "1" });
    over.append(hairLine, hairGrip);

    // value of a scale at card angle a (inverting angle = fn(v))
    function inv(fn, a, lo, hi) {
        for (const turn of [0, 360, -360]) {
            const target = a + turn;
            let l = Math.log10(lo), h = Math.log10(hi);
            const fl = fn(10 ** l), fh = fn(10 ** h);
            if ((target - fl) * (target - fh) > 0) continue;
            for (let i = 0; i < 60; i += 1) {
                const m = (l + h) / 2, fm = fn(10 ** m);
                if ((target - fl) * (target - fm) <= 0) h = m; else l = m;
            }
            return 10 ** ((l + h) / 2);
        }
        return null;
    }

    function rectFor(D) {
        const de = (a, b) => (1.30 * (a * b) ** 0.625) / (a + b) ** 0.25;
        const out = [];
        for (const b of [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36]) {
            if (de(b, b) > D * 1.001) break;
            let lo = b, hi = 400;
            for (let i = 0; i < 50; i += 1) { const m = (lo + hi) / 2; if (de(m, b) < D) lo = m; else hi = m; }
            const a = Math.ceil(hi - 0.05);
            if (a / b <= 4.01) out.push(`${a} × ${b}`);
        }
        return out.slice(-3).reverse().join(", ");
    }

    const f2 = v => (v == null ? "—" : v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : v.toFixed(v < 1 ? 3 : 2));

    function update() {
        disc.setAttribute("transform", `rotate(${phi} ${CX} ${CY})`);
        const [hx0, hy0] = pt(RING.red[0] - 6, hair), [hx1, hy1] = pt(RING.outer[1] + 4, hair);
        hairLine.setAttribute("x1", hx0); hairLine.setAttribute("y1", hy0);
        hairLine.setAttribute("x2", hx1); hairLine.setAttribute("y2", hy1);
        const [gx, gy] = pt(RING.outer[1] - 4, hair);
        hairGrip.setAttribute("cx", gx); hairGrip.setAttribute("cy", gy);

        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        const Q = inv(aQ, norm(phi), 50, 100000);
        const fr = inv(wF, norm(ARROW + phi), 0.003, 10);
        const qHair = inv(aQ, norm(hair), 50, 100000);
        const dUp = inv(d => norm(r1(d)), norm(hair - phi), 3, 48);
        const dLow = inv(r2, ((hair - phi) % 360 + 360) % 360, 4, 60);
        const vel = inv(gV, ((hair % 360) + 360) % 360, 100, 10000);
        set("whIndex", Q ? `${f2(Q)} CFM` : "—");
        set("whFrArrow", fr ? `${f2(fr)}"` : "—");
        set("whQBlue", qHair ? `${f2(qHair)} CFM` : "—");
        set("whDUp", dUp ? `${f2(dUp)}"` : "—");
        set("whDLow", dLow ? `${f2(dLow)}"` : "—");
        set("whVel", vel ? `${f2(vel)} FPM` : "—");
        const D = dUp || dLow;
        set("whRect", D ? rectFor(D) || "—" : "—");
    }

    // ---------- interaction ----------
    const angleAt = e => {
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * W - CX;
        const y = ((e.clientY - r.top) / r.height) * H - CY;
        return { a: (Math.atan2(x, -y) * 180) / Math.PI, r: Math.hypot(x, y) };
    };
    const clampPhi = v => norm(v);
    // is card angle a on the red arc (which turns with the disc)?
    const onRed = a => {
        const local = (((a - phi) % 360) + 360) % 360;
        return local >= r2(60) - 5 && local <= r1(48) + 360 + 5;
    };
    let drag = null;
    let frame = 0;
    const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };

    svg.addEventListener("pointerdown", e => {
        const { a, r } = angleAt(e);
        if (e.target.dataset && e.target.dataset.grip) drag = { kind: "hair" };
        else if (r <= RING.disc || (r <= RING.red[1] && onRed(a))) drag = { kind: "disc", a, phi };
        else if (r <= RING.outer[1] + 10) { drag = { kind: "hair" }; hair = a; later(); }
        else return;
        svg.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    svg.addEventListener("pointermove", e => {
        if (!drag) return;
        const { a } = angleAt(e);
        if (drag.kind === "hair") hair = a;
        else phi = clampPhi(drag.phi + norm(a - drag.a));
        later();
    });
    const end = () => { drag = null; };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener("keydown", e => {
        const step = e.shiftKey ? 2 : 0.25;
        const k = { ArrowLeft: -step, ArrowRight: step, ArrowUp: step, ArrowDown: -step }[e.key];
        if (k == null) return;
        e.preventDefault();
        if (e.altKey) hair += k * 4; else phi = clampPhi(phi + k);
        update();
    });

    // Line the wheel up with the calculator's airflow and friction.
    document.getElementById("whFromInputs")?.addEventListener("click", () => {
        const Q = Number(document.getElementById("cfmInput")?.value);
        const f = Number(document.getElementById("frictionInput")?.value) || 0.08;
        if (!(Q > 0)) return;
        // arrow on the friction rate; hairline on the airflow, where the size reads on the red
        phi = norm(wF(f) - ARROW);
        hair = norm(aQ(Q));
        update();
    });

    // Calculator / Manual wheel switch
    const calc = document.querySelector("#airflowWorkspace .calculator");
    document.querySelectorAll("[data-afmode]").forEach(b => {
        b.addEventListener("click", () => {
            const wheel = b.dataset.afmode === "wheel";
            document.querySelectorAll("[data-afmode]").forEach(x => {
                const on = x === b;
                x.classList.toggle("is-on", on);
                x.setAttribute("aria-selected", on ? "true" : "false");
            });
            if (calc) calc.hidden = wheel;
            root.hidden = !wheel;
            if (wheel) update();
        });
    });

    drawCard();
    drawDisc();
    update();

    // for checks
    window.DuctWheel = {
        aQ, r1, r2, gV, wF, ARROW,
        get phi() { return phi; }, set phi(v) { phi = v; update(); },
        get hair() { return hair; }, set hair(v) { hair = v; update(); }
    };
})();
