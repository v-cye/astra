let tonightPlanets = [];
let tonightStars = [];
let tonightDeepSky = [];

let starCatalog = [];
let starByHip = new Map();
let starCatalogPromise = null;

let deepSkyCatalog = [];
let deepSkyCatalogPromise = null;


function loadDeepSkyCatalog() {
    if (!deepSkyCatalogPromise) {
        deepSkyCatalogPromise = fetch("data/deep-sky.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Could not load deep-sky catalog");
                }

                return response.json();
            })
            .then(data => {
                deepSkyCatalog = data;
                return data;
            })
            .catch(error => {
                console.error("Deep-sky catalog error:", error);
                throw error;
            });
    }

    return deepSkyCatalogPromise;
}


function loadStarCatalog() {
    if (!starCatalogPromise) {
        starCatalogPromise = fetch("data/stars.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Could not load star catalog");
                }

                return response.json();
            })
            .then(data => {
                starCatalog = data;

                starByHip = new Map();

                for (const star of starCatalog) {
                    if (star.hip != null) {
                        starByHip.set(Number(star.hip), star);
                    }
                }
                
                if (typeof drawSky === "function") {
                    drawSky();
                }
                
                return data;
            })
            .catch(error => {
                console.error("Star catalog error:", error);
                throw error;
            });
    }

    return starCatalogPromise;
}


const ASTRA_PLANETS = [
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
    Astronomy.Body.Uranus,
    Astronomy.Body.Neptune
];


function getDarknessWindow() {
    if (
        !astraData.astronomy ||
        !astraData.tomorrowAstronomy
    ) {
        return null;
    }

    return {
        start: new Date(
            astraData.astronomy.astronomical_twilight_end
        ),

        end: new Date(
            astraData.tomorrowAstronomy.astronomical_twilight_begin
        )
    };
}


function formatObjectTime(date) {
    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}



function getPlanetsTonight(latitude, longitude) {
    const darkness = getDarknessWindow();

    if (!darkness) {
        return [];
    }

    const observer = new Astronomy.Observer(
        latitude,
        longitude,
        0
    );

    const results = [];

    for (const planet of ASTRA_PLANETS) {
        const result = evaluatePlanetTonight(
            planet,
            observer,
            darkness
        );

        results.push(result);
    }

    tonightPlanets = results;

    displayPlanetsTonight(results);
    updateTonightHighlights();

    return results;
}


function evaluatePlanetTonight(planet, observer, darkness) {
    let highestAltitude = -90;
    let bestTime = null;
    
    let usefulSamples = 0;
    let totalSamples = 0;

    // Check every 15 minutes during astronomical darkness.
    for (
        let time = new Date(darkness.start);
        time <= darkness.end;
        time = new Date(time.getTime() + 15 * 60 * 1000)
    ) {
        const equator = Astronomy.Equator(
            planet,
            time,
            observer,
            true,
            true
        );

        const horizon = Astronomy.Horizon(
            time,
            observer,
            equator.ra,
            equator.dec,
            "normal"
        );

        totalSamples++;

        if (horizon.altitude >= 15) {
            usefulSamples++;
        }

        if (horizon.altitude > highestAltitude) {
            highestAltitude = horizon.altitude;
            bestTime = new Date(time);
        }
    }

    const illumination = Astronomy.Illumination(
        planet,
        bestTime
    );

    const magnitude = illumination.mag;

    const visibilityScore = getVisibilityDurationScore(
        usefulSamples,
        totalSamples
    );

    const result = {
        name: planet,
        type: "Planet",

        maxAltitude: highestAltitude,
        bestTime: bestTime,
        magnitude: magnitude,

        visibilityScore: visibilityScore,

        status: getPlanetStatus(
            highestAltitude,
            magnitude
        )
    };

    result.targetScore = calculateTargetScore(result);

    return result;
}


function getPlanetStatus(altitude, magnitude) {
    if (altitude < 0) {
        return "Not visible";
    }

    if (altitude < 15) {
        return "Poor";
    }

    if (magnitude > 5) {
        return "Challenging";
    }

    if (altitude >= 30) {
        return "Excellent";
    }

    return "Good";
}



