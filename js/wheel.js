// =====================================================
// DUCTWORK PRO
// wheel.js
// Manual duct sizing wheel (slide-rule style) on the Airflow screen.
//
// How it works: every scale is logarithmic, so the friction equation
//   f = 0.109136 · Q^1.9 / D^5.02       (in. w.c. per 100 ft, CFM, inches)
// and the velocity equation
//   V = Q / (π D² / 576) = 183.346 · Q / D²
// turn into straight additions of angles.
//
//   blue, base (outer):  airflow       aQ(Q) = A0 + 1.9·c·log Q
//   blue, disc rim:      friction      bf(f) = B0 + c·log f        (+ disc turn φ)
//   lining Q up with f sets φ = K + c·(5.02·log D − log 0.109136), K = A0 − B0,
//   so the round size is read at a fixed arrow from a scale on the disc:
//   disc middle:         round size    d(D)  = P − φ(D)
//   red, disc inner rim: airflow       e(Q)  = E0 + α·log Q         (+ φ)
//   red, base (inner):   velocity      g(V)  = G0 + α·log V
//   with α = −2.51·c and G0 = E0 + K − c·log 0.109136 − α·log 183.346,
//   so e(Q) + φ(D) = g(V(Q, D)) for every Q and D.
// =====================================================

(function () {
    "use strict";

    const root = document.getElementById("afWheel");
    const svg = document.getElementById("wheelSvg");
    if (!root || !svg) return;

    const NS = "http://www.w3.org/2000/svg";
    const CX = 320, CY = 320;
    const c = 40;                       // degrees per decade (friction scale)
    const LOG_K = Math.log10(0.109136);
    const LOG_V = Math.log10(183.346);
    const A0 = -1.9 * c * 3.35;         // centers 50–100,000 CFM on the top
    const B0 = A0 + c * (5.02 * Math.log10(12) - LOG_K); // 12" round at no turn
    const K = A0 - B0;
    const P = 180;                      // round-size arrow at the bottom
    const alpha = -2.51 * c;
    const E0 = -alpha * 3.5;
    const G0 = E0 + K - c * LOG_K - alpha * LOG_V;

    const R = { out: 312, blueIn: 262, frIn: 236, dIn: 186, redIn: 150, velIn: 110 };

    let phi = 0;                        // disc turn, degrees clockwise
    let hair = -40;                     // hairline angle

    const rad = d => (d * Math.PI) / 180;
    const pt = (r, a) => [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))];
    const norm = a => ((a % 360) + 540) % 360 - 180;

    const roundOf = ph => 10 ** (((ph - K) / c + LOG_K) / 5.02);
    const phiOf = D => K + c * (5.02 * Math.log10(D) - LOG_K);

    // the value of a log scale under angle a (scale: angle = a0 + k·log v)
    function valueAt(a, a0, k, lo, hi) {
        for (const turn of [0, 360, -360, 720, -720]) {
            const lg = (a + turn - a0) / k;
            const v = 10 ** lg;
            if (v >= lo * 0.999 && v <= hi * 1.001) return v;
        }
        return null;
    }

    function ticks(lo, hi) {
        const out = [];
        for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e += 1) {
            const p = 10 ** e;
            for (let m = 1; m < 10; m = Math.round((m + (m < 2 ? 0.1 : m < 5 ? 0.2 : 0.5)) * 10) / 10) {
                const v = m * p;
                if (v < lo * 0.999 || v > hi * 1.001) continue;
                const major = [1, 1.5, 2, 3, 4, 5, 6, 8].includes(m);
                const mid = !major && (m === Math.round(m) || m === 2.5);
                out.push({ v, major, mid });
            }
        }
        return out;
    }

    const fmtV = v => {
        if (v >= 1000) return (v / 1000).toFixed(v % 1000 ? 1 : 0).replace(/\.0$/, "") + "k";
        if (v >= 1) return String(Math.round(v * 10) / 10);
        return String(+v.toPrecision(2)).replace(/^0\./, ".");
    };

    function el(name, attrs, text) {
        const node = document.createElementNS(NS, name);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        if (text != null) node.textContent = text;
        return node;
    }

    // an arc band between radii r0 and r1 from angle a0 to a1
    function band(r0, r1, a0, a1, cls) {
        if (a1 - a0 >= 359.9) {
            return el("path", { class: cls, "fill-rule": "evenodd", d:
                `M${CX - r1} ${CY}a${r1} ${r1} 0 1 0 ${2 * r1} 0a${r1} ${r1} 0 1 0 ${-2 * r1} 0Z` +
                `M${CX - r0} ${CY}a${r0} ${r0} 0 1 0 ${2 * r0} 0a${r0} ${r0} 0 1 0 ${-2 * r0} 0Z` });
        }
        const big = a1 - a0 > 180 ? 1 : 0;
        const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
        return el("path", { class: cls, d: `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z` });
    }

    // a log scale: ticks grow from the edge at radius rEdge toward `dir` (+1 out, −1 in)
    function scale(g, { lo, hi, a0, k, rEdge, dir, turn = 0, label = fmtV, labelR, size = NUM }) {
        let lastA = null, lastW = 0;
        // label the round numbers first so crowding drops the in-between ones
        const order = ticks(lo, hi).filter(t => t.major).sort((p, q) => rank(p.v) - rank(q.v));
        const shown = new Set();
        const taken = [];
        for (const t of order) {
            const a = a0 + k * Math.log10(t.v) + turn;
            const half = ((label(t.v).length * size * 0.55 + 6) / 2 / labelR) * 180 / Math.PI;
            if (taken.some(([b, h]) => Math.abs(norm(a - b)) < half + h)) continue;
            taken.push([a, half]);
            shown.add(t.v);
        }
        for (const t of ticks(lo, hi)) {
            const a = a0 + k * Math.log10(t.v) + turn;
            const len = t.major ? 12 : t.mid ? 8 : 5;
            const [x0, y0] = pt(rEdge, a), [x1, y1] = pt(rEdge + dir * len, a);
            g.appendChild(el("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: t.major ? "wh-tk wh-tk-major" : "wh-tk" }));
            if (t.major && shown.has(t.v)) {
                const [tx, ty] = pt(labelR, a);
                const up = Math.cos(rad(norm(a))) >= -0.17;   // keep text upright
                const rot = up ? norm(a) : norm(a) + 180;
                g.appendChild(el("text", { x: tx, y: ty, class: "wh-num", transform: `rotate(${rot} ${tx} ${ty})`, "text-anchor": "middle", "dominant-baseline": "central" }, label(t.v)));
            }
        }
    }

    // labeling priority: 1s, then 2s and 5s, then the rest
    function rank(v) {
        const m = Math.round((v / 10 ** Math.floor(Math.log10(v) + 1e-9)) * 10) / 10;
        return m === 1 ? 0 : m === 2 || m === 5 ? 1 : m === 3 ? 2 : 3;
    }

    function arcText(g, text, r, a, cls) {
        const [x, y] = pt(r, a);
        const up = Math.cos(rad(norm(a))) >= 0;
        g.appendChild(el("text", { x, y, class: cls, transform: `rotate(${up ? norm(a) : norm(a) + 180} ${x} ${y})`, "text-anchor": "middle", "dominant-baseline": "central" }, text));
    }

    // equivalent rectangular sizes for a round size (Huebscher)
    function rectFor(D) {
        const de = (a, b) => (1.30 * (a * b) ** 0.625) / (a + b) ** 0.25;
        const out = [];
        for (const b of [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36, 42, 48]) {
            if (de(b, b) > D * 1.001) break;
            let lo = b, hi = 400;
            if (de(hi, b) < D) continue;
            for (let i = 0; i < 50; i += 1) { const m = (lo + hi) / 2; if (de(m, b) < D) lo = m; else hi = m; }
            const a = Math.ceil(hi - 0.05);
            if (a / b <= 4.01) out.push([a, b]);
        }
        return out.reverse().slice(0, 6).reverse();
    }

    const f2 = v => (v == null ? "—" : v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : v.toFixed(v < 1 ? 3 : 2));

    let NUM = 11;   // label size (bigger on phones)

    function render() {
        const small = (svg.clientWidth || 640) < 480;
        NUM = small ? 17 : 11;
        svg.classList.toggle("wh-small", small);
        svg.replaceChildren();
        const base = el("g", {}), disc = el("g", { class: "wh-disc" }), top = el("g", {});

        // ---- base card ----
        base.appendChild(el("rect", { x: 4, y: 4, width: 632, height: 632, rx: 22, class: "wh-card" }));
        const qLo = 50, qHi = 100000, qa0 = A0 + 1.9 * c * Math.log10(qLo) - 4, qa1 = A0 + 1.9 * c * Math.log10(qHi) + 4;
        base.appendChild(band(R.blueIn, R.out, qa0, qa1, "wh-blue"));
        scale(base, { lo: qLo, hi: qHi, a0: A0, k: 1.9 * c, rEdge: R.blueIn, dir: 1, labelR: R.blueIn + 26 });
        arcText(base, "AIRFLOW · CFM", R.out - 10, 0, "wh-cap");
        const vLo = 100, vHi = 10000;
        const va = [G0 + alpha * Math.log10(vHi) - 4, G0 + alpha * Math.log10(vLo) + 4];
        base.appendChild(band(R.velIn, R.redIn, Math.min(...va), Math.max(...va), "wh-red"));
        scale(base, { lo: vLo, hi: vHi, a0: G0, k: alpha, rEdge: R.redIn, dir: -1, labelR: R.redIn - 24 });
        arcText(base, "FPM", R.redIn - 22, G0 + alpha * Math.log10(vLo) + 12, "wh-cap wh-cap-sm");
        base.appendChild(el("circle", { cx: CX, cy: CY, r: R.velIn, class: "wh-green" }));

        // ---- disc (annulus) ----
        disc.appendChild(band(R.redIn, R.blueIn, 0, 360, "wh-discface"));
        const fLo = 0.01, fHi = 10;
        const fa = [B0 + c * Math.log10(fLo) + phi - 4, B0 + c * Math.log10(fHi) + phi + 4];
        disc.appendChild(band(R.frIn, R.blueIn, fa[0], fa[1], "wh-blue-lt"));
        scale(disc, { lo: fLo, hi: fHi, a0: B0, k: c, rEdge: R.blueIn, dir: -1, turn: phi, labelR: R.blueIn - 20 });
        arcText(disc, "IN. W.C./100 FT", R.blueIn - 13, B0 + c * Math.log10(fHi) + phi + 22, "wh-cap wh-cap-sm");
        // round size scale, read at the arrow
        const dLo = 3, dHi = 100;
        for (const t of ticks(dLo, dHi)) {
            const a = P - phiOf(t.v) + phi;
            const len = t.major ? 14 : t.mid ? 9 : 5;
            const [x0, y0] = pt(R.frIn - 4, a), [x1, y1] = pt(R.frIn - 4 - len, a);
            disc.appendChild(el("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: t.major ? "wh-tk wh-tk-major" : "wh-tk" }));
            if (t.major || (t.v >= 4 && t.v <= 40 && t.v === Math.round(t.v) && t.mid)) {
                const [tx, ty] = pt(R.frIn - 30, a);
                const up = Math.cos(rad(norm(a))) >= -0.17;
                disc.appendChild(el("text", { x: tx, y: ty, class: t.major ? "wh-num wh-num-d" : "wh-num wh-num-dm", transform: `rotate(${up ? norm(a) : norm(a) + 180} ${tx} ${ty})`, "text-anchor": "middle", "dominant-baseline": "central" }, String(t.v)));
            }
        }

        const qrLo = 100, qrHi = 100000;
        const qr = [E0 + alpha * Math.log10(qrHi) + phi - 4, E0 + alpha * Math.log10(qrLo) + phi + 4];
        disc.appendChild(band(R.redIn, R.redIn + 26, Math.min(...qr), Math.max(...qr), "wh-red-lt"));
        scale(disc, { lo: qrLo, hi: qrHi, a0: E0, k: alpha, rEdge: R.redIn, dir: 1, turn: phi, labelR: R.redIn + 20 });
        arcText(disc, "CFM", R.redIn + 13, E0 + alpha * Math.log10(qrLo) + phi + 10, "wh-cap wh-cap-sm");

        // ---- fixed overlay: round-size window + arrow ----
        arcText(top, "ROUND DUCT · IN.", R.blueIn + 22, P, "wh-cap");
        top.appendChild(band(R.dIn - 2, R.frIn - 2, P - 9, P + 9, "wh-window"));
        const [ax0, ay0] = pt(R.dIn - 6, P), [ax1, ay1] = pt(R.frIn, P);
        top.appendChild(el("line", { x1: ax0, y1: ay0, x2: ax1, y2: ay1, class: "wh-arrow" }));
        const [px, py] = pt(R.dIn - 6, P);
        top.appendChild(el("path", { d: `M${px} ${py}l-7 11h14z`, class: "wh-arrow-head" }));

        // center readout
        const D = roundOf(phi);
        const sm = NUM > 11;
        top.appendChild(el("text", { x: CX, y: CY - (sm ? 80 : 70), class: "wh-c-lab", "text-anchor": "middle" }, "ROUND"));
        top.appendChild(el("text", { x: CX, y: CY - (sm ? 48 : 44), class: "wh-c-big", "text-anchor": "middle" }, `${D.toFixed(1)}"`));
        top.appendChild(el("text", { x: CX, y: CY - (sm ? 20 : 20), class: "wh-c-lab", "text-anchor": "middle" }, "RECTANGULAR"));
        rectFor(D).slice(-(sm ? 4 : 6)).forEach(([a, b], i) => {
            top.appendChild(el("text", { x: CX, y: CY + (sm ? 6 : 2) + i * (sm ? 21 : 15), class: "wh-c-rect", "text-anchor": "middle" }, `${a} × ${b}`));
        });

        // ---- hairline ----
        const [hx0, hy0] = pt(R.velIn - 2, hair), [hx1, hy1] = pt(R.out + 2, hair);
        top.appendChild(el("line", { x1: hx0, y1: hy0, x2: hx1, y2: hy1, class: "wh-hair" }));
        const [gx, gy] = pt(R.out - 22, hair);
        top.appendChild(el("circle", { cx: gx, cy: gy, r: 13, class: "wh-hair-grip", "data-grip": "1" }));

        svg.append(base, disc, top);
        readout(D);
    }

    function readout(D) {
        const qBlue = valueAt(hair, A0, 1.9 * c, 50, 100000);
        const fr = valueAt(hair - phi, B0, c, 0.01, 10);
        const qRed = valueAt(hair - phi, E0, alpha, 100, 100000);
        const vel = valueAt(hair, G0, alpha, 100, 10000);
        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set("whRound", `${D.toFixed(1)}"`);
        set("whQBlue", qBlue ? `${f2(qBlue)} CFM` : "—");
        set("whFr", fr ? `${f2(fr)}"` : "—");
        set("whQRed", qRed ? `${f2(qRed)} CFM` : "—");
        set("whVel", vel ? `${f2(vel)} FPM` : "—");
    }

    // ---- interaction ----
    const angleAt = e => {
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 640 - CX;
        const y = ((e.clientY - r.top) / r.height) * 640 - CY;
        return { a: (Math.atan2(x, -y) * 180) / Math.PI, r: Math.hypot(x, y) };
    };
    let drag = null;
    let frame = 0;
    const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); }); };

    svg.addEventListener("pointerdown", e => {
        const { a, r } = angleAt(e);
        if (e.target.dataset && e.target.dataset.grip) drag = { kind: "hair" };
        else if (r >= R.redIn && r <= R.blueIn) drag = { kind: "disc", a, phi };
        else if (r > R.velIn) drag = { kind: "hair" };
        else return;
        svg.setPointerCapture(e.pointerId);
        if (drag.kind === "hair") { hair = a; later(); }
        e.preventDefault();
    });
    svg.addEventListener("pointermove", e => {
        if (!drag) return;
        const { a } = angleAt(e);
        if (drag.kind === "hair") hair = a;
        else phi = drag.phi + norm(a - drag.a);
        // keep the disc inside its range (round sizes 3"–100")
        phi = Math.max(phiOf(3), Math.min(phiOf(100), phi));
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
        if (e.altKey) hair += k * 4;
        else phi = Math.max(phiOf(3), Math.min(phiOf(100), phi + k));
        render();
    });

    // Line the wheel up with the calculator's airflow and friction.
    document.getElementById("whFromInputs")?.addEventListener("click", () => {
        const Q = Number(document.getElementById("cfmInput")?.value);
        const f = Number(document.getElementById("frictionInput")?.value) || 0.08;
        if (!(Q > 0)) return;
        const D = (0.109136 * Q ** 1.9 / f) ** (1 / 5.02);
        phi = Math.max(phiOf(3), Math.min(phiOf(100), phiOf(D)));
        hair = norm(A0 + 1.9 * c * Math.log10(Q));
        render();
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
            if (wheel) render();
        });
    });

    phi = phiOf(12);
    render();

    // for checks
    window.DuctWheel = { roundOf, phiOf, get phi() { return phi; }, set phi(v) { phi = v; render(); }, get hair() { return hair; }, set hair(v) { hair = v; render(); }, A0, B0, E0, G0, alpha, c, valueAt };
})();
