let selectedSkyObject = null;
let skyObjectsOnScreen = [];

let pointerStartX = 0;
let pointerStartY = 0;
let didDrag = false;

let activePointers = new Map();
let pinchDistance = null;
let redrawRequested = false;

function requestSkyRedraw() {
    if (redrawRequested) return;

    redrawRequested = true;

    requestAnimationFrame(() => {
        drawSky();
        redrawRequested = false;
    });
}


skyCanvas.addEventListener("pointerdown", event => {
    event.preventDefault();

    activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
    });

    skyCanvas.setPointerCapture(event.pointerId);

    if (activePointers.size === 1) {
        isDragging = true;
        didDrag = false;

        pointerStartX = event.clientX;
        pointerStartY = event.clientY;

        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
    }

    if (activePointers.size === 2) {
        isDragging = false;
        pinchDistance = getPinchDistance();
    }
});


skyCanvas.addEventListener("pointermove", event => {
    if (!activePointers.has(event.pointerId)) return;
    
    event.preventDefault();

    activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
    });

    if (activePointers.size === 2) {
        const newDistance = getPinchDistance();

        if (pinchDistance) {
            skyZoom *= newDistance / pinchDistance;
            skyZoom = Math.max(0.7, Math.min(5, skyZoom));

            requestSkyRedraw();
        }

        pinchDistance = newDistance;
        return;
    }

    if (!isDragging) return;

    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;

    const totalX = event.clientX - pointerStartX;
    const totalY = event.clientY - pointerStartY;

    if (Math.hypot(totalX, totalY) > 5) {
        didDrag = true;
    }

    const sensitivity = 0.18 / skyZoom;

    const yaw = dx * sensitivity * Math.PI / 180;
    const pitch = dy * sensitivity * Math.PI / 180;

    const worldUp = {
        x: 0,
        y: 1,
        z: 0
    };

    cameraForward = rotateVector(cameraForward, worldUp, yaw);
    cameraUp = rotateVector(cameraUp, worldUp, yaw);
    
    const cameraRight = normalize(cross(cameraForward, cameraUp));

    cameraForward = rotateVector(cameraForward, cameraRight, pitch);
    cameraUp = rotateVector(cameraUp, cameraRight, pitch);
    cameraForward = normalize(cameraForward);

    const correctedRight = normalize(cross(cameraForward, cameraUp));

    cameraUp = normalize(cross(correctedRight, cameraForward));

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    requestSkyRedraw();
});


function endPointer(event) {
    activePointers.delete(event.pointerId);

    if(skyCanvas.hasPointerCapture(event.pointerId)) {
        skyCanvas.releasePointerCapture(event.pointerId);
    }

    if (activePointers.size === 0) {
        isDragging = false;
        pinchDistance = null;
        return;
    }

    if (activePointers.size === 1) {
        const remaining = activePointers.values().next().value;

        lastPointerX = remaining.x;
        lastPointerY = remaining.y;

        isDragging = true;
        pinchDistance = null;
    }
}

skyCanvas.addEventListener("pointerup", endPointer);
skyCanvas.addEventListener("pointercancel", endPointer);

function getPinchDistance() {
    const points = Array.from(activePointers.values());

    if (points.length < 2) return null;

    return Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
    );
}

skyCanvas.addEventListener("wheel", event => {
    event.preventDefault();

    if (event.deltaY < 0) {
        skyZoom *= 1.1;
    } else {
        skyZoom /= 1.1;
    }

    skyZoom = Math.max(0.7, Math.min(5, skyZoom));

    requestSkyRedraw();
},
{ passive: false });


const skyMapContainer =
    document.querySelector(".sky-map-container");

const expandSkyMapButton =
    document.getElementById("expandSkyMap");

let skyMapExpanded = false;


function setSkyMapExpanded(expanded) {
    skyMapExpanded = expanded;

    skyMapContainer.classList.toggle(
        "expanded",
        expanded
    );

    document.body.style.overflow =
        expanded ? "hidden" : "";

    expandSkyMapButton.textContent =
        expanded ? "×" : "⛶";

    expandSkyMapButton.setAttribute(
        "aria-label",
        expanded
            ? "Close expanded sky map"
            : "Expand sky map"
    );

    // Wait until CSS has resized the container.
    requestAnimationFrame(() => {
        resizeSkyCanvas();
    });
}



expandSkyMapButton.addEventListener("click", () => {
    setSkyMapExpanded(!skyMapExpanded);
});


document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        skyMapExpanded
    ) {
        setSkyMapExpanded(false);
    }
});



skyCanvas.addEventListener("click", event => {
    if (didDrag) {
        didDrag = false;
        return;
    }

    const rect =
        skyCanvas.getBoundingClientRect();

    const x =
        event.clientX - rect.left;

    const y =
        event.clientY - rect.top;

    let closestObject = null;
    let closestDistance = Infinity;

    for (const object of skyObjectsOnScreen) {
        const dx = object.x - x;
        const dy = object.y - y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestObject = object;
        }
    }

    const selectionRadius = 18;

    if (
        closestObject &&
        closestDistance <= selectionRadius
    ) {
        showSkyObjectCard(closestObject);
    }
});