function displayPlanetsTonight(planets) {
    const planetList =
        document.getElementById("planetList");

    if (!planetList) {
        return;
    }

    let html = "";

    for (const planet of planets) {
        const altitude =
            Math.round(planet.maxAltitude);

        const positionText =
            planet.status === "Not visible"
                ? "Below horizon during darkness"
                : `Peak altitude ${altitude}° · Best around ${formatObjectTime(planet.bestTime)}`;

        html += `
            <div class="object-row">

                <div>
                    <span class="object-name">
                        ${planet.name}
                    </span>

                    <span class="object-position">
                        ${positionText}
                    </span>
                </div>

                <span class="object-status">
                    ${planet.status}
                </span>

            </div>
        `;
    }

    planetList.innerHTML = html;
}


function updateTonightHighlights() {
    const highlightGrid = document.getElementById("highlightGrid");

    if (!highlightGrid) {
        return;
    }

    const allObjects = [
        ...tonightPlanets,
        ...tonightStars,
        ...tonightDeepSky
    ];

    const candidates = allObjects
        .filter(isHighlightCandidate)
        .sort(compareHighlightObjects)
        .slice(0, 3);

    if (candidates.length === 0) {
        highlightGrid.innerHTML = `
            <p class="loading-text">
                No strong observing targets tonight.
            </p>
        `;
        return;
    }

    let html = "";

    for (const object of candidates) {
        const altitude = Math.round(object.maxAltitude);

        html += `
            <div class="highlight-card" data-object-name="${object.name}" data-object-type="${object.type}">

                <div class="object-visual ${getObjectVisualClass(object)}">${getObjectVisualSymbol(object)}</div>

                <span class="object-name">
                    ${object.name}
                </span>

                <span class="object-type">
                    ${object.type} · ${object.status}
                </span>

                <span class="highlight-details">
                    ${altitude}° ·
                    ${formatObjectTime(object.bestTime)}
                    · ${object.targetScore}/100
                </span>

            </div>
        `;
    }

    highlightGrid.innerHTML = html;
    setupHighlightCardClicks();
}

function setupHighlightCardClicks() {
    document.querySelectorAll(".highlight-card").forEach(card => {
        card.addEventListener("click", () => {
            const name = card.dataset.objectName;
            const type = card.dataset.objectType;

            openObjectOnSkyMap(name, type);
        });
    });
}

function openObjectOnSkyMap(name, type) {
    if (
        astraData.latitude == null ||
        astraData.longitude == null
    ) {
        return;
    }

    let object = null;

    if (type === "Planet") {
        object = tonightPlanets.find(item => item.name === name);
    }

    if (type === "Star") {
        object = tonightStars.find(item => item.name === name);
    }

    if (type === "Deep Sky") {
        object = tonightDeepSky.find(item => item.name === name);
    }

    if (!object) {
        return;
    }

    const observer = new Astronomy.Observer(
        astraData.latitude,
        astraData.longitude,
        0
    );

    const now = new Date();

    let ra = null;
    let dec = null;

    if (type === "Planet") {
        const equator = Astronomy.Equator(
            object.name,
            now,
            observer,
            true,
            true
        );

        ra = equator.ra;
        dec = equator.dec;
    }

    if (type === "Star") {
        const catalogStar = starByHip.get(Number(object.hip));

        if (!catalogStar) {
            return;
        }

        ra = catalogStar.ra;
        dec = catalogStar.dec;
    }

    if (type === "Deep Sky") {
        ra = object.ra;
        dec = object.dec;
    }

    if (ra == null || dec == null) {
        return;
    }

    const horizon = Astronomy.Horizon(
        now,
        observer,
        ra,
        dec,
        "normal"
    );

    pointCameraAtHorizon(horizon.altitude, horizon.azimuth);

    openSkyMapPage();
}

