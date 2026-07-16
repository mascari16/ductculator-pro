// =====================================================
// DUCTCULATOR PRO
// equivalentUI.js
// Equivalent Sizes Page Controls
// =====================================================


// ------------------------------------
// Elements
// ------------------------------------

const equivalentShape =
    document.getElementById(
        "equivalentShape"
    );

const equivalentRoundGroup =
    document.getElementById(
        "equivalentRoundGroup"
    );

const equivalentRectangleGroup =
    document.getElementById(
        "equivalentRectangleGroup"
    );

const equivalentOvalGroup =
    document.getElementById(
        "equivalentOvalGroup"
    );

const equivalentRoundInput =
    document.getElementById(
        "equivalentRoundInput"
    );

const equivalentRectangleWidth =
    document.getElementById(
        "equivalentRectangleWidth"
    );

const equivalentRectangleHeight =
    document.getElementById(
        "equivalentRectangleHeight"
    );

const equivalentOvalWidth =
    document.getElementById(
        "equivalentOvalWidth"
    );

const equivalentOvalHeight =
    document.getElementById(
        "equivalentOvalHeight"
    );

const equivalentSourceSize =
    document.getElementById(
        "equivalentSourceSize"
    );

const equivalentSourceArea =
    document.getElementById(
        "equivalentSourceArea"
    );

const equivalentResultOneTitle =
    document.getElementById(
        "equivalentResultOneTitle"
    );

const equivalentResultTwoTitle =
    document.getElementById(
        "equivalentResultTwoTitle"
    );

const equivalentResultOneRows =
    document.getElementById(
        "equivalentResultOneRows"
    );

const equivalentResultTwoRows =
    document.getElementById(
        "equivalentResultTwoRows"
    );


// ------------------------------------
// Input Group Switching
// ------------------------------------

function updateEquivalentInputGroups() {

    equivalentRoundGroup.style.display =
        "none";

    equivalentRectangleGroup.style.display =
        "none";

    equivalentOvalGroup.style.display =
        "none";

    if (
        equivalentShape.value ===
        "round"
    ) {

        equivalentRoundGroup.style.display =
            "block";

    }

    if (
        equivalentShape.value ===
        "rectangle"
    ) {

        equivalentRectangleGroup.style.display =
            "block";

    }

    if (
        equivalentShape.value ===
        "flatOval"
    ) {

        equivalentOvalGroup.style.display =
            "block";

    }

}


// ------------------------------------
// Size Display
// ------------------------------------

function formatEquivalentOptionSize(
    option
) {

    if (option.shape === "round") {

        return `${option.diameter}" Round`;

    }

    return (
        `${option.width}" × ` +
        `${option.height}"`
    );

}


// ------------------------------------
// Build Result Rows
// ------------------------------------

function buildEquivalentRows(options) {

    return options.map(option => `

        <tr>

            <td>

                ${formatEquivalentOptionSize(
                    option
                )}

            </td>

            <td class="${
                getEquivalentDifferenceClass(
                    option.equivalentDifference
                )
            }">

                ${formatEquivalentDifference(
                    option.equivalentDifference
                )}

            </td>

            <td class="${
                getEquivalentDifferenceClass(
                    option.areaDifference
                )
            }">

                ${formatEquivalentDifference(
                    option.areaDifference
                )}

            </td>

            <td>

                ${option.area.toFixed(3)} ft²

            </td>

        </tr>

    `).join("");

}


// ------------------------------------
// Update Calculator
// ------------------------------------

function updateEquivalentSizes() {

    let data = null;

    if (
        equivalentShape.value ===
        "round"
    ) {

        data =
            convertRoundToEquivalentSizes(
                equivalentRoundInput.value
            );

    }

    if (
        equivalentShape.value ===
        "rectangle"
    ) {

        data =
            convertRectangleToEquivalentSizes(
                equivalentRectangleWidth.value,
                equivalentRectangleHeight.value
            );

    }

    if (
        equivalentShape.value ===
        "flatOval"
    ) {

        data =
            convertFlatOvalToEquivalentSizes(
                equivalentOvalWidth.value,
                equivalentOvalHeight.value
            );

    }

    if (!data) {

        equivalentSourceSize.textContent =
            "Invalid size";

        equivalentSourceArea.textContent =
            "—";

        equivalentResultOneRows.innerHTML =
            "";

        equivalentResultTwoRows.innerHTML =
            "";

        return;

    }

    equivalentSourceSize.textContent =
        data.sourceLabel;

    equivalentSourceArea.textContent =
        `${data.targetArea.toFixed(3)} ft²`;

    equivalentResultOneTitle.textContent =
        data.resultOneTitle;

    equivalentResultTwoTitle.textContent =
        data.resultTwoTitle;

    equivalentResultOneRows.innerHTML =
        buildEquivalentRows(
            data.resultOneOptions
        );

    equivalentResultTwoRows.innerHTML =
        buildEquivalentRows(
            data.resultTwoOptions
        );

}


// ------------------------------------
// Event Listeners
// ------------------------------------

equivalentShape.addEventListener(
    "change",
    () => {

        updateEquivalentInputGroups();
        updateEquivalentSizes();

    }
);

equivalentRoundInput.addEventListener(
    "input",
    updateEquivalentSizes
);

equivalentRectangleWidth.addEventListener(
    "input",
    updateEquivalentSizes
);

equivalentRectangleHeight.addEventListener(
    "input",
    updateEquivalentSizes
);

equivalentOvalWidth.addEventListener(
    "input",
    updateEquivalentSizes
);

equivalentOvalHeight.addEventListener(
    "input",
    updateEquivalentSizes
);


// ------------------------------------
// Initial Load
// ------------------------------------

updateEquivalentInputGroups();
updateEquivalentSizes();

console.log(
    "Equivalent Sizes UI Loaded"
);