function showSkyObjectCard(object) {
    selectedSkyObject = object;

    const card = document.getElementById("skyObjectCard");

    document.getElementById("skyObjectName").textContent =
        object.name || "Unnamed Object";

    let objectType =
        formatSkyObjectType(object.type);

    if (object.type === "dso") {
        objectType =
            formatDeepSkyType(object.dsoType);
    }

    document.getElementById("skyObjectType").textContent =
        objectType;

    document.getElementById("skyObjectAltitude").textContent =
        `${Math.round(object.altitude)}°`;

    document.getElementById("skyObjectAzimuth").textContent =
        `${Math.round(object.azimuth)}°`;

    const magnitudeRow =
        document.getElementById("skyObjectMagnitudeRow");

    if (object.magnitude != null) {
        magnitudeRow.style.display = "";

        document.getElementById("skyObjectMagnitude").textContent =
            object.magnitude.toFixed(2);
    } else {
        magnitudeRow.style.display = "none";
    }

    let status;

    if (object.altitude > 1) {
        status = "Above horizon";
    } else if (object.altitude < -1) {
        status = "Below horizon";
    } else {
        status = "On the horizon";
    }

    document.getElementById("skyObjectStatus").textContent =
        status;

    card.classList.remove("hidden");

    const phaseRow =
        document.getElementById("skyObjectPhaseRow");

    const illuminationRow =
        document.getElementById("skyObjectIlluminationRow");

    if (object.type === "moon") {
        phaseRow.style.display = "";
        illuminationRow.style.display = "";

        document.getElementById("skyObjectPhase").textContent =
            object.phase;

        document.getElementById("skyObjectIllumination").textContent =
            `${Math.round(object.illumination)}%`;
    } else {
        phaseRow.style.display = "none";
        illuminationRow.style.display = "none";
    }

    const sunriseRow =
        document.getElementById("skyObjectSunriseRow");

    const sunsetRow =
        document.getElementById("skyObjectSunsetRow");

    if (object.type === "sun") {
        sunriseRow.style.display = "";
        sunsetRow.style.display = "";

        document.getElementById("skyObjectSunrise").textContent =
            object.sunrise
                ? formatTime(object.sunrise)
                : "--";

        document.getElementById("skyObjectSunset").textContent =
            object.sunset
                ? formatTime(object.sunset)
                : "--";
    } else {
        sunriseRow.style.display = "none";
        sunsetRow.style.display = "none";
    }

    updateSaveButton(object);
}

function openSkyObjectCardByName(name, exploreType) {
    const typeMap = {
        "Planet": "planet",
        "Star": "star",
        "Deep Sky": "dso"
    };

    const skyType = typeMap[exploreType];
    
    const object = skyObjectsOnScreen.find(item => {
        return (
            item.name === name &&
            item.type === skyType
        );
    });

    if (!object) {
        console.log(
            "Could not find object on Sky Map:",
            name,
            exploreType
        );

        return;
    }

    showSkyObjectCard(object);
}

function formatSkyObjectType(type) {
    const names = {
        star: "Star",
        planet: "Planet",
        sun: "Sun",
        moon: "Moon",
        dso: "Deep Sky Object"
    };

    return names[type] || "Celestial Object";
}


function formatDeepSkyType(type) {
    const types = {
        G: "Galaxy",
        OCl: "Open Cluster",
        GCl: "Globular Cluster",
        PN: "Planetary Nebula",
        Neb: "Nebula",
        DN: "Dark Nebula",
        SNR: "Supernova Remnant"
    };

    return types[type] || "Deep Sky Object";
}


function getMoonPhaseName(angle) {
    if (angle < 22.5 || angle >= 337.5) {
        return "New Moon";
    }

    if (angle < 67.5) {
        return "Waxing Crescent";
    }

    if (angle < 112.5) {
        return "First Quarter";
    }

    if (angle < 157.5) {
        return "Waxing Gibbous";
    }

    if (angle < 202.5) {
        return "Full Moon";
    }

    if (angle < 247.5) {
        return "Waning Gibbous";
    }

    if (angle < 292.5) {
        return "Last Quarter";
    }

    return "Waning Crescent";
}



function getSavedSkyObjects() {
    return JSON.parse(
        localStorage.getItem("astraSavedObjects") || "[]"
    );
}

function getSkyObjectId(object) {
    return `${object.type}:${object.name}`;
}

function isSkyObjectSaved(object) {
    const savedObjects = getSavedSkyObjects();
    const id = getSkyObjectId(object);

    return savedObjects.some(
        saved => saved.id === id
    );
}

function updateSaveButton(object) {
    const button =
        document.getElementById("saveSkyObject");

    const saved =
        isSkyObjectSaved(object);

    button.textContent =
        saved ? "♥ Saved" : "♡ Save";

    button.classList.toggle(
        "saved",
        saved
    );
}


document
    .getElementById("saveSkyObject")
    .addEventListener("click", () => {
        if (!selectedSkyObject) {
            return;
        }

        let savedObjects =
            getSavedSkyObjects();

        const id =
            getSkyObjectId(selectedSkyObject);

        const alreadySaved =
            savedObjects.some(
                object => object.id === id
            );

        if (alreadySaved) {
            savedObjects =
                savedObjects.filter(
                    object => object.id !== id
                );
        } else {
            savedObjects.push({
                id,

                type: selectedSkyObject.type,
                name: selectedSkyObject.name,

                magnitude:
                    selectedSkyObject.magnitude ?? null
            });
        }

        localStorage.setItem(
            "astraSavedObjects",
            JSON.stringify(savedObjects)
        );

        updateSaveButton(
            selectedSkyObject
        );
    });


document
    .getElementById("closeSkyObjectCard")
    .addEventListener("click", () => {
        document
            .getElementById("skyObjectCard")
            .classList.add("hidden");
    });