// =====================================================
// DUCTCULATOR PRO
// app.js
// =====================================================

// ----------------------------
// Dashboard Navigation
// ----------------------------

const dashboard = document.getElementById("dashboard");
const airflowWorkspace = document.getElementById("airflowWorkspace");

document.getElementById("openAirflow").addEventListener("click", () => {

    dashboard.classList.remove("active");
    airflowWorkspace.classList.add("active");

});

document.getElementById("goHome").addEventListener("click", () => {

    airflowWorkspace.classList.remove("active");
    dashboard.classList.add("active");

});

// Sidebar Toggle
const sidebar = document.querySelector(".sidebar");
const toggleSidebar = document.getElementById("toggleSidebar");

toggleSidebar.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

});

// ----------------------------
// Calculator Controls
// ----------------------------

const methodSelect = document.getElementById("methodSelect");

const velocityGroup = document.getElementById("velocityGroup");
const frictionGroup = document.getElementById("frictionGroup");

const cfmInput = document.getElementById("cfmInput");
const velocityInput = document.getElementById("velocityInput");
const frictionInput = document.getElementById("frictionInput");

const calculateBtn = document.getElementById("calculateBtn");

const results = document.getElementById("results");

cfmInput.addEventListener("input", updateCalculator);

velocityInput.addEventListener("input", updateCalculator);

frictionInput.addEventListener("input", updateCalculator);

methodSelect.addEventListener("change", () => {

    if (methodSelect.value === "constantVelocity") {

        velocityGroup.style.display = "block";
        frictionGroup.style.display = "none";

    } else {

        velocityGroup.style.display = "none";
        frictionGroup.style.display = "block";

    }

    updateCalculator();

});

// ----------------------------
// Switch Calculation Method
// ----------------------------

methodSelect.addEventListener("change", () => {

    if (methodSelect.value === "constantVelocity") {

        velocityGroup.style.display = "block";
        frictionGroup.style.display = "none";

    } else {

        velocityGroup.style.display = "none";
        frictionGroup.style.display = "block";

    }

});

function updateCalculator() {

    const cfm = Number(cfmInput.value);

    if (cfm <= 0) {

        results.innerHTML = "<h2>Please enter a valid CFM.</h2>";
        return;

    }

    if (methodSelect.value === "constantVelocity") {

        const velocity = Number(velocityInput.value);

        const data = calculateConstantVelocity(cfm, velocity);

        if (!data) {

            results.innerHTML = "<h2>Invalid Values</h2>";
            return;

        }

        results.innerHTML = buildResults(data);
        return;

    }

    results.innerHTML = `

        <div class="result-card">

            <div class="result-header">

                <h2>Equal Friction</h2>

                <p>Coming Soon</p>

            </div>

        </div>

    `;

}

updateCalculator();

console.log("Ductculator Pro Loaded");