function openSkyMapPage() {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const skyMapPage = document.getElementById("skyMapPage");

    if (skyMapPage) {
        skyMapPage.classList.add("active");
    }
    
    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
    });

    const skyMapNav = document.querySelector('.nav-item[onclick*="skyMapPage"]');

    if (skyMapNav) {
        skyMapNav.classList.add("active");
    }

    requestAnimationFrame(() => {
        resizeSkyCanvas();
        drawSky();
    });
}

function getObjectVisualClass(object) {
    if (object.type === "Planet") return "planet-visual";
    if (object.type === "Star") return "star-visual";
    if (object.type === "Deep Sky") return "deep-sky-visual";
    
    return "default-visual";
}

function getObjectVisualSymbol(object) {
    if (object.type === "Planet") return "◉";
    if (object.type === "Star") return "★";
    if (object.type === "Deep Sky") return "◇";

    return "•";
}

function isHighlightCandidate(object) {
    return (
        object.status !== "Not visible" &&
        object.status !== "Poor"
    );
}


function compareHighlightObjects(a, b) {
    return b.targetScore - a.targetScore;
}


loadStarCatalog();
loadDeepSkyCatalog();



async function getStarsTonight(latitude, longitude) {
    const darkness = getDarknessWindow();

    if (!darkness) {
        return [];
    }

    try {
        await loadStarCatalog();
    } catch {
        return [];
    }

    const observer = new Astronomy.Observer(
        latitude,
        longitude,
        0
    );

    const exploreStars = starCatalog.filter(
        star => star.magnitude <= 3
    );

    const results = [];

    for (const star of exploreStars) {
        const result = evaluateStarTonight(
            star,
            observer,
            darkness
        );

        results.push(result);
    }

    tonightStars = results;

    displayStarsTonight(results);
    updateTonightHighlights();

    return results;
}


function evaluateStarTonight(star, observer, darkness) {
    let highestAltitude = -90;
    let bestTime = null;

    let usefulSamples = 0;
    let totalSamples = 0;

    for (
        let time = new Date(darkness.start);
        time <= darkness.end;
        time = new Date(time.getTime() + 30 * 60 * 1000)
    ) {
        const horizon = Astronomy.Horizon(
            time,
            observer,
            star.ra,
            star.dec,
            "normal"
        );

        // Track how long the star is at a useful altitude
        totalSamples++;

        if (horizon.altitude >= 15) {
            usefulSamples++;
        }

        // Find the star's highest point during darkness
        if (horizon.altitude > highestAltitude) {
            highestAltitude = horizon.altitude;
            bestTime = new Date(time);
        }
    }

    const visibilityScore = getVisibilityDurationScore(
        usefulSamples,
        totalSamples
    );

    const result = {
        name:
            star.name ||
            (star.hip ? `HIP ${star.hip}` : "Unnamed Star"),

        type: "Star",
        hip: star.hip,
        constellation: star.constellation,

        maxAltitude: highestAltitude,
        bestTime: bestTime,
        magnitude: star.magnitude,

        visibilityScore: visibilityScore,

        status: getStarStatus(
            highestAltitude,
            star.magnitude
        )
    };

    result.targetScore = calculateTargetScore(result);

    return result;
}


function getStarStatus(altitude, magnitude) {
    if (altitude < 0) {
        return "Not visible";
    }

    if (altitude < 15) {
        return "Poor";
    }

    if (magnitude > 2.5) {
        return "Challenging";
    }

    if (altitude >= 30) {
        return "Excellent";
    }

    return "Good";

}


