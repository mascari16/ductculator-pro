// =====================================================
// DUCTWORK PRO
// shared.js
// Helpers shared by the newer tool screens: feet-inch-fraction
// input, 1/16" output, result rows, error boxes, tabs and live
// recalculation. Loaded before the screen scripts.
// =====================================================

(function () {
    "use strict";

    const DC = (window.DC = window.DC || {});

    DC.get = id => document.getElementById(id);

    // ---------- input ----------

    /*
     * Accepts 46, 46.25, 46 1/4, 46-1/4, 1/4, 3' 10 1/4, 3'10-1/4"
     * Returns inches, or NaN when empty / unreadable.
     */
    DC.parse = function (value) {
        let text = String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/inches|inch|in\./g, "")
            .replace(/["”]/g, "")
            .replace(/[’′]/g, "'")
            .replace(/\s+/g, " ");

        if (!text) {
            return NaN;
        }

        let total = 0;

        if (text.includes("'")) {
            const parts = text.split("'");
            const feet = Number(parts[0].trim());

            if (!Number.isFinite(feet)) {
                return NaN;
            }

            total += feet * 12;
            text = (parts[1] || "").trim();
        }

        text = text.replace(/^(-?\d+(?:\.\d+)?)-(\d+)\/(\d+)$/, "$1 $2/$3");

        if (!text) {
            return total;
        }

        for (const part of text.split(" ")) {
            if (!part) {
                continue;
            }

            if (part.includes("/")) {
                const [n, d] = part.split("/").map(Number);

                if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
                    return NaN;
                }

                total += n / d;
            } else {
                const number = Number(part);

                if (!Number.isFinite(number)) {
                    return NaN;
                }

                total += number;
            }
        }

        return total;
    };

    DC.meas = id => DC.parse(DC.get(id)?.value);

    DC.num = id => {
        const value = DC.get(id)?.value;
        return value === "" || value == null ? NaN : Number(value);
    };

    DC.val = id => DC.get(id)?.value ?? "";

    DC.checked = id => Boolean(DC.get(id)?.checked);

    // ---------- output ----------

    function gcd(a, b) {
        while (b) {
            [a, b] = [b, a % b];
        }
        return a || 1;
    }

    // Inches to the nearest 1/16", e.g. 46 1/4"
    DC.fmt = function (value) {
        if (!Number.isFinite(value)) {
            return "—";
        }

        const sign = value < -1e-9 ? "−" : "";
        const sixteenths = Math.round(Math.abs(value) * 16);
        const whole = Math.floor(sixteenths / 16);
        const rest = sixteenths % 16;

        if (!rest) {
            return `${sign}${whole}"`;
        }

        const g = gcd(rest, 16);
        const fraction = `${rest / g}/${16 / g}`;

        return whole
            ? `${sign}${whole} ${fraction}"`
            : `${sign}${fraction}"`;
    };

    // Feet-inches to the nearest 1/16", e.g. 10' 2 1/2"
    DC.fmtFt = function (value) {
        if (!Number.isFinite(value)) {
            return "—";
        }

        const sign = value < -1e-9 ? "−" : "";
        const sixteenths = Math.round(Math.abs(value) * 16);
        const feet = Math.floor(sixteenths / (12 * 16));
        const inches = (sixteenths - feet * 12 * 16) / 16;

        return `${sign}${feet}' ${DC.fmt(inches)}`;
    };

    // Long lengths also shown in feet-inches.
    DC.len = value =>
        Math.abs(value) >= 48
            ? `${DC.fmt(value)} <small>${DC.fmtFt(value)}</small>`
            : DC.fmt(value);

    DC.deg = (value, places = 2) =>
        Number.isFinite(value) ? `${value.toFixed(places)}°` : "—";

    DC.n = (value, places = 3) =>
        Number.isFinite(value) ? value.toFixed(places) : "—";

    DC.esc = text =>
        String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    DC.rad = degrees => degrees * Math.PI / 180;
    DC.degOf = radians => radians * 180 / Math.PI;

    DC.quarterUp = value => Math.ceil((value - 1e-9) * 4) / 4;

    /*
     * rows: [{ label, value, main, note }, { head: "Section" }]
     * value is trusted HTML built by the calculators.
     */
    DC.renderRows = function (element, rows) {
        if (!element) {
            return;
        }

        element.innerHTML = rows
            .filter(Boolean)
            .map(row => {
                if (row.head) {
                    return `<h4 class="kv-head">${DC.esc(row.head)}</h4>`;
                }

                if (row.text) {
                    return `<p class="kv-text">${row.text}</p>`;
                }

                return `
                    <div class="kv-row${row.main ? " kv-main" : ""}">
                        <span>${DC.esc(row.label)}${row.note ? `<em>${DC.esc(row.note)}</em>` : ""}</span>
                        <strong>${row.value}</strong>
                    </div>
                `;
            })
            .join("");
    };

    DC.renderProblem = function (element, title, message, steps = []) {
        if (!element) {
            return;
        }

        element.innerHTML = `
            <div class="kv-problem" role="alert">
                <strong>${DC.esc(title)}</strong>
                <p>${DC.esc(message)}</p>
                ${steps.length
                    ? `<ol>${steps.map(step => `<li>${DC.esc(step)}</li>`).join("")}</ol>`
                    : ""}
            </div>
        `;
    };

    // ---------- tabs ----------

    /*
     * <div class="seg" data-tabs="roundTab"> <button data-tab="offset"> ...
     * Panels: [data-panel="offset"] inside the same screen.
     * The active tab is kept in a hidden input (#roundTab) so it is
     * remembered and can be shared like any other field.
     */
    DC.tabs = function (screenId, onChange) {
        const screen = DC.get(screenId);
        const bar = screen?.querySelector(".seg[data-tabs]");

        if (!bar) {
            return;
        }

        const store = DC.get(bar.dataset.tabs);

        function show(name, notify = true) {
            const buttons = [...bar.querySelectorAll("[data-tab]")];

            if (!buttons.some(button => button.dataset.tab === name)) {
                name = buttons[0].dataset.tab;
            }

            for (const button of buttons) {
                const on = button.dataset.tab === name;
                button.classList.toggle("is-on", on);
                button.setAttribute("aria-selected", on ? "true" : "false");
                button.tabIndex = on ? 0 : -1;
            }

            for (const panel of screen.querySelectorAll("[data-panel]")) {
                panel.hidden = panel.dataset.panel !== name;
            }

            if (store) {
                store.value = name;
            }

            if (notify && onChange) {
                onChange(name);
            }
        }

        bar.addEventListener("click", event => {
            const button = event.target.closest("[data-tab]");

            if (button) {
                show(button.dataset.tab);
                if (store) {
                    store.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
        });

        bar.addEventListener("keydown", event => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                return;
            }

            const buttons = [...bar.querySelectorAll("[data-tab]")];
            const index = buttons.findIndex(button => button.classList.contains("is-on"));
            const next = buttons[(index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];

            show(next.dataset.tab);
            next.focus();
            event.preventDefault();
        });

        if (store) {
            store.addEventListener("change", () => show(store.value, true));
        }

        show(store?.value || "", false);

        return { show, current: () => store?.value };
    };

    // ---------- live recalculation ----------

    DC.live = function (screenId, compute) {
        const screen = DC.get(screenId);

        if (!screen) {
            return;
        }

        const run = () => {
            try {
                compute();
            } catch (error) {
                console.error(error);
            }
        };

        screen.addEventListener("input", run);
        screen.addEventListener("change", run);
        document.addEventListener("ductculator:inputs-restored", run);

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }
    };

    // Show/hide helper
    DC.show = (idOrElement, visible) => {
        const element =
            typeof idOrElement === "string" ? DC.get(idOrElement) : idOrElement;

        if (element) {
            element.hidden = !visible;
        }
    };

    // ---------- shared geometry ----------

    /*
     * Gored round elbow (two half end gores + n-2 full gores).
     *   miter (cut) angle = elbow angle ÷ (2n − 2)
     *   full gore: heel = 2·tan(miter)·(R + D/2), throat = 2·tan(miter)·(R − D/2)
     *   end gores are half of a full gore.
     */
    DC.gores = function (D, R, angle, n) {
        const miter = angle / (2 * n - 2);
        const t = Math.tan(DC.rad(miter));
        const full = {
            heel: 2 * t * (R + D / 2),
            throat: 2 * t * (R - D / 2),
            centerline: 2 * t * R
        };

        return {
            miter,
            goreAngle: angle / (n - 1),
            fullCount: n - 2,
            full,
            end: {
                heel: full.heel / 2,
                throat: full.throat / 2,
                centerline: full.centerline / 2
            },
            stretchout: Math.PI * D,
            totalCenterline: t * R * (2 * n - 2)
        };
    };

    DC.goreRows = function (D, R, angle, n) {
        const g = DC.gores(D, R, angle, n);

        return [
            { head: `Gores (${n} per elbow)` },
            { label: "Miter (cut) angle", value: DC.deg(g.miter) },
            { label: "Full gore angle", value: DC.deg(g.goreAngle) },
            g.fullCount > 0 && {
                label: `Full gores (${g.fullCount})`,
                value: `${DC.fmt(g.full.heel)} heel · ${DC.fmt(g.full.throat)} throat`
            },
            {
                label: "End gores (2)",
                value: `${DC.fmt(g.end.heel)} heel · ${DC.fmt(g.end.throat)} throat`
            },
            { label: "Stretchout (π × D)", value: DC.fmt(g.stretchout) }
        ];
    };

    /*
     * Lateral branch geometry, measured from where the branch
     * centerline crosses the main centerline (point P).
     *
     * parallel:      branch leaves at θ, one elbow of θ brings it
     *                parallel to the main at centerline offset O.
     * perpendicular: branch leaves at θ, one elbow of (90° − θ) turns
     *                it square to the main, landing a distance A along
     *                the main from P.
     * R = elbow centerline radius (0 for a straight/mitered elbow).
     */
    DC.lateral = function ({ angle, orient, offset, advance, roll, R }) {
        const a = DC.rad(angle);

        if (orient === "perpendicular") {
            const elbow = 90 - angle;
            const tangent = R * Math.tan(DC.rad(elbow) / 2);
            const travel = advance / Math.cos(a);

            return {
                orient,
                elbow,
                tangent,
                travel,
                straight: travel - tangent,
                vertexHeight: advance * Math.tan(a),
                elbowEndHeight: advance * Math.tan(a) + tangent,
                minimumAdvance: tangent * Math.cos(a)
            };
        }

        const trueOffset = Math.hypot(offset, roll || 0);
        const tangent = R * Math.tan(a / 2);
        const travel = trueOffset / Math.sin(a);

        return {
            orient: "parallel",
            elbow: angle,
            tangent,
            trueOffset,
            rollAngle: roll > 0 && offset > 0 ? DC.degOf(Math.atan(roll / offset)) : null,
            travel,
            straight: travel - tangent,
            advanceToVertex: trueOffset / Math.tan(a),
            advanceToElbowEnd: trueOffset / Math.tan(a) + tangent,
            minimumOffset: tangent * Math.sin(a)
        };
    };
})();
