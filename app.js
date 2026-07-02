// =========================================
// DUCTCULATOR PRO
// Version 0.1
// =========================================

// Pages
const dashboard = document.getElementById("dashboard");
const airflowWorkspace = document.getElementById("airflowWorkspace");

// Buttons
const openAirflow = document.getElementById("openAirflow");
const goHome = document.getElementById("goHome");

// ---------------------------
// Open Airflow Calculator
// ---------------------------
openAirflow.addEventListener("click", () => {

    dashboard.classList.remove("active");

    airflowWorkspace.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});

// ---------------------------
// Return Home
// ---------------------------
goHome.addEventListener("click", () => {

    airflowWorkspace.classList.remove("active");

    dashboard.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});

// =========================================
// Future Calculators
// =========================================

// Pressure Loss
// Equivalent Sizes
// Reverse Calculator
// Material Estimator
// Settings

console.log("Ductculator Pro Loaded");