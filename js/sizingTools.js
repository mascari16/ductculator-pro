// =====================================================
// DUCTCULATOR PRO
// sizingTools.js
// Reverse Calculator and Pressure Loss. Both reuse the app's
// friction formula (formulas.js) and friction-equivalent
// diameters (equivalentSizes.js).
// =====================================================

(function () {
    "use strict";

    const DC = window.DC;

    /*
     * Duct section from a shape select and its size fields.
     * Returns area (ft²), friction-equivalent round diameter (in) and a label.
     */
    function section(prefix) {
        const shape = DC.val(prefix + "Shape");

        DC.show(prefix + "RoundGroup", shape === "round");
        DC.show(prefix + "RectGroup", shape !== "round");

        if (shape === "round") {
            const D = DC.meas(prefix + "Dia");

            if (!(D > 0)) {
                return { error: "Enter the diameter." };
            }

            return { area: roundArea(D), De: D, label: `${DC.fmt(D)} round` };
        }

        const a = DC.meas(prefix + "W");
        const b = DC.meas(prefix + "H");

        if (!(a > 0) || !(b > 0)) {
            return { error: "Enter the width and height." };
        }

        if (shape === "flatOval") {
            const W = Math.max(a, b);
            const H = Math.min(a, b);

            if (W === H) {
                return { area: roundArea(W), De: W, label: `${DC.fmt(W)} round` };
            }

            return {
                area: flatOvalAreaSquareInches(W, H) / 144,
                De: flatOvalEquivalentDiameter(W, H),
                label: `${DC.fmt(W)} × ${DC.fmt(H)} flat oval`
            };
        }

        return {
            area: (a * b) / 144,
            De: rectangleEquivalentDiameter(a, b),
            label: `${DC.fmt(a)} × ${DC.fmt(b)}`,
            aspect: Math.max(a, b) / Math.min(a, b)
        };
    }

    // ---------- Reverse Calculator ----------

    function reverse() {
        const out = DC.get("reverseResults");
        const s = section("rv");
        const solve = DC.val("rvSolve");

        DC.show("rvCfmGroup", solve === "velocity");
        DC.show("rvFpmGroup", solve === "cfm");

        if (s.error) {
            return DC.renderProblem(out, "Enter the duct size", s.error);
        }

        let cfm;
        let fpm;

        if (solve === "cfm") {
            fpm = DC.num("rvFpm");

            if (!(fpm > 0)) {
                return DC.renderProblem(out, "Enter the velocity", "Velocity in FPM, such as a traverse reading.");
            }

            cfm = fpm * s.area;
        } else {
            cfm = DC.num("rvCfm");

            if (!(cfm > 0)) {
                return DC.renderProblem(out, "Enter the airflow", "Airflow in CFM.");
            }

            fpm = cfm / s.area;
        }

        const friction = roundFrictionRate(cfm, s.De);
        const run = DC.num("rvRun");

        DC.renderRows(out, [
            solve === "cfm"
                ? { label: "Airflow", value: `${Math.round(cfm).toLocaleString()} CFM`, main: true }
                : { label: "Velocity", value: `${Math.round(fpm).toLocaleString()} FPM`, main: true },
            solve === "cfm"
                ? { label: "Velocity", value: `${Math.round(fpm).toLocaleString()} FPM` }
                : { label: "Airflow", value: `${Math.round(cfm).toLocaleString()} CFM` },
            { label: "Friction rate", note: "in. w.g. per 100 ft", value: DC.n(friction) },
            run > 0 && { label: `Friction loss over ${run} ft`, value: `${DC.n(friction * run / 100)} in. w.g.` },
            { label: "Velocity pressure", value: `${DC.n(velocityPressure(fpm))} in. w.g.` },
            { label: "Area", value: `${DC.n(s.area)} ft²` },
            { label: "Equivalent round", note: "equal friction", value: DC.fmt(s.De) },
            s.aspect && { label: "Aspect ratio", value: `${s.aspect.toFixed(2)} : 1` }
        ]);
    }

    // ---------- Pressure Loss ----------

    const fittingsData = () => DC.get("plFittingsData");

    function readFittings() {
        try {
            const rows = JSON.parse(fittingsData()?.value || "[]");
            return Array.isArray(rows) ? rows : [];
        } catch (error) {
            return [];
        }
    }

    function writeFittings(rows) {
        const store = fittingsData();

        if (store) {
            store.value = JSON.stringify(rows);
            store.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function renderFittingRows() {
        const body = DC.get("plFittingRows");

        if (!body) {
            return;
        }

        const rows = readFittings();

        body.innerHTML = rows.length
            ? rows.map((row, index) => `
                <tr data-index="${index}">
                    <td><input type="text" data-key="name" value="${DC.esc(row.name)}" aria-label="Fitting name" placeholder="Fitting"></td>
                    <td><input type="number" data-key="c" value="${DC.esc(row.c)}" step="0.01" min="0" inputmode="decimal" aria-label="Loss coefficient C"></td>
                    <td><input type="number" data-key="qty" value="${DC.esc(row.qty)}" step="1" min="0" inputmode="numeric" aria-label="Quantity"></td>
                    <td class="row-loss" data-loss></td>
                    <td><button type="button" class="row-remove" data-remove aria-label="Remove fitting">Remove</button></td>
                </tr>`).join("")
            : `<tr><td colspan="5" class="row-empty">No fittings yet. Add one to include its loss.</td></tr>`;
    }

    function pressure() {
        const out = DC.get("pressureResults");
        const s = section("pl");

        if (s.error) {
            return DC.renderProblem(out, "Enter the duct size", s.error);
        }

        const cfm = DC.num("plCfm");
        const length = DC.num("plLen");
        const extra = DC.num("plExtra") || 0;

        if (!(cfm > 0)) {
            return DC.renderProblem(out, "Enter the airflow", "Airflow in CFM through this section.");
        }

        if (!(length >= 0)) {
            return DC.renderProblem(out, "Enter the straight length", "Straight duct length in feet (0 if you only want fittings).");
        }

        const fpm = cfm / s.area;
        const vp = velocityPressure(fpm);
        const friction = roundFrictionRate(cfm, s.De);
        const straight = friction * length / 100;

        const rows = readFittings();
        let fittingTotal = 0;

        document.querySelectorAll("#plFittingRows tr[data-index]").forEach(tr => {
            const row = rows[Number(tr.dataset.index)] || {};
            const loss = (Number(row.c) || 0) * (Number(row.qty) || 0) * vp;
            fittingTotal += loss;
            const cell = tr.querySelector("[data-loss]");
            if (cell) {
                cell.textContent = loss ? loss.toFixed(3) : "—";
            }
        });

        const total = straight + fittingTotal + extra;

        DC.renderRows(out, [
            { label: "Total pressure loss", value: `${DC.n(total)} in. w.g.`, main: true },
            { label: `Straight duct (${length} ft)`, value: `${DC.n(straight)} in. w.g.` },
            { label: "Fittings", note: "Σ C × qty × VP", value: `${DC.n(fittingTotal)} in. w.g.` },
            extra > 0 && { label: "Other losses", value: `${DC.n(extra)} in. w.g.` },
            { head: "Section" },
            { label: "Duct", value: s.label },
            { label: "Velocity", value: `${Math.round(fpm).toLocaleString()} FPM` },
            { label: "Velocity pressure", value: `${DC.n(vp)} in. w.g.` },
            { label: "Friction rate", note: "in. w.g. per 100 ft", value: DC.n(friction) },
            { text: "Fitting C values come from your fitting tables (ASHRAE, SMACNA or the manufacturer). Each fitting's loss is C × velocity pressure." }
        ]);
    }

    function bindFittings() {
        const body = DC.get("plFittingRows");

        DC.get("plAddFitting")?.addEventListener("click", () => {
            const rows = readFittings();
            rows.push({ name: "", c: "", qty: 1 });
            writeFittings(rows);
            renderFittingRows();
            pressure();
            body?.querySelector("tr:last-child input")?.focus();
        });

        body?.addEventListener("input", event => {
            const input = event.target.closest("input[data-key]");
            const tr = event.target.closest("tr[data-index]");

            if (!input || !tr) {
                return;
            }

            event.stopPropagation();
            const rows = readFittings();
            rows[Number(tr.dataset.index)][input.dataset.key] = input.value;
            fittingsData().value = JSON.stringify(rows);
            fittingsData().dispatchEvent(new Event("change", { bubbles: true }));
        });

        body?.addEventListener("click", event => {
            const tr = event.target.closest("tr[data-index]");

            if (!event.target.closest("[data-remove]") || !tr) {
                return;
            }

            const rows = readFittings();
            rows.splice(Number(tr.dataset.index), 1);
            writeFittings(rows);
            renderFittingRows();
            pressure();
        });

        // Restored or shared data rebuilds the rows.
        document.addEventListener("ductculator:inputs-restored", renderFittingRows);
        renderFittingRows();
    }

    bindFittings();
    DC.live("reverseWorkspace", reverse);
    DC.live("pressureWorkspace", pressure);
})();
