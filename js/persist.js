// =====================================================
// DUCTCULATOR PRO
// persist.js
// Remembers inputs between visits, saved jobs, share links,
// print and reset. Loaded FIRST so remembered values are in the
// fields before any calculator runs.
// =====================================================

(function () {
    "use strict";

    const INPUTS_KEY = "ductculator:inputs:v1";
    const JOBS_KEY = "ductculator:jobs:v1";

    // Fields that always start from the shop defaults.
    const NEVER_RESTORE = new Set([
        "transitionOffsetWidthMode",
        "transitionOffsetDepthMode"
    ]);

    const FIELD_SELECTOR = "input[id], select[id], textarea[id]";

    const SCREEN_NAMES = {
        airflowWorkspace: "Airflow",
        pressureWorkspace: "Pressure Loss",
        reverseWorkspace: "Reverse Calculator",
        equivalentWorkspace: "Equivalent Sizes",
        sheetMetalWorkspace: "Elbow Offset",
        roundWorkspace: "Round Fittings",
        rectWorkspace: "Rect Fittings",
        transitionWorkspace: "Transition Splitter",
        mathWorkspace: "Layout Math",
        takeoffWorkspace: "Material Takeoff"
    };

    const storage = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (error) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                // Private mode or full storage: remembering is a convenience only.
            }
        }
    };

    function isField(element) {
        return (
            element.matches?.(FIELD_SELECTOR) &&
            element.type !== "button" &&
            element.type !== "file" &&
            !element.hasAttribute("data-no-persist") &&
            !element.closest("[data-no-persist]") &&
            Boolean(element.closest(".workspace")) &&
            !element.closest("#proCalcWorkspace")
        );
    }

    function fieldsIn(root) {
        return [...root.querySelectorAll(FIELD_SELECTOR)].filter(isField);
    }

    function readField(element) {
        return element.type === "checkbox" ? element.checked : element.value;
    }

    function writeField(element, value) {
        if (element.type === "checkbox") {
            element.checked = Boolean(value);
        } else if (element.tagName === "SELECT") {
            if ([...element.options].some(option => option.value === String(value))) {
                element.value = String(value);
            }
        } else {
            element.value = value ?? "";
        }
    }

    // Defaults as written in the page, for "Reset to defaults".
    const defaults = {};

    function captureDefaults() {
        for (const element of document.querySelectorAll(FIELD_SELECTOR)) {
            if (!isField(element)) {
                continue;
            }

            if (element.type === "checkbox") {
                defaults[element.id] = element.defaultChecked;
            } else if (element.tagName === "SELECT") {
                const selected = [...element.options].find(option => option.defaultSelected) || element.options[0];
                defaults[element.id] = selected ? selected.value : "";
            } else {
                defaults[element.id] = element.defaultValue;
            }
        }
    }

    /*
     * Put values into fields and let each screen react: selects first
     * (they switch modes), then checkboxes, then text and number fields.
     */
    function applyValues(values, root = document) {
        const fields = fieldsIn(root).filter(element => element.id in values);

        for (const element of fields) {
            writeField(element, values[element.id]);
        }

        const order = element =>
            element.tagName === "SELECT" ? 0 : element.type === "checkbox" ? 1 : 2;

        fields
            .slice()
            .sort((a, b) => order(a) - order(b))
            .forEach(element => {
                const type = element.tagName === "SELECT" || element.type === "checkbox" || element.type === "hidden" || element.tagName === "TEXTAREA"
                    ? "change"
                    : "input";
                element.dispatchEvent(new Event(type, { bubbles: true }));
            });

        document.dispatchEvent(new CustomEvent("ductculator:inputs-restored"));
    }

    // ---------- remember inputs between visits ----------

    captureDefaults();

    const remembered = storage.get(INPUTS_KEY, {});

    for (const element of document.querySelectorAll(FIELD_SELECTOR)) {
        if (isField(element) && element.id in remembered && !NEVER_RESTORE.has(element.id)) {
            writeField(element, remembered[element.id]);
        }
    }

    let saveTimer = null;

    function saveInputs() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            const values = {};

            for (const element of document.querySelectorAll(FIELD_SELECTOR)) {
                if (isField(element) && !NEVER_RESTORE.has(element.id)) {
                    values[element.id] = readField(element);
                }
            }

            storage.set(INPUTS_KEY, values);
        }, 250);
    }

    document.addEventListener("input", event => isField(event.target) && saveInputs(), true);
    document.addEventListener("change", event => isField(event.target) && saveInputs(), true);

    // ---------- jobs, share, print, reset ----------

    function screenValues(screen) {
        const values = {};

        for (const element of fieldsIn(screen)) {
            values[element.id] = readField(element);
        }

        return values;
    }

    function encodeShare(screenId, values) {
        const json = JSON.stringify({ s: screenId, f: values });
        return btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    function decodeShare(text) {
        const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(decodeURIComponent(escape(atob(base64))));
    }

    function jobs() {
        const list = storage.get(JOBS_KEY, []);
        return Array.isArray(list) ? list : [];
    }

    function esc(text) {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function renderJobList(tools, screenId) {
        const list = tools.querySelector(".job-list");
        const mine = jobs().filter(job => job.screen === screenId);

        list.innerHTML = mine.length
            ? mine
                .map(job => `
                    <li>
                        <button type="button" class="job-open" data-job="open" data-id="${esc(job.id)}">${esc(job.name)}</button>
                        <span class="job-date">${esc(new Date(job.savedAt).toLocaleDateString())}</span>
                        <button type="button" class="job-delete" data-job="delete" data-id="${esc(job.id)}">Delete</button>
                    </li>`)
                .join("")
            : `<li class="job-empty">No saved jobs on this screen yet.</li>`;
    }

    function status(tools, text) {
        const line = tools.querySelector(".job-status");
        line.textContent = text;
        clearTimeout(line._timer);
        line._timer = setTimeout(() => (line.textContent = ""), 4000);
    }

    function buildTools(screen) {
        const header = screen.querySelector(".content > header");

        if (!header || header.querySelector(".job-tools")) {
            return;
        }

        const tools = document.createElement("details");
        tools.className = "job-tools";
        tools.setAttribute("data-no-persist", "");
        tools.innerHTML = `
            <summary>Jobs and sharing</summary>
            <div class="job-body">
                <form class="job-save">
                    <input type="text" class="job-name" placeholder="Job name, e.g. 214 grid C" aria-label="Job name" maxlength="60">
                    <button type="submit" class="job-btn job-primary">Save job</button>
                </form>
                <ul class="job-list"></ul>
                <div class="job-actions">
                    <button type="button" class="job-btn" data-job="share">Copy share link</button>
                    <button type="button" class="job-btn" data-job="print">Print sheet</button>
                    <button type="button" class="job-btn" data-job="reset">Reset to defaults</button>
                </div>
                <input type="text" class="job-link" readonly hidden aria-label="Share link">
                <p class="job-status" aria-live="polite"></p>
            </div>
        `;

        header.appendChild(tools);
        renderJobList(tools, screen.id);

        tools.querySelector(".job-save").addEventListener("submit", event => {
            event.preventDefault();
            const input = tools.querySelector(".job-name");
            const name = input.value.trim() || `${SCREEN_NAMES[screen.id] || "Job"} ${new Date().toLocaleString()}`;
            const list = jobs();

            list.unshift({
                id: String(Date.now()),
                name,
                screen: screen.id,
                fields: screenValues(screen),
                savedAt: Date.now()
            });

            storage.set(JOBS_KEY, list.slice(0, 200));
            input.value = "";
            renderJobList(tools, screen.id);
            status(tools, `Saved "${name}".`);
        });

        tools.addEventListener("click", async event => {
            const button = event.target.closest("[data-job]");

            if (!button) {
                return;
            }

            const action = button.dataset.job;

            if (action === "open") {
                const job = jobs().find(item => item.id === button.dataset.id);

                if (job) {
                    applyValues(job.fields, screen);
                    status(tools, `Opened "${job.name}".`);
                }
            }

            if (action === "delete") {
                // Two taps to delete, without a browser dialog.
                if (button.dataset.armed !== "1") {
                    button.dataset.armed = "1";
                    button.textContent = "Tap again to delete";
                    setTimeout(() => {
                        button.dataset.armed = "";
                        button.textContent = "Delete";
                    }, 3000);
                    return;
                }

                storage.set(JOBS_KEY, jobs().filter(item => item.id !== button.dataset.id));
                renderJobList(tools, screen.id);
                status(tools, "Job deleted.");
            }

            if (action === "share") {
                const link =
                    location.href.split("#")[0] +
                    "#job=" +
                    encodeShare(screen.id, screenValues(screen));
                const field = tools.querySelector(".job-link");

                try {
                    await navigator.clipboard.writeText(link);
                    field.hidden = true;
                    status(tools, "Link copied. Anyone who opens it sees this screen with these numbers.");
                } catch (error) {
                    field.value = link;
                    field.hidden = false;
                    field.select();
                    status(tools, "Copy this link to share these numbers.");
                }
            }

            if (action === "print") {
                tools.open = false;
                window.print();
            }

            if (action === "reset") {
                const values = {};

                for (const element of fieldsIn(screen)) {
                    if (element.id in defaults) {
                        values[element.id] = defaults[element.id];
                    }
                }

                applyValues(values, screen);
                status(tools, "Back to the default values.");
            }
        });
    }

    document.querySelectorAll(".workspace").forEach(screen => {
        if (screen.id !== "proCalcWorkspace") {
            buildTools(screen);
        }
    });

    // ---------- after every script has loaded ----------

    window.addEventListener("load", () => {
        // Let every screen catch up with the remembered values.
        const restored = [...document.querySelectorAll(FIELD_SELECTOR)].filter(
            element => isField(element) && element.id in remembered && !NEVER_RESTORE.has(element.id)
        );

        if (restored.length) {
            const values = {};
            restored.forEach(element => (values[element.id] = readField(element)));
            applyValues(values);
        }

        // A shared link opens its screen with its numbers.
        const match = location.hash.match(/^#job=(.+)$/);

        if (match) {
            try {
                const shared = decodeShare(match[1]);
                const screen = document.getElementById(shared.s);

                if (screen && shared.f && typeof shared.f === "object") {
                    window.DuctNav?.show(shared.s);
                    applyValues(shared.f, screen);
                }
            } catch (error) {
                console.warn("Ductculator: could not read the shared link.", error);
            }

            history.replaceState(null, "", location.pathname + location.search);
        }
    });

    window.DuctPersist = { applyValues, encodeShare, decodeShare };
})();
