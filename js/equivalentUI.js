// =====================================================
// DUCTCULATOR PRO
// equivalentUI.js
// Equivalent Sizes Page Controls
// =====================================================

const equivalentRoundInput =
    document.getElementById("equivalentRoundInput");

const equivalentSourceSize =
    document.getElementById("equivalentSourceSize");

const equivalentSourceArea =
    document.getElementById("equivalentSourceArea");

const equivalentRectangleRows =
    document.getElementById("equivalentRectangleRows");

const equivalentOvalRows =
    document.getElementById("equivalentOvalRows");

function updateEquivalentSizes() {

    const diameter = Number(equivalentRoundInput.value);

    const data = convertRoundToEquivalentSizes(diameter);

    if (!data) {

        equivalentSourceSize.textContent = "Invalid size";
        equivalentSourceArea.textContent = "—";

        equivalentRectangleRows.innerHTML = "";
        equivalentOvalRows.innerHTML = "";

        return;

    }

    equivalentSourceSize.textContent =
        `${data.sourceSize}" Round`;

    equivalentSourceArea.textContent =
        `${data.targetArea.toFixed(3)} ft²`;

    equivalentRectangleRows.innerHTML =
        data.rectangles.map(rectangle => `

            <tr>

                <td>
                    ${rectangle.width}" × ${rectangle.height}"
                </td>

                <td class="${
                    getEquivalentDifferenceClass(
                        rectangle.areaDifference
                    )
                }">

                    ${formatEquivalentDifference(
                        rectangle.areaDifference
                    )}

                </td>

                <td>
                    ${rectangle.area.toFixed(3)} ft²
                </td>

            </tr>

        `).join("");

    equivalentOvalRows.innerHTML =
        data.flatOvals.map(oval => `

            <tr>

                <td>
                    ${oval.width}" × ${oval.height}"
                </td>

                <td class="${
                    getEquivalentDifferenceClass(
                        oval.areaDifference
                    )
                }">

                    ${formatEquivalentDifference(
                        oval.areaDifference
                    )}

                </td>

                <td>
                    ${oval.area.toFixed(3)} ft²
                </td>

            </tr>

        `).join("");

}

equivalentRoundInput.addEventListener(
    "input",
    updateEquivalentSizes
);

updateEquivalentSizes();

console.log("Equivalent Sizes UI Loaded");