function displayStarsTonight(stars) {
    const starList = document.getElementById("starList");

    if (!starList) {
        return;
    }

    // Only show useful observing targets
    const visibleStars = stars
        .filter(star =>
            star.status !== "Not visible" &&
            star.status !== "Poor" &&
            star.name !== "Unnamed Star"
        )
        .sort((a, b) => {
            // Brightest first
            return a.magnitude - b.magnitude;
        })
        .slice(0, 10);

    if (visibleStars.length === 0) {
        starList.innerHTML = `
            <p class="loading-text">
                No prominent stars are well positioned tonight.
            </p>
        `;
        return;
    }

    let html = "";

    for (const star of visibleStars) {
        const altitude = Math.round(star.maxAltitude);

        html += `
            <div class="object-row">
                <div>
                    <span class="object-name">
                        ${star.name}
                    </span>

                    <span class="object-position">
                        Peak altitude ${altitude}° ·
                        Best around ${formatObjectTime(star.bestTime)}
                    </span>
                </div>

                <span class="object-status">
                    ${star.status}
                </span>
            </div>
        `;
    }

    starList.innerHTML = html;
}



function calculateTargetScore(object) {
    const altitudeScore = getAltitudeScore(object.maxAltitude);
    const brightnessScore = getBrightnessScore(
        object.magnitude,
        object.type
    );

    const visibilityScore = object.visibilityScore ?? 0;

    const conditionsScore = getConditionsScore();

    const finalScore =
        altitudeScore * 0.40 +
        brightnessScore * 0.25 +
        visibilityScore * 0.20 +
        conditionsScore * 0.15;

    return Math.round(finalScore);
}


function getAltitudeScore(altitude) {
    if (altitude <= 0) return 0;
    if (altitude >= 60) return 100;

    return (altitude / 60) * 100;
}


function getBrightnessScore(magnitude, type) {
    if (magnitude == null) {
        return 50;
    }

    // Planets and stars use apparent magnitude.
    if (type === "Planet" || type === "Star") {
        if (magnitude <= 0) return 100;
        if (magnitude <= 1) return 90;
        if (magnitude <= 2) return 80;
        if (magnitude <= 3) return 65;
        if (magnitude <= 4) return 50;
        if (magnitude <= 5) return 35;

        return 20;
    }

    return 50;
}


function getVisibilityDurationScore(usefulSamples, totalSamples) {
    if (totalSamples === 0) {
        return 0;
    }

    return (usefulSamples / totalSamples) * 100;
}


function getConditionsScore() {
    const score = Number(
        astraData.observingScore
    );

    if (!Number.isFinite(score)) {
        return 50;
    }

    return score;
}


function parseRA(ra) {
    if (!ra) return null;

    const parts = ra.split(":").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return null;
    }

    const [hours, minutes, seconds] = parts;

    return hours + minutes / 60 + seconds / 3600;
}


function parseDec(dec) {
    if (!dec) return null;

    const parts = dec.split(":");

    if (parts.length !== 3) {
        return null;
    }

    const degrees = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);

    if (
        Number.isNaN(degrees) ||
        Number.isNaN(minutes) ||
        Number.isNaN(seconds)
    ) {
        return null;
    }

    const sign = dec.trim().startsWith("-") ? -1 : 1;

    return sign * (
        Math.abs(degrees) +
        minutes / 60 +
        seconds / 3600
    );
}


async function getDeepSkyTonight(latitude, longitude) {
    const darkness = getDarknessWindow();

    if (!darkness) {
        return [];
    }

    try {
        await loadDeepSkyCatalog();
    } catch {
        return [];
    }

    const observer = new Astronomy.Observer(
        latitude,
        longitude,
        0
    );

    const results = [];

    for (const object of deepSkyCatalog) {
        const result = evaluateDeepSkyObject(
            object,
            observer,
            darkness
        );

        if (result) {
            results.push(result);
        }
    }

    tonightDeepSky = results;

    displayDeepSkyTonight(results);
    updateTonightHighlights();

    return results;
}


