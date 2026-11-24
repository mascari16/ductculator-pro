// =====================================================
// DUCTCULATOR PRO
// takeoff.js
// Material takeoff: sheet area and galvanized weight by gauge.
// =====================================================

(function () {
    "use strict";

    const DC = window.DC;
    const SCREEN = "takeoffWorkspace";

    // Nominal galvanized steel sheet weight, lb per ft².
    const GALV_LB_PER_SQFT = {
        30: 0.656, 28: 0.781, 26: 0.906, 24: 1.156, 22: 1.406,
        20: 1.656, 18: 2.156, 16: 2.656, 14: 3.281, 12: 4.531, 10: 5.781
    };

    const GAUGES = Object.keys(GALV_LB_PER_SQFT).map(Number).sort((a, b) => b - a);

    const store = () => DC.get("toData");

    function read() {
        try {
            const rows = JSON.parse(store()?.value || "[]");
            return Array.isArray(rows) ? rows : [];
        } catch (error) {
            return [];
        }
    }

    function write(rows, rerender) {
        const s = store();

        if (!s) {
            return;
        }

        s.value = JSON.stringify(rows);

        if (rerender) {
            renderRows();
        }

        s.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function gaugeOptions(selected) {
        return GAUGES.map(g => `<option value="${g}"${Number(selected) === g ? " selected" : ""}>${g} ga</option>`).join("");
    }

    function renderRows() {
        const body = DC.get("toRows");

        if (!body) {
            return;
        }

        const rows = read();

        body.innerHTML = rows.length
            ? rows.map((row, index) => `
                <tr data-index="${index}">
                    <td><input type="text" data-key="name" value="${DC.esc(row.name)}" placeholder="Item" aria-label="Item name"></td>
                    <td>
                        <select data-key="shape" aria-label="Shape">
                            <option value="rect"${row.shape !== "round" ? " selected" : ""}>Rect</option>
                            <option value="round"${row.shape === "round" ? " selected" : ""}>Round</option>
                        </select>
                    </td>
                    <td><input type="text" data-key="size" value="${DC.esc(row.size)}" inputmode="decimal" placeholder="${row.shape === "round" ? "Dia" : "24 x 12"}" aria-label="Size"></td>
                    <td><input type="text" data-key="length" value="${DC.esc(row.length)}" inputmode="decimal" placeholder="60" aria-label="Length"></td>
                    <td><input type="number" data-key="qty" value="${DC.esc(row.qty)}" min="0" step="1" inputmode="numeric" aria-label="Quantity"></td>
                    <td><select data-key="gauge" aria-label="Gauge">${gaugeOptions(row.gauge)}</select></td>
                    <td class="row-loss" data-area></td>
                    <td><button type="button" class="row-remove" data-remove aria-label="Remove item">Remove</button></td>
                </tr>`).join("")
            : `<tr><td colspan="8" class="row-empty">No items yet. Add duct pieces to total the sheet.</td></tr>`;
    }

    /*
     * Rect size "24 x 12" (or 24×12, 24 by 12); round size is the diameter.
     * Surface area: rect = 2(W + H) × length, round = π × D × length.
     */
    function surfaceSqFt(row) {
        const length = DC.parse(row.length);

        if (!(length > 0)) {
            return NaN;
        }

        if (row.shape === "round") {
            const D = DC.parse(row.size);
            return D > 0 ? Math.PI * D * length / 144 : NaN;
        }

        const parts = String(row.size || "").toLowerCase().split(/\s*(?:x|×|by|\*)\s*/);

        if (parts.length !== 2) {
            return NaN;
        }

        const W = DC.parse(parts[0]);
        const H = DC.parse(parts[1]);

        return W > 0 && H > 0 ? 2 * (W + H) * length / 144 : NaN;
    }

    function compute() {
        const out = DC.get("takeoffResults");
        const allowance = DC.num("toAllow") || 0;
        const factor = 1 + Math.max(0, allowance) / 100;
        const rows = read();
        const byGauge = {};
        let bad = 0;

        document.querySelectorAll("#toRows tr[data-index]").forEach(tr => {
            const row = rows[Number(tr.dataset.index)] || {};
            const each = surfaceSqFt(row);
            const qty = Number(row.qty) || 0;
            const cell = tr.querySelector("[data-area]");

            if (!Number.isFinite(each)) {
                if (cell) cell.textContent = "—";
                if (row.size || row.length) bad += 1;
                return;
            }

            const area = each * qty * factor;
            const gauge = Number(row.gauge) || 24;
            byGauge[gauge] = (byGauge[gauge] || 0) + area;
            if (cell) cell.textContent = `${area.toFixed(1)} ft²`;
        });

        const gauges = Object.keys(byGauge).map(Number).sort((a, b) => b - a);

        if (!gauges.length) {
            return DC.renderProblem(
                out,
                "Add duct pieces",
                "Enter a size (24 x 12, or a diameter for round), a length and a quantity for each piece."
            );
        }

        let totalArea = 0;
        let totalWeight = 0;

        const gaugeRows = gauges.map(g => {
            const area = byGauge[g];
            const weight = area * GALV_LB_PER_SQFT[g];
            totalArea += area;
            totalWeight += weight;
            return { label: `${g} ga`, value: `${area.toFixed(1)} ft² · ${Math.round(weight).toLocaleString()} lb` };
        });

        DC.renderRows(out, [
            { label: "Total weight", value: `${Math.round(totalWeight).toLocaleString()} lb`, main: true },
            { label: "Total sheet", value: `${totalArea.toFixed(1)} ft²` },
            allowance > 0 && { label: "Allowance included", value: `${allowance}%` },
            { head: "By gauge" },
            ...gaugeRows,
            bad > 0 && { text: `${bad} item${bad > 1 ? "s" : ""} skipped: check the size and length.` },
            { text: "Surface area of the duct walls only, galvanized steel at nominal weights. Add your seam, lock and waste allowance above." }
        ]);
    }

    function bind() {
        const body = DC.get("toRows");

        DC.get("toAdd")?.addEventListener("click", () => {
            const rows = read();
            const last = rows[rows.length - 1];
            rows.push({ name: "", shape: last?.shape || "rect", size: "", length: "", qty: 1, gauge: last?.gauge || 24 });
            write(rows, true);
            body?.querySelector("tr:last-child input")?.focus();
        });

        const update = event => {
            const field = event.target.closest("[data-key]");
            const tr = event.target.closest("tr[data-index]");

            if (!field || !tr) {
                return;
            }

            event.stopPropagation();
            const rows = read();
            rows[Number(tr.dataset.index)][field.dataset.key] = field.value;
            write(rows, field.dataset.key === "shape");
        };

        body?.addEventListener("input", update);
        body?.addEventListener("change", update);

        body?.addEventListener("click", event => {
            const tr = event.target.closest("tr[data-index]");

            if (!event.target.closest("[data-remove]") || !tr) {
                return;
            }

            const rows = read();
            rows.splice(Number(tr.dataset.index), 1);
            write(rows, true);
        });

        document.addEventListener("ductculator:inputs-restored", renderRows);
        renderRows();
    }

    bind();
    DC.live(SCREEN, compute);
})();
