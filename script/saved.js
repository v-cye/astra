function displaySavedObjects() {
    const savedList =
        document.getElementById("savedObjectList");

    if (!savedList) {
        return;
    }

    const savedObjects = JSON.parse(
        localStorage.getItem("astraSavedObjects") || "[]"
    );

    if (savedObjects.length === 0) {
        savedList.innerHTML = `
            <p class="saved-empty">
                No saved objects yet.
            </p>
        `;

        return;
    }

    let html = "";

    for (const object of savedObjects) {
        html += `
            <div class="saved-object-row">

                <div class="saved-object-main">

                    <span class="saved-object-icon">
                        ${getSavedObjectIcon(object.type)}
                    </span>

                    <div>
                        <span class="saved-object-name">
                            ${object.name}
                        </span>

                        <span class="saved-object-type">
                            ${formatSavedObjectType(object.type)}
                        </span>
                    </div>

                </div>

                <button
                    class="saved-remove-button"
                    data-id="${object.id}"
                >
                    ❤︎⁠
                </button>

            </div>
        `;
    }

    savedList.innerHTML = html;

    setupSavedRemoveButtons();
}


function formatSavedObjectType(type) {
    const names = {
        star: "Star",
        planet: "Planet",
        moon: "Moon",
        sun: "Sun",
        dso: "Deep Sky Object"
    };

    return names[type] || "Celestial Object";
}


function getSavedObjectIcon(type) {
    const icons = {
        star: "★",
        planet: "◉",
        moon: "◐",
        sun: "☀",
        dso: "◇"
    };

    return icons[type] || "•";
}


function setupSavedRemoveButtons() {
    document
        .querySelectorAll(".saved-remove-button")
        .forEach(button => {
            button.addEventListener("click", () => {
                let savedObjects = JSON.parse(
                    localStorage.getItem("astraSavedObjects") || "[]"
                );

                savedObjects = savedObjects.filter(
                    object =>
                        object.id !== button.dataset.id
                );

                localStorage.setItem(
                    "astraSavedObjects",
                    JSON.stringify(savedObjects)
                );

                displaySavedObjects();
            });
        });
}