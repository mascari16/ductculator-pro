// =====================================================
// DUCTWORK PRO
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
        // A part can bring its own sections: rings of [x, y, w] points in the
        // drawing plane (used for pieces with cut ends that move freely).
        if (part.rings) {
            return part.rings.map(r => {
                const ring = r.pts.map(q => to3(plane, q[0], q[1], q[2] || 0));
                const c = mul(ring.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / ring.length);
                return { c, ring, joint: !!r.joint, cut: !!r.cut };
            });
        }
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

    // Draws a view's waiting scene as soon as the view gets a size.
    const watched = new Set();
    function watchVisible(viewId, root) {
        if (watched.has(viewId) || typeof ResizeObserver === "undefined") return;
        watched.add(viewId);
        new ResizeObserver(() => {
            const state = views[viewId];
            if (state && state.pending && state.scene && root.offsetParent !== null) {
                render(viewId, state.scene);
            }
        }).observe(root);
    }

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

        // Hidden screen (e.g. the app is starting up on the dashboard): keep
        // the scene and draw it the moment the view becomes visible.
        if (root.offsetParent === null) {
            state.pending = true;
            watchVisible(viewId, root);
            return;
        }
        state.pending = false;
        const msg = root.querySelector(".live-view-msg");
        if (msg) msg.hidden = true;

        const plane = planeFor(scene.roll);
        const cam = camera(state);
        const items = [];
        const pts2 = [];
        const occ = []; // screen outlines of everything drawn (for dimension placement)
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
                    occ.push(sp);
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
                    if (!near) continue;
                    // cut lines lie on visible faces of a straight (convex) joint: draw over it
                    if (S[i].cut) line(S[i].ring[k], S[i].ring[k2], "fv-cut", -1e9);
                    else line(S[i].ring[k], S[i].ring[k2], i === 0 || i === S.length - 1 ? "fv-edge" : "fv-seam");
                }
            }

            // end caps
            for (const [i, sign] of [[0, -1], [S.length - 1, 1]]) {
                if (i === 0 && part.tap) continue;
                let nCap = norm(mul(norm(sub(S[i === 0 ? 1 : i].c, S[i === 0 ? 0 : i - 1].c)), sign));
                if (part.rings) {
                    // slanted cut end: use the face's own normal, facing out
                    const rg = S[i].ring;
                    const fn = norm(cross(sub(rg[2], rg[0]), sub(rg[3], rg[1])));
                    nCap = dot(fn, nCap) < 0 ? mul(fn, -1) : fn;
                }
                const nv = cam(nCap);
                if (nv[1] >= 0) continue;
                const sp = S[i].ring.map(P);
                sp.forEach(p => pts2.push(p));
                occ.push(sp);
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

        // Marking lines drawn on a face (e.g. cut lines on a cheek); shown
        // only when that face is toward the viewer.
        for (const m of scene.marks || []) {
            const nv = cam(to3(plane, m.n[0], m.n[1], m.n[2]));
            if (nv[1] >= -1e-6) continue;
            const a3 = P(to3(plane, m.a[0], m.a[1], m.a[2]));
            const b3 = P(to3(plane, m.b[0], m.b[1], m.b[2]));
            // marks sit on a face toward the viewer: draw them over the part
            items.push({ z: -1e9, node: el("line", { x1: a3[0].toFixed(2), y1: a3[1].toFixed(2), x2: b3[0].toFixed(2), y2: b3[1].toFixed(2), class: m.cls || "fv-cut" }) });
        }

        // =================================================
        // Dimensions: placed clear of the duct and of each other.
        // =================================================
        const box = svg.getBoundingClientRect();
        const cw = box.width || 600;
        let ch = box.height || 380;

        let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
        for (const p of pts2) {
            gx0 = Math.min(gx0, p[0]); gx1 = Math.max(gx1, p[0]);
            gy0 = Math.min(gy0, p[1]); gy1 = Math.max(gy1, p[1]);
        }

        const lock = state.lock || null;
        const gcx = (gx0 + gx1) / 2;
        const gcy = (gy0 + gy1) / 2;

        // Phones: size the view to the drawing's shape (not while dragging).
        if (lock) {
            ch = lock.ch;
        } else if (cw < 700) {
            const aspect = (gy1 - gy0 + 1) / (gx1 - gx0 + 1);
            const want = Math.round(Math.max(230, Math.min(400, cw * aspect * 1.1 + 170)));
            if (Math.abs(want - ch) > 2) {
                svg.style.height = `${want}px`;
                ch = want;
            }
        } else if (svg.style.height) {
            svg.style.height = "";
            ch = svg.getBoundingClientRect().height || ch;
        }

        const small = cw < 520;
        const labelPx = small ? 12.5 : 14;

        function fitBox(x0, y0, x1, y1, padX, padY) {
            const wv = Math.max(x1 - x0, 1);
            const hv = Math.max(y1 - y0, 1);
            const uu = Math.max(wv / Math.max(cw - padX, 60), hv / Math.max(ch - padY, 50));
            let w = wv + padX * uu;
            let h = hv + padY * uu;
            if (w / h < cw / ch) w = h * cw / ch; else h = w * ch / cw;
            return { u: w / cw, w, h, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
        }

        function pointInPoly(x, y, poly) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
                if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
            }
            return inside;
        }

        // Dimensions go on the face plane toward the viewer (rect parts),
        // so they measure visible edges and clear the part quickly.
        const dw = (scene.dimW || 0) * (cam(plane.Wn)[1] < 0 ? 1 : -1);
        const Q = (x, y) => P(to3(plane, x, y, dw));

        function place(u) {
            // Occupancy grid of the drawn duct, in screen units.
            const cell = 3 * u;
            const margin = 320 * u;
            const ox = gx0 - margin;
            const oy = gy0 - margin;
            const nx = Math.ceil((gx1 - gx0 + 2 * margin) / cell) + 1;
            const ny = Math.ceil((gy1 - gy0 + 2 * margin) / cell) + 1;
            const grid = new Uint8Array(nx * ny);
            const idx = (x, y) => {
                const i = Math.floor((x - ox) / cell);
                const j = Math.floor((y - oy) / cell);
                return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i;
            };

            for (const poly of occ) {
                let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity;
                for (const p of poly) {
                    a0 = Math.min(a0, p[0]); a1 = Math.max(a1, p[0]);
                    b0 = Math.min(b0, p[1]); b1 = Math.max(b1, p[1]);
                }
                const i0 = Math.floor((a0 - ox) / cell), i1 = Math.floor((a1 - ox) / cell);
                const j0 = Math.floor((b0 - oy) / cell), j1 = Math.floor((b1 - oy) / cell);
                for (let j = j0; j <= j1; j += 1) {
                    for (let i = i0; i <= i1; i += 1) {
                        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
                        const x = ox + (i + 0.5) * cell;
                        const y = oy + (j + 0.5) * cell;
                        if (pointInPoly(x, y, poly)) grid[j * nx + i] = 1;
                    }
                }
                for (const p of poly) {
                    const k = idx(p[0], p[1]);
                    if (k >= 0) grid[k] = 1;
                }
            }

            // Clearance: grow the duct by two cells.
            for (let pass = 0; pass < 2; pass += 1) {
                const copy = grid.slice();
                for (let j = 1; j < ny - 1; j += 1) {
                    for (let i = 1; i < nx - 1; i += 1) {
                        const k = j * nx + i;
                        if (!copy[k] && (copy[k - 1] || copy[k + 1] || copy[k - nx] || copy[k + nx])) grid[k] = 1;
                    }
                }
            }

            const ductGrid = grid.slice();
            const isDuct = (x, y) => {
                const k = idx(x, y);
                return k >= 0 && ductGrid[k] === 1;
            };
            const isFree = (x, y) => {
                const k = idx(x, y);
                return k < 0 || !grid[k];
            };
            const mark = (x, y) => {
                const k = idx(x, y);
                if (k >= 0) grid[k] = 2;
            };
            const segFree = (a, b) => {
                const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / cell));
                for (let i = 0; i <= n; i += 1) {
                    if (!isFree(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n)) return false;
                }
                return true;
            };
            const segMark = (a, b) => {
                const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / cell));
                for (let i = 0; i <= n; i += 1) mark(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
            };
            const rectFree = r => {
                for (let y = r.y; y <= r.y + r.h; y += cell) for (let x = r.x; x <= r.x + r.w; x += cell) if (!isFree(x, y)) return false;
                return isFree(r.x + r.w, r.y + r.h);
            };
            const rectMark = r => {
                for (let y = r.y - cell; y <= r.y + r.h + cell; y += cell) for (let x = r.x - cell; x <= r.x + r.w + cell; x += cell) mark(x, y);
            };

            const size = labelPx * u;
            const labelBox = (text, x, y) => {
                const w = String(text).length * size * 0.56 + 12 * u;
                const h = size * 1.45;
                return { x: x - w / 2, y: y - h / 2, w, h, cx: x, cy: y };
            };

            const placed = [];
            const step = 4 * u;
            const gc = [(gx0 + gx1) / 2, (gy0 + gy1) / 2];
            const away = (mx, my, sx, sy) => {
                let l = Math.hypot(sx, sy);
                if (l < 1e-9) {
                    sx = mx - gc[0]; sy = my - gc[1]; l = Math.hypot(sx, sy) || 1;
                }
                return [sx / l, sy / l];
            };

            // Fixed dimensions first (they can't move), then angles, then the rest.
            // On phones the angle arcs are left out: the angle is the headline result.
            const rank = d => (d.fixed ? 0 : d.type === "angle" ? 1 : 2);
            const order = (scene.dims || [])
                .filter(d => !(small && d.type === "angle" && !d.keepOnSmall))
                .sort((p, q) => rank(p) - rank(q));

            // While the view is being turned, each dimension keeps the spot it
            // had when the drag started, so nothing jumps from side to side.
            const keep = lock && lock.choices && lock.choices.length === order.length ? lock.choices : null;

            const choices = [];

            for (const [di, d] of order.entries()) {
                choices[di] = -1;
                // Seen nearly end-on, a dimension can't be read: leave it off
                // until the view turns back.
                if (d.type !== "angle") {
                    // how squarely the dimension (its line and its offset
                    // direction) faces the viewer: 1 = flat on, 0 = edge-on
                    const dd = d.dir || (d.off ? norm([d.off[0], d.off[1], 0]) : [0, 1, 0]);
                    const pa0 = Q(d.a[0], d.a[1]), pb0 = Q(d.b[0], d.b[1]);
                    const pd0 = Q(d.a[0] + dd[0], d.a[1] + dd[1]);
                    const trueLen = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
                    const lineX = pb0[0] - pa0[0], lineY = pb0[1] - pa0[1];
                    const offX = pd0[0] - pa0[0], offY = pd0[1] - pa0[1];
                    const lenD = Math.hypot(dd[0], dd[1]) || 1;
                    const face = Math.abs(lineX * offY - lineY * offX) / (trueLen * lenD * Math.abs(Math.sin(Math.atan2(dd[1], dd[0]) - Math.atan2(d.b[1] - d.a[1], d.b[0] - d.a[0]))) || 1);
                    if (trueLen > 1e-6 && face < 0.4) continue;
                } else {
                    const c0 = Q(d.c[0], d.c[1]);
                    const e0 = Q(d.c[0] + Math.cos(rad(d.a0)), d.c[1] + Math.sin(rad(d.a0)));
                    const e1 = Q(d.c[0] + Math.cos(rad(d.a1)), d.c[1] + Math.sin(rad(d.a1)));
                    const cr = (e0[0] - c0[0]) * (e1[1] - c0[1]) - (e0[1] - c0[1]) * (e1[0] - c0[0]);
                    if (Math.abs(cr) < 0.4 * Math.abs(Math.sin(rad(d.a1 - d.a0)))) continue;
                }
                const useKeep = keep && keep[di] >= 0;
                const k0 = useKeep ? keep[di] : 0;
                const k1 = useKeep ? keep[di] + 1 : 90;
                if (d.type === "angle") {
                    let best = null;
                    const slide = d.slide ? norm([d.slide[0], d.slide[1], 0]) : null;
                    for (let k = k0; k < k1; k += 1) {
                        // Slide the vertex along the measured edge first (same angle,
                        // parallel reference line), then grow the radius.
                        const sk = slide ? Math.min(k, 60) : 0;
                        const along = Math.min(sk * step * 1.5, d.slideMax ?? Infinity);
                        const c3 = slide ? [d.c[0] + slide[0] * along, d.c[1] + slide[1] * along] : d.c;
                        const r = d.r + (d.fixed ? 0 : (slide ? Math.max(0, k - 60) : k) * step);
                        const pts = [];
                        const n = 28;
                        for (let i = 0; i <= n; i += 1) {
                            const a = rad(d.a0 + ((d.a1 - d.a0) * i) / n);
                            pts.push(Q(c3[0] + r * Math.cos(a), c3[1] + r * Math.sin(a)));
                        }
                        const am = rad((d.a0 + d.a1) / 2);
                        const lm = Q(c3[0] + r * Math.cos(am), c3[1] + r * Math.sin(am));
                        const cs = Q(c3[0], c3[1]);
                        const [rx, ry] = away(lm[0], lm[1], lm[0] - cs[0], lm[1] - cs[1]);
                        const probe = labelBox(d.label, 0, 0);
                        const push0 = Math.abs(rx) * probe.w / 2 + Math.abs(ry) * probe.h / 2 + 4 * u;
                        let lb = labelBox(d.label, lm[0] + rx * push0, lm[1] + ry * push0);
                        // Fixed arcs: try outward and inward until the label is clear.
                        search: for (let t = 0; d.fixed && t < 30 && !rectFree(lb); t += 1) {
                            for (const sign of [1, -1]) {
                                const push = sign * (push0 + t * step);
                                const cand = labelBox(d.label, lm[0] + rx * push, lm[1] + ry * push);
                                if (rectFree(cand)) { lb = cand; break search; }
                            }
                        }
                        let ok = rectFree(lb);
                        // arc ends touch the measured edges by design: test the inside only
                        for (let i = 3; ok && i < n - 3; i += 1) ok = segFree(pts[i], pts[i + 1]);
                        best = { d, pts, lb, c: c3, k };
                        if (ok || d.fixed) break;
                    }
                    for (let i = 0; i < best.pts.length - 1; i += 1) segMark(best.pts[i], best.pts[i + 1]);
                    rectMark(best.lb);
                    placed.push(best);
                    choices[di] = best.k;
                    continue;
                }

                // linear
                const dir = d.dir || (d.off ? norm([d.off[0], d.off[1], 0]) : [0, 1, 0]);
                const base = d.base ?? (d.off ? Math.hypot(d.off[0], d.off[1]) : 0);
                let best = null;
                for (let k = k0; k < k1; k += 1) {
                    const dist = base + (d.fixed ? 0 : k * step);
                    const a2 = [d.a[0] + dir[0] * dist, d.a[1] + dir[1] * dist];
                    const b2 = [d.b[0] + dir[0] * dist, d.b[1] + dir[1] * dist];
                    const pa = Q(a2[0], a2[1]);
                    const pb = Q(b2[0], b2[1]);
                    // Text sits just outside the dimension line, away from the part.
                    const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
                    const base0 = Q(d.a[0], d.a[1]);
                    let [sx, sy] = away(mx, my, pa[0] - base0[0], pa[1] - base0[1]);
                    if (d.fixed) {
                        const lx = pb[0] - pa[0], ly = pb[1] - pa[1], ll = Math.hypot(lx, ly) || 1;
                        [sx, sy] = [-ly / ll, lx / ll];
                    }
                    const probe = labelBox(d.label, 0, 0);
                    const push0 = Math.abs(sx) * probe.w / 2 + Math.abs(sy) * probe.h / 2 + 3 * u;
                    let lb = labelBox(d.label, mx + sx * push0, my + sy * push0);
                    search: for (let t = 0; d.fixed && t < 30 && !rectFree(lb); t += 1) {
                        for (const sign of [1, -1]) {
                            const push = sign * (push0 + t * step);
                            const cand = labelBox(d.label, mx + sx * push, my + sy * push);
                            if (rectFree(cand)) { lb = cand; break search; }
                        }
                    }
                    const ok = segFree(pa, pb) && rectFree(lb);
                    best = { d, pa, pb, lb, dist, dir, a2, b2, k };
                    if (ok || d.fixed) break;
                }
                segMark(best.pa, best.pb);
                rectMark(best.lb);
                placed.push(best);
                choices[di] = best.k;
            }

            placed.isDuct = isDuct;
            placed.choices = choices;
            return placed;
        }

        // Lock the drawing scale first, then place dimensions at exactly that
        // scale. If they don't fit the view, step the drawing down and retry.
        const geomW = Math.max(gx1 - gx0, 1);
        const geomH = Math.max(gy1 - gy0, 1);
        const shares = small ? [0.72, 0.62, 0.53, 0.45, 0.38, 0.32, 0.26] : [0.64, 0.55, 0.47, 0.4, 0.34, 0.28];
        let placed = null;
        let F = null;

        if (lock) {
            // Turning the view: keep the scale, height and framing from the
            // start of the drag so the fitting turns smoothly in place.
            placed = place(lock.u);
            F = { u: lock.u, w: lock.w, h: lock.h, cx: gcx + lock.dx, cy: gcy + lock.dy };
        }

        for (let k = 0; !lock && k < shares.length; k += 1) {
            const share = shares[k];
            const uu = cw < 700 ? geomW / (cw * share) : Math.max(geomW / (cw * share), geomH / (ch * Math.min(0.78, share * 1.25)));
            const result = place(uu);
            let x0 = gx0, y0 = gy0, x1 = gx1, y1 = gy1;
            for (const p of result) {
                for (const q of p.pts || [p.pa, p.pb]) {
                    x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]);
                    y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
                }
                x0 = Math.min(x0, p.lb.x); x1 = Math.max(x1, p.lb.x + p.lb.w);
                y0 = Math.min(y0, p.lb.y); y1 = Math.max(y1, p.lb.y + p.lb.h);
            }
            const pad = (small ? 8 : 16) * uu;
            // Phones: the view grows to the content's height, so only width must fit.
            const flexible = cw < 700;
            const fits = x1 - x0 + 2 * pad <= cw * uu && (flexible || y1 - y0 + 2 * pad <= ch * uu);
            placed = result;
            if (flexible) {
                const hPx = Math.round(Math.max(190, Math.min(560, (y1 - y0) / uu + 2 * (pad / uu) + 8)));
                svg.style.height = `${hPx}px`;
                ch = hPx;
            }
            F = { u: uu, w: cw * uu, h: ch * uu, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
            if (fits) break;
            if (k === shares.length - 1) {
                // Last resort: fit everything (labels may be a touch smaller).
                const fb = fitBox(x0, y0, x1, y1, 16, 16);
                F = fb;
            }
        }

        const u = F.u;
        state.frame = { u: F.u, w: F.w, h: F.h, dx: F.cx - gcx, dy: F.cy - gcy, ch, choices: placed.choices };
        svg.setAttribute("viewBox", `${F.cx - F.w / 2} ${F.cy - F.h / 2} ${F.w} ${F.h}`);

        // Centerline extensions drawn in depth order (hidden behind the duct).
        for (const p of placed) {
            if (!p.d.cl) continue;
            for (const [from, end] of [[p.d.ea, p.a2], [p.d.eb, p.b2]]) {
                if (!from || from === null || !end) continue;
                if (!(p.d.cl === true || p.d.cl === (from === p.d.ea ? "a" : "b"))) continue;
                const steps = 40;
                for (let i = 0; i < steps; i += 1) {
                    const t0 = i / steps, t1 = (i + 1) / steps;
                    const q0 = [from[0] + (end[0] - from[0]) * t0, from[1] + (end[1] - from[1]) * t0];
                    const q1 = [from[0] + (end[0] - from[0]) * t1, from[1] + (end[1] - from[1]) * t1];
                    const s0 = Q(q0[0], q0[1]);
                    const s1 = Q(q1[0], q1[1]);
                    if (placed.isDuct((s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2)) continue;
                    items.push({ z: (s0[2] + s1[2]) / 2 - 0.3, node: el("line", { x1: s0[0], y1: s0[1], x2: s1[0], y2: s1[1], class: "fv-cl", "stroke-width": 0.9 * u }) });
                }
            }
        }

        items.sort((a, b) => b.z - a.z);

        svg.replaceChildren();
        const g = el("g", { class: "fv-solid" });
        items.forEach(item => g.appendChild(item.node));
        svg.appendChild(g);

        // scale-stable strokes for the solid
        svg.querySelectorAll(".fv-edge, .fv-cap").forEach(n => n.setAttribute("stroke-width", 1.3 * u));
        svg.querySelectorAll(".fv-seam").forEach(n => n.setAttribute("stroke-width", 1.1 * u));
        g.querySelectorAll("polygon:not(.fv-cap)").forEach(n => n.setAttribute("stroke-width", 0.7 * u));

        // ---------- draw dimensions ----------
        const dims = el("g", { class: "fv-dims" });
        const line = (a, b, cls, w) => dims.appendChild(el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: cls, "stroke-width": w * u }));
        const arrow = (tip, from) => {
            const dx = tip[0] - from[0], dy = tip[1] - from[1];
            const l = Math.hypot(dx, dy) || 1;
            const ux = dx / l, uy = dy / l;
            const L = 8 * u, W = 2.8 * u;
            const bx = tip[0] - ux * L, by = tip[1] - uy * L;
            dims.appendChild(el("path", { d: `M${tip[0]} ${tip[1]}L${bx - uy * W} ${by + ux * W}L${bx + uy * W} ${by - ux * W}Z`, class: "fv-arrow" }));
        };
        const tag = (lb, text) => {
            dims.appendChild(el("rect", { x: lb.x, y: lb.y, width: lb.w, height: lb.h, rx: 4 * u, class: "fv-tag" }));
            dims.appendChild(el("text", { x: lb.cx, y: lb.cy + labelPx * u * 0.36, "text-anchor": "middle", class: "fv-label", "font-size": labelPx * u }, text));
        };

        for (const p of placed) {
            if (p.pts) {
                // angular dimension: extension rays from the vertex, arc, arrows
                if (!p.d.noRays) {
                    const c = Q(p.c[0], p.c[1]);
                    for (const end of [p.pts[0], p.pts[p.pts.length - 1]]) {
                        const dx = end[0] - c[0], dy = end[1] - c[1];
                        const l = Math.hypot(dx, dy) || 1;
                        const B = [end[0] + (dx / l) * 4 * u, end[1] + (dy / l) * 4 * u];
                        const pieces = Math.max(4, Math.ceil(l / (2 * u)));
                        let run = null;
                        for (let i = 0; i <= pieces; i += 1) {
                            const q = [c[0] + ((B[0] - c[0]) * i) / pieces, c[1] + ((B[1] - c[1]) * i) / pieces];
                            const free = !placed.isDuct(q[0], q[1]);
                            if (free && !run) run = q;
                            if ((!free || i === pieces) && run) {
                                if (Math.hypot(q[0] - run[0], q[1] - run[1]) > 2 * u) line(run, q, "fv-ext", 0.9);
                                run = null;
                            }
                        }
                    }
                }
                for (let i = 0; i < p.pts.length - 1; i += 1) line(p.pts[i], p.pts[i + 1], "fv-dim", 1.3);
                arrow(p.pts[0], p.pts[2]);
                arrow(p.pts[p.pts.length - 1], p.pts[p.pts.length - 3]);
                tag(p.lb, p.d.label);
                continue;
            }

            // extension lines: small gap off the part, slight overshoot
            for (const [from, end, which] of [[p.d.ea === null ? null : p.d.ea || p.d.a, p.pa, "a"], [p.d.eb === null ? null : p.d.eb || p.d.b, p.pb, "b"]]) {
                if (!from || p.d.radius) continue;
                if (p.d.cl === true || p.d.cl === which) continue; // drawn as a centerline in depth order
                const s = Q(from[0], from[1]);
                const dx = end[0] - s[0], dy = end[1] - s[1];
                const l = Math.hypot(dx, dy);
                if (l < 3 * u) continue;
                const ux = dx / l, uy = dy / l;
                const A = [s[0] + ux * 3 * u, s[1] + uy * 3 * u];
                const B = [end[0] + ux * 4 * u, end[1] + uy * 4 * u];
                const pieces = Math.max(4, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / (2 * u)));
                let run = null;
                for (let i = 0; i <= pieces; i += 1) {
                    const q = [A[0] + ((B[0] - A[0]) * i) / pieces, A[1] + ((B[1] - A[1]) * i) / pieces];
                    const free = !placed.isDuct(q[0], q[1]);
                    if (free && !run) run = q;
                    if ((!free || i === pieces) && run) {
                        if (Math.hypot(q[0] - run[0], q[1] - run[1]) > 2 * u) line(run, q, "fv-ext", 0.9);
                        run = null;
                    }
                }
            }

            line(p.pa, p.pb, "fv-dim", 1.3);
            if (!p.d.radius) arrow(p.pa, p.pb);
            arrow(p.pb, p.pa);
            tag(p.lb, p.d.label);
        }

        svg.appendChild(dims);

        // Caption under the view (notes that don't belong in the drawing).
        const cap = root.querySelector(".live-view-caption");
        if (cap) {
            cap.textContent = scene.caption || "";
            cap.hidden = !scene.caption;
        }
    }

    function clear(viewId, message) {
        const root = DC.get(viewId);
        if (!root) return;
        root.classList.add("is-empty");
        root.querySelector("svg")?.replaceChildren();
        const cap = root.querySelector(".live-view-caption");
        if (cap) cap.hidden = true;
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
            state.lock = state.frame || null;
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
            if (!drag) return;
            drag = null;
            state.lock = null;
            root.classList.remove("is-dragging");
            // Refit the drawing and dimensions for the new angle.
            if (state.scene) render(viewId, state.scene);
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
