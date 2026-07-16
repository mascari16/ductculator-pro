// =====================================================
// DUCTCULATOR PRO
// equivalentUI.js
// Equivalent Sizes Page Controls
// =====================================================

const equivalentRoundInput =
    document.getElementById("equivalentRoundInput");

const equivalentShape =
    document.getElementById("equivalentShape");

const equivalentRoundGroup =
    document.getElementById("equivalentRoundGroup");

const equivalentRectangleGroup =
    document.getElementById("equivalentRectangleGroup");

const equivalentOvalGroup =
    document.getElementById("equivalentOvalGroup");

const equivalentRectangleWidth =
    document.getElementById("equivalentRectangleWidth");

const equivalentRectangleHeight =
    document.getElementById("equivalentRectangleHeight");

const equivalentOvalWidth =
    document.getElementById("equivalentOvalWidth");

const equivalentOvalHeight =
    document.getElementById("equivalentOvalHeight");    

const equivalentSourceSize =
    document.getElementById("equivalentSourceSize");

const equivalentSourceArea =
    document.getElementById("equivalentSourceArea");

const equivalentRectangleRows =
    document.getElementById("equivalentRectangleRows");

const equivalentOvalRows =
    document.getElementById("equivalentOvalRows");

function updateEquivalentInputGroups() {

    equivalentRoundGroup.style.display = "none";
    equivalentRectangleGroup.style.display = "none";
    equivalentOvalGroup.style.display = "none";

    if (equivalentShape.value === "round") {

        equivalentRoundGroup.style.display = "block";

    }

    if (equivalentShape.value === "rectangle") {

        equivalentRectangleGroup.style.display = "block";

    }

    if (equivalentShape.value === "flatOval") {

        equivalentOvalGroup.style.display = "block";

    }

}    

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
            rectangle.equivalentDifference
        )
    }">

        ${formatEquivalentDifference(
            rectangle.equivalentDifference
        )}

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
            oval.equivalentDifference
        )
    }">

        ${formatEquivalentDifference(
            oval.equivalentDifference
        )}

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

equivalentShape.addEventListener("change", () => {

    updateEquivalentInputGroups();

});

equivalentRoundInput.addEventListener(
    "input",
    updateEquivalentSizes
);

updateEquivalentInputGroups();
updateEquivalentSizes();

console.log("Equivalent Sizes UI Loaded");