function evaluateDeepSkyObject(object, observer, darkness) {
    const ra = parseRA(object.ra);
    const dec = parseDec(object.dec);

    if (ra === null || dec === null) {
        return null;
    }

    let highestAltitude = -90;
    let bestTime = null;

    let usefulSamples = 0;
    let totalSamples = 0;

    for (
        let time = new Date(darkness.start);
        time <= darkness.end;
        time = new Date(time.getTime() + 30 * 60 * 1000)
    ) {
        const horizon = Astronomy.Horizon(
            time,
            observer,
            ra,
            dec,
            "normal"
        );

        totalSamples++;

        if (horizon.altitude >= 15) {
            usefulSamples++;
        }

        if (horizon.altitude > highestAltitude) {
            highestAltitude = horizon.altitude;
            bestTime = new Date(time);
        }
    }

    const moonInterferenceScore =
    getMoonInterferenceScore(
        ra,
        dec,
        bestTime,
        observer
    );

    const visibilityScore = getVisibilityDurationScore(
        usefulSamples,
        totalSamples
    );

    const result = {
        name:
            object.messier
                ? `M${Number(object.messier)}`
                : formatDeepSkyName(object.name),

        catalogName: formatDeepSkyName(object.name),

        type: "Deep Sky",
        objectType: object.type,

        ra: ra,
        dec: dec,

        constellation: object.constellation,

        maxAltitude: highestAltitude,
        bestTime: bestTime,
        magnitude: object.magnitude,

        majorAxis: object.majorAxis,
        minorAxis: object.minorAxis,

        visibilityScore: visibilityScore,
        moonInterferenceScore: moonInterferenceScore,

        status: getDeepSkyStatus(
            highestAltitude,
            object.magnitude
        )
    };

    result.targetScore =
        calculateDeepSkyScore(result);

    return result;
}


function getDeepSkyStatus(altitude, magnitude) {
    if (altitude < 0) {
        return "Not visible";
    }

    if (altitude < 15) {
        return "Poor";
    }

    if (magnitude !== null && magnitude > 10) {
        return "Challenging";
    }

    if (altitude >= 30) {
        return "Excellent";
    }

    return "Good";
}


function calculateDeepSkyScore(object) {
    const altitudeScore =
        getAltitudeScore(object.maxAltitude);

    const brightnessScore =
        getDeepSkyBrightnessScore(object.magnitude);

    const visibilityScore =
        object.visibilityScore ?? 0;

    const sizeScore =
        getDeepSkySizeScore(object.majorAxis);

    const conditionsScore =
        getConditionsScore();

    const moonScore =
        object.moonInterferenceScore ?? 100;

    const finalScore =
        altitudeScore * 0.30 +
        brightnessScore * 0.20 +
        visibilityScore * 0.20 +
        moonScore * 0.15 +
        sizeScore * 0.05 +
        conditionsScore * 0.10;

    return Math.round(finalScore);
}


function getDeepSkyBrightnessScore(magnitude) {
    if (magnitude == null) return 40;

    if (magnitude <= 5) return 100;
    if (magnitude <= 6) return 90;
    if (magnitude <= 7) return 80;
    if (magnitude <= 8) return 70;
    if (magnitude <= 9) return 55;
    if (magnitude <= 10) return 40;
    if (magnitude <= 11) return 25;

    return 15;
}


function getDeepSkySizeScore(majorAxis) {
    if (majorAxis == null) return 50;

    // Very tiny objects can be difficult.
    if (majorAxis < 1) return 30;
    if (majorAxis < 2) return 45;

    // A moderate apparent size is generally useful.
    if (majorAxis < 10) return 70;
    if (majorAxis < 30) return 85;

    // Large objects are useful, but don't get
    // an enormous advantage just for being large.
    return 90;
}

function displayDeepSkyTonight(objects) {
    const deepSkyList =
        document.getElementById("deepSkyList");

    if (!deepSkyList) {
        return;
    }

    const visibleObjects = objects
        .filter(object =>
            object.status !== "Not visible" &&
            object.status !== "Poor"
        )
        .sort((a, b) =>
            b.targetScore - a.targetScore
        )
        .slice(0, 10);

    if (visibleObjects.length === 0) {
        deepSkyList.innerHTML = `
            <p class="loading-text">
                No strong deep-sky targets tonight.
            </p>
        `;
        return;
    }

    let html = "";

    for (const object of visibleObjects) {
        const altitude =
            Math.round(object.maxAltitude);

        html += `
            <div class="object-row">
                <div>
                    <span class="object-name">
                        ${object.name}
                    </span>

                    <span class="object-position">
                        ${getDeepSkyTypeName(object.objectType)}
                        · Peak ${altitude}°
                        · ${formatObjectTime(object.bestTime)}
                    </span>
                </div>

                <span class="object-status">
                    ${object.status}
                </span>
            </div>
        `;
    }

    deepSkyList.innerHTML = html;
}

