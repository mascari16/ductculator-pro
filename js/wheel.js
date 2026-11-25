// =====================================================
// DUCTWORK PRO
// wheel.js
// Manual air duct calculator wheel on the Airflow screen.
//
// A card with a large white disc that turns. Every scale is logarithmic,
// so the friction chart  f = 0.109136 · Q^1.9 / D^5.02  (in. w.c./100 ft,
// CFM, in.) and the velocity  V = 183.346 · Q / D²  become angle sums.
// Angles are degrees clockwise from the top; the disc is turned by φ.
//
//   blue, card (outer):   airflow      a(Q) = A0 + 1.9c·log Q
//   blue, disc edge:      friction     b(f) = B0 + c·log f          (+ φ)
//       lining Q up with f turns the disc to φ = K + c(5.02·log D − log 0.109136)
//   round-duct window:    the card scale d(D) = P + φ(D) shows at the arrow (P)
//   orange, disc edge:    velocity     v(V) = G0 + α·log V          (+ φ)
//   orange, card (outer): airflow      e(Q) = E0 + α·log Q,  α = 2.51c
//       e(Q) = v(V) + φ(D) exactly when V = Q / area
//   green:                rectangular sizes with the same friction as the
//                         round size in the window (Huebscher); the inner row
//                         follows the round size.
// =====================================================

