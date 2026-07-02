// ==========================================
// DUCTCULATOR PRO
// app.js
// ==========================================

// ---------- Navigation ----------

const dashboard = document.getElementById("dashboard");
const airflowWorkspace = document.getElementById("airflowWorkspace");

const openAirflow = document.getElementById("openAirflow");
const goHome = document.getElementById("goHome");

openAirflow.addEventListener("click", () => {

    dashboard.classList.remove("active");
    airflowWorkspace.classList.add("active");

});

goHome.addEventListener("click", () => {

    airflowWorkspace.classList.remove("active");
    dashboard.classList.add("active");

});

// ---------- Inputs ----------

const methodSelect = document.getElementById("methodSelect");

const velocityGroup = document.getElementById("velocityGroup");
const frictionGroup = document.getElementById("frictionGroup");

const calculateBtn = document.getElementById("calculateBtn");

const cfmInput = document.getElementById("cfmInput");
const velocityInput = document.getElementById("velocityInput");
const frictionInput = document.getElementById("frictionInput");

const results = document.getElementById("results");

// ---------- Method Changed ----------

methodSelect.addEventListener("change", () => {

    if (methodSelect.value === "constantVelocity") {

        velocityGroup.style.display = "block";
        frictionGroup.style.display = "none";

    } else {

        velocityGroup.style.display = "none";
        frictionGroup.style.display = "block";

    }

});

// ---------- Calculate ----------

calculateBtn.addEventListener("click", () => {

    const cfm = Number(cfmInput.value);

    if (cfm <= 0) {

        results.innerHTML = "<strong>Please enter a valid CFM.</strong>";
        return;

    }

    // -----------------------
    // CONSTANT VELOCITY
    // -----------------------

    if (methodSelect.value === "constantVelocity") {

        const velocity = Number(velocityInput.value);

        const data = calculateConstantVelocity(cfm, velocity);

        if (!data) {

            results.innerHTML = "<strong>Invalid values.</strong>";
            return;

        }

        results.innerHTML = `

            <h2>${data.round}" Round</h2>

            <hr>

            <p>
                <strong>Recommended Size</strong><br>
                ${data.round}"
            </p>

            <p>
                <strong>Exact Diameter</strong><br>
                ${data.exactDiameter.toFixed(2)}"
            </p>

            <p>
                <strong>Actual Velocity</strong><br>
                ${Math.round(data.actualVelocity)} FPM
            </p>

            <p>
                <strong>Duct Area</strong><br>
                ${data.area.toFixed(3)} sq ft
            </p>

        `;

    }

    // -----------------------
    // EQUAL FRICTION
    // -----------------------

    else {

        results.innerHTML = `

            <h2>Coming Soon</h2>

            <p>

                The Equal Friction engine
                will use ASHRAE equations.

            </p>

        `;

    }

});

console.log("Ductculator Pro Loaded");