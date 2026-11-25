// =====================================================
// DUCTCULATOR PRO
// fittingViews.js
// Live 3D views for Round Fittings and Rect Fittings.
//
// Each fitting is swept along its true centerline as a solid
// (round or rectangular section), shaded, and drawn with
// dimension lines. Round elbows are built gore by gore and
// mitered joints are true miters, so the drawing matches the
// part you fabricate. Drag the view to turn it.
// =====================================================

(function () {
    "use strict";

    const DC = window.DC;
    const NS = "http://www.w3.org/2000/svg";
    const rad = d => d * Math.PI / 180;

    // ---------- vectors ----------
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
    const norm = a => {
        const l = Math.hypot(a[0], a[1], a[2]) || 1;
        return [a[0] / l, a[1] / l, a[2] / l];
    };

    // =====================================================
    // 2D centerline builder (plane coordinates):
    //   x = along the run, y = toward the offset.
    // =====================================================

    function Path(x = 0, y = 0, headingDeg = 0) {
        const pts = [{ x, y, joint: true }];
        const marks = {};
        let h = rad(headingDeg);
        let cx = x;
        let cy = y;

        const api = {
            points: pts,
            marks,
            heading: () => h,
            here: () => [cx, cy],
            mark(name) {
                marks[name] = { x: cx, y: cy, h };
                return api;
            },
            line(length, joint = false) {
                if (length > 1e-6) {
                    cx += length * Math.cos(h);
                    cy += length * Math.sin(h);
                    pts.push({ x: cx, y: cy, joint });
                }
                return api;
            },
            // Smooth arc: turn > 0 bends toward +y (left).
            arc(R, turnDeg, segments = 28) {
                const turn = rad(turnDeg);
                const side = Math.sign(turn) || 1;
                const ox = cx - side * R * Math.sin(h);
                const oy = cy + side * R * Math.cos(h);
                const start = Math.atan2(cy - oy, cx - ox);

                for (let i = 1; i <= segments; i += 1) {
                    const a = start + (turn * i) / segments;
                    pts.push({ x: ox + R * Math.cos(a), y: oy + R * Math.sin(a), joint: i === segments });
                }

                h += turn;
                cx = pts[pts.length - 1].x;
                cy = pts[pts.length - 1].y;
                marks._center = { x: ox, y: oy };
                return api;
            },
            // Gored elbow: two half end gores and n-2 full gores.
            gored(R, turnDeg, n) {
                const total = rad(turnDeg);
                const side = Math.sign(total) || 1;
                const m = Math.abs(total) / (2 * n - 2);
                const half = R * Math.tan(m);
                const ox = cx - side * R * Math.sin(h);
                const oy = cy + side * R * Math.cos(h);
                marks._center = { x: ox, y: oy };

                api.line(half, true);

                for (let i = 0; i < n - 2; i += 1) {
                    h += side * 2 * m;
                    api.line(2 * half, true);
                }

                h += side * 2 * m;
                api.line(half, true);
                return api;
            },
            // Sharp miter corner (straight elbow).
            corner(turnDeg) {
                pts[pts.length - 1].joint = true;
                h += rad(turnDeg);
                return api;
            }
        };

        return api;
    }

    // =====================================================
    // Sweep a section along a 2D path embedded in 3D.
    // plane: origin O, run axis X, offset axis U, normal Wn.
    // =====================================================

    function planeFor(rollDeg) {
        const r = rad(rollDeg || 0);
        const X = [1, 0, 0];
        const U = [0, Math.sin(r), Math.cos(r)];
        return { X, U, Wn: norm(cross(X, U)) };
    }

    function to3(plane, x, y, w = 0) {
        return add(add(mul(plane.X, x), mul(plane.U, y)), mul(plane.Wn, w));
    }

    /*
     * Break long straight runs into shorter pieces so the painter's
     * sort layers parts correctly (e.g. a tap sitting on a long main).
     */
    function densify(points, maxSeg) {
        const out = [points[0]];

        for (let i = 1; i < points.length; i += 1) {
            const a = points[i - 1];
            const b = points[i];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const n = Math.floor(len / maxSeg);

            for (let k = 1; k <= n; k += 1) {
                const t = k / (n + 1);
                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, joint: false, dense: true });
            }

            out.push(b);
        }

        return out;
    }

    /*
     * Ring where a branch meets the main's surface (a "tap").
     * Branch heading θ leaves the main centerline; for a point on the
     * branch section at (a, b) — a in the bend plane, b across it — the
     * distance s along the branch where it reaches the main surface is
     *   s = (ySurface(b) − a·cosθ) ÷ sinθ
     * ySurface = main half-width (rect) or √(R² − b²) (round saddle).
     */
    function tapRing(part, plane) {
        const t = part.tap;
        const th = rad(t.angle);
        const ring = [];
        const local = [];

        if (part.kind === "round") {
            const r = part.d / 2;
            for (let k = 0; k < 32; k += 1) {
                const q = (2 * Math.PI * k) / 32;
                local.push([r * Math.cos(q), r * Math.sin(q)]);
            }
        } else {
            const a = part.w / 2;
            const b = part.h / 2;
            local.push([a, b], [-a, b], [-a, -b], [a, -b]);
        }

        for (const [a, b] of local) {
            const ys = t.kind === "round"
                ? Math.sqrt(Math.max(0, t.half * t.half - b * b))
                : t.half;
            const sAlong = (ys - a * Math.cos(th)) / Math.sin(th);
            ring.push(to3(plane, sAlong * Math.cos(th) - a * Math.sin(th), sAlong * Math.sin(th) + a * Math.cos(th), b));
        }

        return ring;
    }

    function sweep(part, plane) {
        const round = part.kind === "round";
        let pts = densify(part.path, Math.max(round ? part.d : Math.max(part.w, part.h), 1) * 0.6);

        // Keep added pieces clear of the slanted tap cut.
        if (part.tap) {
            const th = rad(part.tap.angle);
            const s0 = Math.hypot(pts[0].x, pts[0].y);
            const reach = (part.tap.half + (round ? part.d / 2 : part.w / 2) * Math.abs(Math.cos(th))) / Math.sin(th) - s0;
            pts = pts.filter((p, i) => i === 0 || !p.dense || Math.hypot(p.x - pts[0].x, p.y - pts[0].y) > reach + 0.5);
        }
        const sections = [];
        const ringN = round ? 32 : 4;

        for (let i = 0; i < pts.length; i += 1) {
            const p = pts[i];
            const prev = pts[i - 1];
            const next = pts[i + 1];
            const tIn = prev ? norm([p.x - prev.x, p.y - prev.y, 0]) : null;
            const tOut = next ? norm([next.x - p.x, next.y - p.y, 0]) : null;
            const t2 = tIn && tOut ? norm(add(tIn, tOut)) : tIn || tOut;
            const cosHalf = tIn && tOut ? Math.max(0.2, dot(tIn, t2)) : 1;
            // In-plane normal of the miter (bisector) section.
            const n2 = [-t2[1], t2[0]];
            const c = to3(plane, p.x, p.y);
            const nIn = to3(plane, n2[0], n2[1]);
            const ring = [];

            if (round) {
                const r = part.d / 2;
                for (let k = 0; k < ringN; k += 1) {
                    const a = (2 * Math.PI * k) / ringN;
                    ring.push(add(c, add(mul(nIn, (r * Math.cos(a)) / cosHalf), mul(plane.Wn, r * Math.sin(a)))));
                }
            } else {
                const a = part.w / 2 / cosHalf;
                const b = part.h / 2;
                ring.push(add(c, add(mul(nIn, a), mul(plane.Wn, b))));
                ring.push(add(c, add(mul(nIn, -a), mul(plane.Wn, b))));
                ring.push(add(c, add(mul(nIn, -a), mul(plane.Wn, -b))));
                ring.push(add(c, add(mul(nIn, a), mul(plane.Wn, -b))));
            }

            sections.push({ c, ring: i === 0 && part.tap ? tapRing(part, plane) : ring, joint: p.joint || i === 0 || i === pts.length - 1, t3: to3(plane, t2[0], t2[1]) });
        }

        return sections;
    }

    // =====================================================
    // Render
    // =====================================================

    const views = {};

    function viewState(id) {
        if (!views[id]) {
            views[id] = { yaw: -32, pitch: 22, scene: null };
        }
        return views[id];
    }

    function camera(state) {
        const cy = Math.cos(rad(state.yaw));
        const sy = Math.sin(rad(state.yaw));
        const cp = Math.cos(rad(state.pitch));
        const sp = Math.sin(rad(state.pitch));

        // Rz(yaw) then Rx(pitch). View space: x right, y into screen, z up.
        return v => {
            const x1 = v[0] * cy - v[1] * sy;
            const y1 = v[0] * sy + v[1] * cy;
            const z1 = v[2];
            return [x1, y1 * cp - z1 * sp, y1 * sp + z1 * cp];
        };
    }

    const LIGHT = norm([-0.45, -0.75, 0.6]);
    const TONES = {
        main: { dark: [30, 38, 45], light: [128, 150, 165] },
        fitting: { dark: [26, 48, 60], light: [118, 186, 216] }
    };

    function shade(tone, n) {
        const d = Math.max(0, dot(n, LIGHT));
        const k = 0.28 + 0.72 * d;
        const c = tone.dark.map((v, i) => Math.round(v + (tone.light[i] - v) * k));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    }

    function el(tag, attrs = {}, text) {
        const node = document.createElementNS(NS, tag);
        for (const [key, value] of Object.entries(attrs)) {
            node.setAttribute(key, value);
        }
        if (text != null) {
            node.textContent = text;
        }
        return node;
    }

    function render(viewId, scene) {
        const root = DC.get(viewId);
        const svg = root?.querySelector("svg");

        if (!svg) {
            return;
        }

        const state = viewState(viewId);
        state.scene = scene;
        root.classList.remove("is-empty");
        const msg = root.querySelector(".live-view-msg");
        if (msg) msg.hidden = true;

        const plane = planeFor(scene.roll);
        const cam = camera(state);
        const items = [];
        const pts2 = [];
        const P = v => {
            const q = cam(v);
            return [q[0], -q[2], q[1]];
        };

        for (const part of scene.parts) {
            const tone = TONES[part.tone || "fitting"];
            const S = sweep(part, plane);
            const N = S[0].ring.length;
            const round = part.kind === "round";

            // visibility per quad, to draw silhouettes and joint rings
            const vis = [];

            for (let i = 0; i < S.length - 1; i += 1) {
                vis[i] = [];
                const axis = norm(sub(S[i + 1].c, S[i].c));

                for (let k = 0; k < N; k += 1) {
                    const k2 = (k + 1) % N;
                    const quad = [S[i].ring[k], S[i].ring[k2], S[i + 1].ring[k2], S[i + 1].ring[k]];
                    const mid = mul(add(add(quad[0], quad[1]), add(quad[2], quad[3])), 0.25);
                    let n = norm(cross(sub(quad[1], quad[0]), sub(quad[3], quad[0])));
                    const centerMid = mul(add(S[i].c, S[i + 1].c), 0.5);
                    const radial = sub(mid, centerMid);
                    const out = sub(radial, mul(axis, dot(radial, axis)));
                    if (dot(n, out) < 0) n = mul(n, -1);
                    const nv = cam(n);
                    const visible = nv[1] < 1e-6;
                    vis[i][k] = visible;

                    if (!visible) continue;

                    const sp = quad.map(P);
                    sp.forEach(p => pts2.push(p));
                    const fill = shade(tone, nv);
                    items.push({
                        z: sp.reduce((s, p) => s + p[2], 0) / 4,
                        node: el("polygon", {
                            points: sp.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" "),
                            fill,
                            stroke: fill,
                            "stroke-width": "0.6",
                            "stroke-linejoin": "round"
                        })
                    });
                }
            }

            const line = (a, b, cls, z) => {
                const pa = P(a);
                const pb = P(b);
                items.push({
                    z: (z ?? (pa[2] + pb[2]) / 2) - 0.6,
                    node: el("line", { x1: pa[0].toFixed(2), y1: pa[1].toFixed(2), x2: pb[0].toFixed(2), y2: pb[1].toFixed(2), class: cls })
                });
            };

            // silhouettes (round) / real edges (rect)
            for (let i = 0; i < S.length - 1; i += 1) {
                for (let k = 0; k < N; k += 1) {
                    const before = vis[i][(k - 1 + N) % N];
                    const after = vis[i][k];
                    const edge = round ? before !== after : before || after;
                    if (edge) line(S[i].ring[k], S[i + 1].ring[k], "fv-edge");
                }
            }

            // joint rings: gore seams, miters, elbow ends
            for (let i = 0; i < S.length; i += 1) {
                if (!S[i].joint) continue;
                for (let k = 0; k < N; k += 1) {
                    const k2 = (k + 1) % N;
                    const near = (vis[i - 1] && vis[i - 1][k]) || (vis[i] && vis[i][k]);
                    if (near) line(S[i].ring[k], S[i].ring[k2], i === 0 || i === S.length - 1 ? "fv-edge" : "fv-seam");
                }
            }

            // end caps
            for (const [i, sign] of [[0, -1], [S.length - 1, 1]]) {
                if (i === 0 && part.tap) continue;
                const nCap = norm(mul(norm(sub(S[i === 0 ? 1 : i].c, S[i === 0 ? 0 : i - 1].c)), sign));
                const nv = cam(nCap);
                if (nv[1] >= 0) continue;
                const sp = S[i].ring.map(P);
                sp.forEach(p => pts2.push(p));
                const fill = shade(TONES.main, nv);
                items.push({
                    z: sp.reduce((s, p) => s + p[2], 0) / sp.length,
                    node: el("polygon", {
                        points: sp.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" "),
                        fill,
                        stroke: "var(--cyan)",
                        "stroke-width": "1.2",
                        class: "fv-cap"
                    })
                });
            }
        }

        items.sort((a, b) => b.z - a.z);

        svg.replaceChildren();
        const defs = el("defs");
        svg.appendChild(defs);

        const g = el("g", { class: "fv-solid" });
        items.forEach(item => g.appendChild(item.node));
        svg.appendChild(g);

        // ---------- dimensions: gather geometry first ----------
        const dimGeo = [];

        for (const d of scene.dims || []) {
            // ea / eb: where the extension lines start (default: a / b; null = none)
            const off = d.off || [0, 0];
            const pa = P(to3(plane, d.a[0] + off[0], d.a[1] + off[1]));
            const pb = P(to3(plane, d.b[0] + off[0], d.b[1] + off[1]));
            const fromA = d.ea === null ? null : d.ea || d.a;
            const fromB = d.eb === null ? null : d.eb || d.b;
            const ea = fromA ? P(to3(plane, fromA[0], fromA[1])) : null;
            const eb = fromB ? P(to3(plane, fromB[0], fromB[1])) : null;
            pts2.push(pa, pb);
            dimGeo.push({ ea, eb, pa, pb, label: d.label });
        }

        const noteGeo = (scene.notes || []).map(n => {
            const p = P(to3(plane, n.at[0], n.at[1], n.w || 0));
            pts2.push(p);
            return { p, text: n.text };
        });

        // ---------- fit the view ----------
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts2) {
            minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
        }
        // Size from the view's real on-screen box so labels stay ~14px,
        // then grow the fit to include the label text and fit again.
        const box = svg.getBoundingClientRect();
        const cw = box.width || 600;
        let ch = box.height || 380;

        // Phones: size the view to the drawing so wide fittings aren't
        // shrunk into a tall, mostly empty box.
        if (cw && cw < 700) {
            const aspect = (maxY - minY + 1) / (maxX - minX + 1);
            const want = Math.round(Math.max(210, Math.min(380, cw * aspect * 1.25 + 120)));
            if (Math.abs(want - ch) > 2) {
                svg.style.height = `${want}px`;
                ch = want;
            }
        } else if (svg.style.height) {
            svg.style.height = "";
            ch = svg.getBoundingClientRect().height || ch;
        }
        const padX = Math.min(70, cw * 0.12);
        const padY = Math.min(60, ch * 0.12);

        function fit(bx0, by0, bx1, by1) {
            const wv = Math.max(bx1 - bx0, 1);
            const hv = Math.max(by1 - by0, 1);
            const uu = Math.max(wv / Math.max(cw - padX, 80), hv / Math.max(ch - padY, 60));
            let w = wv + padX * uu;
            let h = hv + padY * uu;
            if (w / h < cw / ch) w = h * cw / ch; else h = w * ch / cw;
            return { u: w / cw, w, h, cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2 };
        }

        function labelAnchors(uu) {
            const boxes = [];
            for (const d of dimGeo) {
                const dx = d.pb[0] - d.pa[0];
                const dy = d.pb[1] - d.pa[1];
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                const side = ny > 0 ? -1 : 1;
                d.lx = (d.pa[0] + d.pb[0]) / 2 + nx * 14 * uu * side;
                d.ly = (d.pa[1] + d.pb[1]) / 2 + ny * 14 * uu * side;
                boxes.push([d.lx, d.ly, String(d.label).length * 7.4 * uu, 16 * uu]);
            }
            for (const n of noteGeo) {
                boxes.push([n.p[0], n.p[1], String(n.text).length * 6.8 * uu, 15 * uu]);
            }
            return boxes;
        }

        let F = fit(minX, minY, maxX, maxY);

        for (let pass = 0; pass < 2; pass += 1) {
            let x0 = minX, y0 = minY, x1 = maxX, y1 = maxY;
            for (const [x, y, w, h] of labelAnchors(F.u)) {
                x0 = Math.min(x0, x - w / 2); x1 = Math.max(x1, x + w / 2);
                y0 = Math.min(y0, y - h / 2); y1 = Math.max(y1, y + h / 2);
            }
            F = fit(x0, y0, x1, y1);
        }

        labelAnchors(F.u);
        const u = F.u;
        svg.setAttribute("viewBox", `${F.cx - F.w / 2} ${F.cy - F.h / 2} ${F.w} ${F.h}`);

        // scale-stable strokes
        svg.querySelectorAll(".fv-edge, .fv-cap").forEach(n => n.setAttribute("stroke-width", 1.3 * u));
        svg.querySelectorAll(".fv-seam").forEach(n => n.setAttribute("stroke-width", 1.1 * u));
        g.querySelectorAll("polygon:not(.fv-cap)").forEach(n => n.setAttribute("stroke-width", 0.7 * u));

        // ---------- dimensions (always on top) ----------
        const dims = el("g", { class: "fv-dims" });
        const seg = (a, b, cls, w) =>
            dims.appendChild(el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: cls, "stroke-width": w * u }));

        for (const d of dimGeo) {
            for (const [from, to] of [[d.ea, d.pa], [d.eb, d.pb]]) {
                if (from && Math.hypot(from[0] - to[0], from[1] - to[1]) > 2 * u) {
                    seg(from, to, "fv-ext", 0.9);
                }
            }

            seg(d.pa, d.pb, "fv-dim", 1.4);

            const dx = d.pb[0] - d.pa[0];
            const dy = d.pb[1] - d.pa[1];
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;

            for (const p of [d.pa, d.pb]) {
                seg([p[0] - nx * 5 * u, p[1] - ny * 5 * u], [p[0] + nx * 5 * u, p[1] + ny * 5 * u], "fv-dim", 1.4);
            }

            // label on the outside of the line, kept upright
            const size = (cw < 520 ? 15 : 14) * u;
            dims.appendChild(el("text", {
                x: d.lx,
                y: d.ly + size * 0.35,
                "text-anchor": "middle",
                class: "fv-label",
                "font-size": size
            }, d.label));
        }

        for (const n of noteGeo) {
            const size = (cw < 520 ? 14 : 12.5) * u;
            dims.appendChild(el("text", {
                x: n.p[0],
                y: n.p[1] + size * 0.35,
                "text-anchor": "middle",
                class: "fv-note",
                "font-size": size
            }, n.text));
        }

        svg.appendChild(dims);

        // Put every label on a solid dark tag (no text outlines: phone
        // dark modes recolor outlines and made labels unreadable).
        for (const t of [...dims.querySelectorAll("text")]) {
            let b;
            try {
                b = t.getBBox();
            } catch (error) {
                b = null;
            }
            const size = Number(t.getAttribute("font-size"));
            if (!b || !b.width) {
                const w = String(t.textContent).length * size * 0.56;
                b = { x: Number(t.getAttribute("x")) - w / 2, y: Number(t.getAttribute("y")) - size * 0.85, width: w, height: size * 1.1 };
            }
            const padX = 5 * u;
            const padY = 2.5 * u;
            const tag = el("rect", {
                x: b.x - padX,
                y: b.y - padY,
                width: b.width + 2 * padX,
                height: b.height + 2 * padY,
                rx: 4 * u,
                class: t.classList.contains("fv-note") ? "fv-tag fv-tag-note" : "fv-tag"
            });
            dims.insertBefore(tag, t);
        }
    }

    function clear(viewId, message) {
        const root = DC.get(viewId);
        if (!root) return;
        root.classList.add("is-empty");
        root.querySelector("svg")?.replaceChildren();
        const msg = root.querySelector(".live-view-msg");
        if (msg) {
            msg.textContent = message || "Fix the inputs to see the fitting.";
            msg.hidden = false;
        }
        viewState(viewId).scene = null;
    }

    // Drag to turn the view; Reset view button.
    function bindView(viewId) {
        const root = DC.get(viewId);
        const svg = root?.querySelector("svg");
        if (!svg || root.dataset.bound) return;
        root.dataset.bound = "1";
        const state = viewState(viewId);
        let drag = null;

        svg.addEventListener("pointerdown", event => {
            drag = { x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch };
            svg.setPointerCapture(event.pointerId);
            root.classList.add("is-dragging");
        });

        svg.addEventListener("pointermove", event => {
            if (!drag || !state.scene) return;
            state.yaw = drag.yaw + (event.clientX - drag.x) * 0.45;
            state.pitch = Math.max(-80, Math.min(85, drag.pitch + (event.clientY - drag.y) * 0.35));
            render(viewId, state.scene);
        });

        const end = () => {
            drag = null;
            root.classList.remove("is-dragging");
        };
        svg.addEventListener("pointerup", end);
        svg.addEventListener("pointercancel", end);

        root.querySelector("[data-view-reset]")?.addEventListener("click", () => {
            state.yaw = -32;
            state.pitch = 22;
            if (state.scene) render(viewId, state.scene);
        });

        // Keyboard: arrow keys turn the view.
        svg.addEventListener("keydown", event => {
            const step = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[event.key];
            if (!step || !state.scene) return;
            event.preventDefault();
            state.yaw += step[0];
            state.pitch = Math.max(-80, Math.min(85, state.pitch + step[1]));
            render(viewId, state.scene);
        });
    }

    function rerenderAll() {
        for (const [id, state] of Object.entries(views)) {
            const root = DC.get(id);
            if (state.scene && root && root.offsetParent !== null) {
                render(id, state.scene);
            }
        }
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(rerenderAll, 120);
    });
    document.addEventListener("ductculator:screen-shown", () => requestAnimationFrame(rerenderAll));

    DC.Fit3D = { Path, render, clear, bindView, views };
})();