function getDeepSkyTypeName(type) {
    const names = {
        G: "Galaxy",
        GCl: "Globular Cluster",
        OCl: "Open Cluster",
        Neb: "Nebula",
        PN: "Planetary Nebula",
        ClN: "Cluster + Nebula",
        "Cl+N": "Cluster + Nebula"
    };

    return names[type] || "Deep Sky Object";
}


function getAngularSeparation(ra1, dec1, ra2, dec2) {
    // RA is in hours, so convert it to degrees first.
    const ra1Rad = ra1 * 15 * Math.PI / 180;
    const ra2Rad = ra2 * 15 * Math.PI / 180;

    const dec1Rad = dec1 * Math.PI / 180;
    const dec2Rad = dec2 * Math.PI / 180;

    const cosine =
        Math.sin(dec1Rad) * Math.sin(dec2Rad) +
        Math.cos(dec1Rad) *
        Math.cos(dec2Rad) *
        Math.cos(ra1Rad - ra2Rad);

    // Protect against tiny floating-point errors.
    const safeCosine = Math.max(-1, Math.min(1, cosine));

    return Math.acos(safeCosine) * 180 / Math.PI;
}


function getMoonInterferenceScore(
    targetRA,
    targetDec,
    bestTime,
    observer
) {
    const moon = Astronomy.Equator(
        Astronomy.Body.Moon,
        bestTime,
        observer,
        true,
        true
    );

    const separation = getAngularSeparation(
        targetRA,
        targetDec,
        moon.ra,
        moon.dec
    );

    const illumination =
        astraData.astronomy?.moon_illumination ?? 0;

    // Very dim Moon: essentially no meaningful penalty.
    if (illumination < 15) {
        return 100;
    }

    // Moon is far from the object.
    if (separation >= 90) {
        return 100;
    }

    if (separation >= 60) {
        return illumination > 75 ? 85 : 95;
    }

    if (separation >= 30) {
        return illumination > 75 ? 65 : 85;
    }

    if (separation >= 15) {
        return illumination > 75 ? 40 : 65;
    }

    // Bright Moon very close to the object.
    return illumination > 75 ? 20 : 45;
}


function setupExploreFilters() {
    const buttons = document.querySelectorAll(".filter-button");

    const sections = {
        highlights: document.getElementById("highlightsSection"),
        planets: document.getElementById("planetsSection"),
        stars: document.getElementById("starsSection"),
        deepSky: document.getElementById("deepSkySection")
    };

    if (buttons.length === 0) {
        return;
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const filter = button.dataset.filter;

            buttons.forEach(item =>
                item.classList.remove("active")
            );

            button.classList.add("active");

            // Hide everything first
            Object.values(sections).forEach(section => {
                if (section) {
                    section.hidden = true;
                }
            });

            if (filter === "all") {
                if (sections.highlights) sections.highlights.hidden = false;
                if (sections.planets) sections.planets.hidden = false;
                if (sections.stars) sections.stars.hidden = false;
                if (sections.deepSky) sections.deepSky.hidden = false;
            }

            if (filter === "planets" && sections.planets) {
                sections.planets.hidden = false;
            }

            if (filter === "stars" && sections.stars) {
                sections.stars.hidden = false;
            }

            if (filter === "deep-sky" && sections.deepSky) {
                sections.deepSky.hidden = false;
            }
        });
    });
}

setupExploreFilters();


function formatDeepSkyName(name) {
    if (!name) return "Deep Sky Object";

    return name
        .replace(/^NGC0*/, "NGC ")
        .replace(/^IC0*/, "IC ")
        .replace(/^Mel0*/, "Mel ")
        .trim();
}