(function () {
    "use strict";

    const root = document.getElementById("afWheel");
    const svg = document.getElementById("wheelSvg");
    if (!root || !svg) return;

    const NS = "http://www.w3.org/2000/svg";
    const W = 760, H = 880, CX = 380, CY = 466;
    const LOG_K = Math.log10(0.109136);
    const LOG_V = Math.log10(183.346);

    const c = 24;
    const A0 = -100 - 1.9 * c * Math.log10(30);
    const aQ = q => A0 + 1.9 * c * Math.log10(q);
    const B0 = A0 + c * (5.02 * Math.log10(12) - LOG_K);
    const bF = f => B0 + c * Math.log10(f);
    const K = A0 - B0;
    const phiOf = D => K + c * (5.02 * Math.log10(D) - LOG_K);
    const roundOf = ph => 10 ** (((ph - K) / c + LOG_K) / 5.02);
    const P = -90;                                   // round-duct arrow (disc angle)
    const dD = D => P + phiOf(D);                    // card scale under the window
    const AL = 2.51 * c;
    const E0 = 40 - AL * Math.log10(200);
    const eQ = q => E0 + AL * Math.log10(q);
    const G0 = E0 - AL * LOG_V - K + c * LOG_K;
    const vV = v => G0 + AL * Math.log10(v);
    const GA = [186, 262];                           // green arc (card angles)
    const gA = a => GA[0] + ((Math.log10(a) - Math.log10(3)) / (Math.log10(100) - Math.log10(3))) * (GA[1] - GA[0]);

    const R = { disc: 290, rim: 252, out: [294, 352], win: [196, 240], winA: 20, green: [254, 290] };

    let phi = phiOf(12);
    let hair = -40;

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
    function band(r0, r1, a0, a1, cls) {
        const big = a1 - a0 > 180 ? 1 : 0;
        const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
        return el("path", { class: cls, d: `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z` });
    }
    let uid = 0;
    function tab(g, text, r, aMid, width, small) {
        const id = `whp${uid++}`;
        const flip = Math.cos(rad(aMid)) < -0.2;
        const a0 = aMid - width / 2, a1 = aMid + width / 2;
        const off = small ? 4 : 5;
        g.appendChild(el("path", { d: arcPath(r, a0, a1), class: small ? "wh-tab wh-tab-sm" : "wh-tab" }));
        g.appendChild(el("path", { id, d: flip ? arcPath(r + off, a1, a0) : arcPath(r - off, a0, a1), fill: "none", stroke: "none" }));
        const t = el("text", { class: small ? "wh-tab-t wh-tab-t-sm" : "wh-tab-t" });
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
                    if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
                }
            }
        }
        return [...new Set(out)].sort((x, y) => x - y);
    }
    const FINE = [[1, 2, 0.1], [2, 5, 0.2], [5, 10, 0.5]];
    function rank(v) {
        const m = Math.round((v / 10 ** Math.floor(Math.log10(v) + 1e-9)) * 100) / 100;
        return m === 1 ? 0 : m === 2 || m === 5 ? 1 : m === 3 || m === 1.5 ? 2 : 3;
    }
    function scale(g, { values, labels, angle, rLine, dir, len = 9, lenMajor = 15, rText, isMajor, fmt, cls = "wh-num" }) {
        for (const v of values) {
            const a = angle(v), major = isMajor(v);
            const [x0, y0] = pt(rLine, a), [x1, y1] = pt(rLine + dir * (major ? lenMajor : len), a);
            g.appendChild(el("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: major ? "wh-tk wh-tk-major" : "wh-tk" }));
        }
        const taken = [];
        for (const v of labels.slice().sort((p, q) => rank(p) - rank(q))) {
            const a = angle(v), text = fmt(v);
            const half = ((text.length * 7 + 6) / 2 / rText) * 180 / Math.PI;
            if (taken.some(([b, h]) => Math.abs(norm(a - b)) < half + h)) continue;
            taken.push([a, half]);
            const [tx, ty] = pt(rText, a);
            const up = Math.cos(rad(a)) >= -0.25;
            g.appendChild(el("text", { x: tx, y: ty, class: cls, transform: `rotate(${up ? norm(a) : norm(a) + 180} ${tx} ${ty})`, "text-anchor": "middle", "dominant-baseline": "central" }, text));
        }
    }
    const num = v => (v >= 1000 ? v.toLocaleString("en-US") : String(+v.toPrecision(3)));
    const dec = v => String(+v.toPrecision(3)).replace(/^0\./, ".");
    const LBL = [[1, 2, 0.5], [2, 10, 1]];

    const base = el("g", {});
    const disc = el("g", { class: "wh-discg" });
    const over = el("g", {});
    const greenRow = el("g", {});
    svg.replaceChildren(base, disc, greenRow, over);

    // ---------- the card ----------
    function drawCard() {
        base.appendChild(el("rect", { x: 6, y: 6, width: W - 12, height: H - 12, rx: 30, class: "wh-card" }));
        const [o0, o1] = R.out;

        // blue: airflow (CFM), faces the friction on the disc's blue edge
        base.appendChild(band(o0, o1, aQ(30) - 4, aQ(60000) + 4, "wh-blue"));
        scale(base, { values: ticks(30, 60000, FINE), labels: ticks(30, 60000, LBL), angle: aQ, rLine: o0, dir: 1, rText: o0 + 27, isMajor: v => rank(v) <= 2, fmt: num });
        tab(base, "AIR VOLUME – CFM", o1 + 16, aQ(1000), 30);

        // orange: airflow (CFM), faces the velocity on the disc's orange edge
        base.appendChild(band(o0, o1, eQ(200) - 4, eQ(40000) + 4, "wh-orange"));
        scale(base, { values: ticks(200, 40000, FINE), labels: ticks(200, 40000, LBL), angle: eQ, rLine: o0, dir: 1, rText: o0 + 27, isMajor: v => rank(v) <= 2, fmt: num });
        tab(base, "AIR VOLUME – CFM", o1 + 16, eQ(3000), 34);

        // green: rectangular side A (outer row)
        base.appendChild(band(o0, o1, GA[0] - 4, GA[1] + 4, "wh-green"));
        const sides = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 42, 48, 54, 60, 66, 72, 80, 90, 100];
        scale(base, { values: ticks(3, 100, [[1, 2, 0.1], [2, 5, 0.5], [5, 10, 1]]), labels: sides, angle: gA, rLine: o0, dir: 1, rText: o0 + 27, isMajor: v => v === Math.round(v), fmt: String });
        tab(base, "RECTANGULAR DUCT DIMENSIONS – INCHES", o1 + 16, (GA[0] + GA[1]) / 2, 62);

        // round duct size, printed on the card under the disc's window
        base.appendChild(band(R.win[0] - 4, R.win[1] + 4, dD(3) - 3, dD(100) + 3, "wh-fplate"));
        scale(base, { values: ticks(3, 100, [[1, 2, 0.1], [2, 5, 0.25], [5, 10, 0.5]]), labels: [3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 42, 44, 48, 54, 60, 66, 72, 80, 90, 100],
            angle: dD, rLine: R.win[1] - 2, dir: -1, len: 7, lenMajor: 13, rText: R.win[1] - 26, isMajor: v => v === Math.round(v), fmt: String, cls: "wh-num wh-num-d" });

        base.appendChild(el("text", { x: 30, y: H - 34, class: "wh-brand" }, "DUCTWORK PRO"));
        base.appendChild(el("text", { x: 30, y: H - 17, class: "wh-small" }, "Galvanized round duct, standard air (ASHRAE friction chart)"));
    }

    // ---------- the disc ----------
    function discFace() {
        const r = R.disc, [w0, w1] = R.win, wa = R.winA;
        const circle = `M${CX - r} ${CY}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
        const [x0, y0] = pt(w1, P - wa), [x1, y1] = pt(w1, P + wa), [x2, y2] = pt(w0, P + wa), [x3, y3] = pt(w0, P - wa);
        return el("path", { d: circle + `M${x0} ${y0}A${w1} ${w1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${w0} ${w0} 0 0 0 ${x3} ${y3}Z`, "fill-rule": "evenodd", class: "wh-disc" });
    }

    function textBlock(g, x, y, lines) {
        let yy = y;
        for (const [cls, text, gap] of lines) {
            if (text) g.appendChild(el("text", { x, y: yy, class: cls }, text));
            yy += gap;
        }
    }

    function drawDisc() {
        disc.appendChild(discFace());
        const [w0, w1] = R.win, wa = R.winA;

        // blue edge: friction rate
        disc.appendChild(band(R.rim, R.disc, bF(0.01) - 4, bF(10) + 4, "wh-blue"));
        scale(disc, { values: ticks(0.01, 10, [[1, 2, 0.1], [2, 5, 0.25], [5, 10, 0.5]]), labels: [0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2, 3, 4, 5, 6, 8, 10],
            angle: bF, rLine: R.disc, dir: -1, len: 8, lenMajor: 14, rText: R.disc - 26, isMajor: v => rank(v) <= 2, fmt: dec });
        tab(disc, "FRICTION LOSS – IN. W.G. / 100 FT", R.rim - 12, bF(0.2), 60, true);

        // orange edge: velocity
        disc.appendChild(band(R.rim, R.disc, vV(300) - 4, vV(12000) + 4, "wh-orange"));
        scale(disc, { values: ticks(300, 12000, FINE), labels: ticks(300, 12000, LBL), angle: vV, rLine: R.disc, dir: -1, len: 8, lenMajor: 14, rText: R.disc - 26, isMajor: v => rank(v) <= 2, fmt: num });
        tab(disc, "VELOCITY – FPM", R.rim - 12, vV(1800), 24, true);

        // round duct window, frame, label and arrow
        disc.appendChild(el("path", { d: arcPath(w1, P - wa, P + wa) + arcPath(w0, P - wa, P + wa), class: "wh-winframe" }));
        tab(disc, "ROUND DUCT DIAMETER – INCHES", w1 + 22, P - 3, 54, true);
        const [hx, hy] = pt(w0 - 3, P);
        disc.appendChild(el("path", { d: `M${hx} ${hy}l-18 -11v6h-16v10h16v6z`, class: "wh-index-head", transform: `rotate(${P - 90} ${hx} ${hy})` }));

        // title and how-to (own wording)
        const x = CX - 150;
        disc.appendChild(el("text", { x: CX + 12, y: CY - 172, class: "wh-title2", "text-anchor": "middle" }, "Air Duct Calculator"));
        disc.appendChild(el("text", { x: CX + 12, y: CY - 145, class: "wh-sub", "text-anchor": "middle" }, "ENGLISH UNITS"));
        textBlock(disc, x - 12, CY - 116, [
            ["wh-step", "Airflow, friction rate, velocity and duct size are tied together:", 13],
            ["wh-step", "set any two and read the rest off the matching scales.", 21],
            ["wh-step-h", "How to use", 14],
            ["wh-step", "1. Turn the disc until your airflow (CFM) lines up with your", 13],
            ["wh-step", "    friction rate on the blue scales.", 14],
            ["wh-step", "2. Read the round duct size at the arrow in the window.", 14],
            ["wh-step", "3. Read the velocity on the orange scale opposite the airflow.", 14],
            ["wh-step", "4. Read rectangular sizes on the green: each outer size pairs", 13],
            ["wh-step", "    with the inner size beside it (same friction as the round).", 0]
        ]);
        textBlock(disc, x - 12, CY + 92, [
            ["wh-step-h", "Notes", 14],
            ["wh-step", "• Round sizes are galvanized duct, standard air.", 13],
            ["wh-step", "• Rectangular sizes give the same friction as the", 13],
            ["wh-step", "  round size (equal friction), not just the same area.", 0]
        ]);
        disc.appendChild(el("circle", { cx: CX + 8, cy: CY + 44, r: 11, class: "wh-pivot" }));
        disc.appendChild(el("circle", { cx: CX + 8, cy: CY + 44, r: 5, class: "wh-pivot" }));
    }

    // inner green row: the side that pairs with each outer size for the round size in the window
    function rectB(a, D) {
        const de = (x, y) => (1.30 * (x * y) ** 0.625) / (x + y) ** 0.25;
        if (de(a, 400) < D) return null;
        let lo = 0.5, hi = 400;
        if (de(a, lo) > D) return null;
        for (let i = 0; i < 50; i += 1) { const m = (lo + hi) / 2; if (de(a, m) < D) lo = m; else hi = m; }
        return hi;
    }
    function drawGreenRow(D) {
        greenRow.replaceChildren();
        const [g0, g1] = R.green;
        greenRow.appendChild(band(g0, g1, GA[0] - 4, GA[1] + 4, "wh-green wh-green-in"));
        const sides = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28, 30, 36, 40, 48, 54, 60, 72, 80, 90, 100];
        const taken = [];
        const step = typeof rectSizeStep === "function" ? rectSizeStep() : 1;
        for (const a of sides) {
            if (a % step) continue;
            const exact = rectB(a, D);
            if (!exact) continue;
            // the matching side, rounded up to the step so friction stays at or below
            const b = Math.max(step, Math.ceil(exact / step - 1e-9) * step);
            if (b < 3 || b > 120 || Math.max(a, b) / Math.min(a, b) > 4.01) continue;
            const ang = gA(a);
            const text = String(b);
            const half = ((text.length * 7 + 6) / 2 / (g1 - 20)) * 180 / Math.PI;
            if (taken.some(([x, h]) => Math.abs(ang - x) < half + h)) continue;
            taken.push([ang, half]);
            const [x0, y0] = pt(g1, ang), [x1, y1] = pt(g1 - 10, ang);
            greenRow.appendChild(el("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: "wh-tk wh-tk-major" }));
            const [tx, ty] = pt(g1 - 22, ang);
            const up = Math.cos(rad(ang)) >= -0.25;
            greenRow.appendChild(el("text", { x: tx, y: ty, class: "wh-num", transform: `rotate(${up ? norm(ang) : norm(ang) + 180} ${tx} ${ty})`, "text-anchor": "middle", "dominant-baseline": "central" }, text));
        }
    }

    // ---------- reading hairline ----------
    const hairLine = el("line", { class: "wh-hair" });
    const hairGrip = el("circle", { r: 14, class: "wh-hair-grip", "data-grip": "1" });
    over.append(hairLine, hairGrip);

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
    // same rule as the calculator's list (rectangle.js)
    function rectList(D) {
        if (typeof rectanglesForRound !== "function") return "";
        return rectanglesForRound(D, { count: 4 }).map(o => `${o.width} × ${o.height}`).join(", ");
    }
    const f2 = v => (v == null ? "—" : v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : v.toFixed(v < 1 ? 3 : 2));

    // ---------- clicks: a tick at every 1/2" of round size ----------
    let audio = null;
    const soundOn = () => document.getElementById("whClick")?.checked !== false;
    function click() {
        if (navigator.vibrate) { try { navigator.vibrate(6); } catch (e) { /* not allowed */ } }
        if (!soundOn()) return;
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            const t = audio.currentTime;
            const len = Math.floor(audio.sampleRate * 0.012);
            const buf = audio.createBuffer(1, len, audio.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
            const src = audio.createBufferSource();
            const bp = audio.createBiquadFilter();
            const gain = audio.createGain();
            bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 1.2;
            gain.gain.value = 0.35;
            src.buffer = buf;
            src.connect(bp).connect(gain).connect(audio.destination);
            src.start(t);
        } catch (e) { /* no audio */ }
    }
    const notch = D => Math.round(D * 2);   // half-inch steps
    let lastNotch = null;

    const hairOn = () => !!document.getElementById("whHair")?.checked;

    let lastD = null;
    function update() {
        disc.setAttribute("transform", `rotate(${phi} ${CX} ${CY})`);
        const D = roundOf(phi);
        if (lastD === null || Math.abs(D - lastD) > 0.01) { drawGreenRow(D); lastD = D; }
        const n = notch(D);
        if (drag && drag.kind === "disc" && lastNotch !== null && n !== lastNotch) click();
        lastNotch = n;
        const field = document.getElementById("whRoundInput");
        if (field && document.activeElement !== field) field.value = (Math.round(D * 16) / 16).toFixed(D < 10 ? 2 : 1).replace(/\.?0+$/, "");
        over.style.display = hairOn() ? "" : "none";
        document.querySelectorAll(".wh-hair-row").forEach(r => { r.hidden = !hairOn(); });

        const [hx0, hy0] = pt(R.rim - 4, hair), [hx1, hy1] = pt(R.out[1] + 4, hair);
        hairLine.setAttribute("x1", hx0); hairLine.setAttribute("y1", hy0);
        hairLine.setAttribute("x2", hx1); hairLine.setAttribute("y2", hy1);
        const [gx, gy] = pt(R.out[1] - 4, hair);
        hairGrip.setAttribute("cx", gx); hairGrip.setAttribute("cy", gy);

        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set("whRound", `${f2(D)}"`);
        const qB = inv(aQ, norm(hair), 30, 60000);
        const fr = inv(bF, norm(hair - phi), 0.01, 10);
        const qO = inv(eQ, ((hair % 360) + 360) % 360, 200, 40000);
        const vel = inv(vV, norm(hair - phi), 300, 12000);
        set("whQBlue", qB ? `${f2(qB)} CFM` : "—");
        set("whFr", fr ? `${f2(fr)}"` : "—");
        set("whQOr", qO ? `${f2(qO)} CFM` : "—");
        set("whVel", vel ? `${f2(vel)} FPM` : "—");
        set("whRect", rectList(D) || "—");
    }

    // ---------- interaction ----------
    const angleAt = e => {
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * W - CX;
        const y = ((e.clientY - r.top) / r.height) * H - CY;
        return { a: (Math.atan2(x, -y) * 180) / Math.PI, r: Math.hypot(x, y) };
    };
    const clampPhi = v => Math.max(phiOf(3), Math.min(phiOf(100), v));
    let drag = null, frame = 0;
    const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };

    svg.addEventListener("pointerdown", e => {
        const { a, r } = angleAt(e);
        if (e.target.dataset && e.target.dataset.grip) drag = { kind: "hair" };
        else if (r <= R.disc) drag = { kind: "disc", a, phi };
        else if (hairOn() && r <= R.out[1] + 10) { drag = { kind: "hair" }; hair = a; later(); }
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
    // letting go settles the disc onto the nearest 1/2" when it's close (a detent)
    const end = () => {
        if (drag && drag.kind === "disc") {
            const D = roundOf(phi), Dn = Math.round(D * 2) / 2;
            if (Math.abs(D - Dn) < 0.12) settle(clampPhi(phiOf(Dn)));
        }
        drag = null;
    };
    function settle(target) {
        const from = phi, t0 = performance.now();
        const stepF = now => {
            const k = Math.min(1, (now - t0) / 120);
            phi = from + (target - from) * (1 - (1 - k) ** 3);
            update();
            if (k < 1) requestAnimationFrame(stepF);
        };
        requestAnimationFrame(stepF);
    }
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

    // Round size field: type a size and the disc turns to it.
    const roundField = document.getElementById("whRoundInput");
    const fromField = () => {
        const D = (window.DC && DC.parse) ? DC.parse(roundField.value) : parseFloat(roundField.value);
        if (!(D >= 3 && D <= 100)) return;
        settle(clampPhi(phiOf(D)));
    };
    roundField?.addEventListener("change", fromField);
    roundField?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); fromField(); roundField.blur(); } });
    document.getElementById("whHair")?.addEventListener("change", update);
    // 1" / 2" steps: redraw the wheel's pairs and recalculate the calculator
    document.getElementById("rectStep")?.addEventListener("change", () => {
        lastD = null;
        update();
        if (typeof updateCalculator === "function") updateCalculator();
    });

    // Line the wheel up with the calculator's airflow and friction.
    document.getElementById("whFromInputs")?.addEventListener("click", () => {
        const Q = Number(document.getElementById("cfmInput")?.value);
        const f = Number(document.getElementById("frictionInput")?.value) || 0.08;
        if (!(Q > 0)) return;
        phi = clampPhi(aQ(Q) - bF(f));
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

    window.DuctWheel = {
        aQ, bF, eQ, vV, dD, phiOf, roundOf,
        get phi() { return phi; }, set phi(v) { phi = v; update(); },
        get hair() { return hair; }, set hair(v) { hair = v; update(); }
    };
})();
