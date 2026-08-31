function drawStars() {
    if (
        astraData.latitude == null ||
        astraData.longitude == null ||
        starCatalog.length === 0
    ) {
        return;
    }

    const observer = new Astronomy.Observer(
        astraData.latitude,
        astraData.longitude,
        0
    );

    const now = new Date();

    const magnitudeLimit = getStarMagnitudeLimit();

    const visibleStars = starCatalog.filter(
        star => star.magnitude <= magnitudeLimit
    );


    for (const star of visibleStars) {
        const horizon = Astronomy.Horizon(
            now,
            observer,
            star.ra,
            star.dec,
            "normal"
        );

        const position = horizonToCanvas(
            horizon.altitude,
            horizon.azimuth
        );

        if (!position.visible) {
            continue;
        }

        skyObjectsOnScreen.push({
            type: "star",
            name: star.name || "Unnamed Star",

            x: position.x,
            y: position.y,

            ra: star.ra,
            dec: star.dec,
            magnitude: star.magnitude,

            altitude: horizon.altitude,
            azimuth: horizon.azimuth,

            constellation: star.constellation || null
        });

        drawStar(
            position.x,
            position.y,
            star.magnitude,
            star.name,
            horizon.altitude
        );
    }
}


function drawStar(x, y, magnitude, name, altitude) {
    const radius = Math.max(
        0.6,
        3.5 - magnitude * 0.6
    );

    let opacity = Math.max(
        0.3,
        1 - magnitude * 0.12
    );

    if (altitude < 0) {
        opacity *= 0.3;
    }

    skyContext.beginPath();
    skyContext.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    skyContext.fillStyle =
        `rgba(255, 255, 255, ${opacity})`;

    skyContext.fill();

    const labelLimit =
        skyZoom >= 3 ? 3 :
        skyZoom >= 2 ? 2 :
        1.5;

    if (
        name &&
        magnitude <= labelLimit &&
        altitude >= 0
    ) {
        skyContext.fillStyle = "#c7d4e8";
        skyContext.font = "11px Helvetica";

        skyContext.fillText(
            name,
            x + 7,
            y - 5
        );
    }
}


function drawConstellationLines() {
    if (
        astraData.latitude == null ||
        astraData.longitude == null ||
        starCatalog.length === 0 ||
        constellationData.length === 0
    ) {
        return;
    }

    const observer = new Astronomy.Observer(
        astraData.latitude,
        astraData.longitude,
        0
    );

    const now = new Date();

    skyContext.lineWidth = 1;

    for (const constellation of constellationData) {
        for (const [hip1, hip2] of constellation.segments) {
            const star1 = getStarByHip(hip1);
            const star2 = getStarByHip(hip2);

            if (!star1 || !star2) {
                continue;
            }

            const horizon1 = Astronomy.Horizon(
                now,
                observer,
                star1.ra,
                star1.dec,
                "normal"
            );

            const horizon2 = Astronomy.Horizon(
                now,
                observer,
                star2.ra,
                star2.dec,
                "normal"
            );

            const point1 = horizonToCanvas(
                horizon1.altitude,
                horizon1.azimuth
            );

            const point2 = horizonToCanvas(
                horizon2.altitude,
                horizon2.azimuth
            );

            if (!point1.visible || !point2.visible) {
                continue;
            }

            const averageAltitude =
                (horizon1.altitude + horizon2.altitude) / 2;

            const opacity =
                getHorizonOpacity(averageAltitude);

            skyContext.strokeStyle =
                `rgba(150, 180, 230, ${0.45 * opacity})`;

            skyContext.beginPath();

            skyContext.moveTo(
                point1.x,
                point1.y
            );

            skyContext.lineTo(
                point2.x,
                point2.y
            );

            skyContext.stroke();
        }
    }
}


function drawPlanets() {
    if (
        astraData.latitude == null ||
        astraData.longitude == null
    ) {
        return;
    }

    const observer = new Astronomy.Observer(
        astraData.latitude,
        astraData.longitude,
        0
    );

    const now = new Date();

    const planets = [
        Astronomy.Body.Mercury,
        Astronomy.Body.Venus,
        Astronomy.Body.Mars,
        Astronomy.Body.Jupiter,
        Astronomy.Body.Saturn,
        Astronomy.Body.Uranus,
        Astronomy.Body.Neptune
    ];

    for (const planet of planets) {
        const equator = Astronomy.Equator(
            planet,
            now,
            observer,
            true,
            true
        );

        const horizon = Astronomy.Horizon(
            now,
            observer,
            equator.ra,
            equator.dec,
            "normal"
        );

        const illumination =
            Astronomy.Illumination(
                planet,
                now
            );

        const position = horizonToCanvas(
            horizon.altitude,
            horizon.azimuth
        );

        if (!position.visible) {
            continue;
        }

        skyObjectsOnScreen.push({
            type: "planet",
            name: planet,

            x: position.x,
            y: position.y,

            altitude: horizon.altitude,
            azimuth: horizon.azimuth,

            magnitude: illumination.mag
        });

        drawPlanet(
            position.x,
            position.y,
            planet,
            horizon.altitude
        );
    }
}


function drawPlanet(x, y, name, altitude) {
    const opacity =
        getHorizonOpacity(altitude);

    skyContext.save();
    skyContext.globalAlpha = opacity;

    skyContext.beginPath();
    skyContext.arc(x, y, 5, 0, Math.PI * 2);

    skyContext.strokeStyle = "#9fc5ff";
    skyContext.lineWidth = 1.5;
    skyContext.stroke();

    skyContext.beginPath();
    skyContext.arc(x, y, 2, 0, Math.PI * 2);

    skyContext.fillStyle = "white";
    skyContext.fill();

    // Don't label below-horizon planets for now.
    if (altitude >= 0) {
        skyContext.fillStyle = "#9fc5ff";
        skyContext.font = "12px Helvetica";

        skyContext.fillText(
            name,
            x + 9,
            y - 7
        );
    }

    skyContext.restore();
}


function drawSunAndMoon() {
    if (
        astraData.latitude == null ||
        astraData.longitude == null
    ) {
        return;
    }

    const observer = new Astronomy.Observer(
        astraData.latitude,
        astraData.longitude,
        0
    );

    const now = new Date();

    const bodies = [
        {
            body: Astronomy.Body.Sun,
            name: "Sun",
            type: "sun"
        },
        {
            body: Astronomy.Body.Moon,
            name: "Moon",
            type: "moon"
        }
    ];

    for (const item of bodies) {
        const equator = Astronomy.Equator(
            item.body,
            now,
            observer,
            true,
            true
        );

        const horizon = Astronomy.Horizon(
            now,
            observer,
            equator.ra,
            equator.dec,
            "normal"
        );

        let extraData = {};

        if (item.type === "moon") {
            const illumination =
                Astronomy.Illumination(
                    Astronomy.Body.Moon,
                    now
                );

            const phaseAngle =
                Astronomy.MoonPhase(now);

            extraData = {
                illumination:
                    illumination.phase_fraction * 100,

                phase:
                    getMoonPhaseName(phaseAngle)
            };
        }

        const position = horizonToCanvas(
            horizon.altitude,
            horizon.azimuth
        );

        if (!position.visible) {
            continue;
        }

        skyObjectsOnScreen.push({
            type: item.type,
            name: item.name,

            x: position.x,
            y: position.y,

            altitude: horizon.altitude,
            azimuth: horizon.azimuth,

            ...extraData,

            sunrise:
                item.type === "sun"
                    ? astraData.astronomy?.sunrise
                    : null,

            sunset:
                item.type === "sun"
                    ? astraData.astronomy?.sunset
                    : null,
        });

        drawSolarSystemBody(
            position.x,
            position.y,
            item.name,
            item.type,
            horizon.altitude,
            extraData
        );
    }
}


function drawMoonPhase(
    x,
    y,
    radius,
    illumination,
    phase
) {
    // Dark lunar disk
    skyContext.beginPath();
    skyContext.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    skyContext.fillStyle = "#27303a";
    skyContext.fill();

    skyContext.save();

    // Keep illumination inside the Moon
    skyContext.beginPath();
    skyContext.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );
    skyContext.clip();

    const fraction =
        Math.max(
            0,
            Math.min(1, illumination / 100)
        );

    const waxing =
        phase.includes("Waxing") ||
        phase === "First Quarter";

    const full =
        phase === "Full Moon";

    const newMoon =
        phase === "New Moon";

    if (!newMoon) {
        const width =
            full
                ? radius * 2
                : radius * 2 * fraction;

        skyContext.beginPath();

        skyContext.ellipse(
            waxing
                ? x + radius - width / 2
                : x - radius + width / 2,
            y,
            width / 2,
            radius,
            0,
            0,
            Math.PI * 2
        );

        skyContext.fillStyle = "#dce6f2";
        skyContext.fill();
    }

    skyContext.restore();

    // Lunar outline
    skyContext.beginPath();
    skyContext.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    skyContext.strokeStyle =
        "rgba(255, 255, 255, 0.65)";

    skyContext.lineWidth = 1;
    skyContext.stroke();
}


function drawSolarSystemBody(
    x,
    y,
    name,
    type,
    altitude,
    extraData = {}
) {
    const opacity =
        getHorizonOpacity(altitude);

    skyContext.save();
    skyContext.globalAlpha = opacity;

    if (type === "sun") {
        skyContext.beginPath();
        skyContext.arc(
            x,
            y,
            7,
            0,
            Math.PI * 2
        );

        skyContext.fillStyle = "#fff4c2";
        skyContext.fill();

        skyContext.beginPath();
        skyContext.arc(
            x,
            y,
            11,
            0,
            Math.PI * 2
        );

        skyContext.strokeStyle =
            "rgba(255, 244, 194, 0.35)";

        skyContext.lineWidth = 2;
        skyContext.stroke();
    }

    if (type === "moon") {
        drawMoonPhase(
            x,
            y,
            8,
            extraData.illumination,
            extraData.phase
        );
    }

    if (altitude >= 0) {
        skyContext.fillStyle = "#dce6f2";
        skyContext.font = "12px Helvetica";

        skyContext.fillText(
            name,
            x + 12,
            y - 8
        );
    }

    skyContext.restore();
}


function drawDeepSkyObjects() {
    if (
        astraData.latitude == null ||
        astraData.longitude == null ||
        deepSkyCatalog.length === 0
    ) {
        return;
    }

    const observer = new Astronomy.Observer(
        astraData.latitude,
        astraData.longitude,
        0
    );

    const now = new Date();

    const magnitudeLimit =
        getDeepSkyMagnitudeLimit();

    const mapObjects = deepSkyCatalog.filter(object =>
        object.magnitude != null &&
        object.magnitude <= magnitudeLimit
    );

    for (const object of mapObjects) {
        const ra = parseRA(object.ra);
        const dec = parseDec(object.dec);

        if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
            continue;
        }

        const horizon = Astronomy.Horizon(
            now,
            observer,
            ra,
            dec,
            "normal"
        );

        const position = horizonToCanvas(
            horizon.altitude,
            horizon.azimuth
        );

        if (!position.visible) {
            continue;
        }

        skyObjectsOnScreen.push({
            type: "dso",

            name:
                object.messier
                    ? `M${Number(object.messier)}`
                    : formatDeepSkyName(object.name),

            dsoType: object.type,

            x: position.x,
            y: position.y,

            altitude: horizon.altitude,
            azimuth: horizon.azimuth,
            magnitude: object.magnitude,

            object: object
        });

        drawDeepSkyMarker(
            position.x,
            position.y,
            object,
            horizon.altitude
        );
    }
}


function drawDeepSkyMarker(x, y, object, altitude) {
    skyContext.save();

    skyContext.globalAlpha =
        getHorizonOpacity(altitude);

    skyContext.strokeStyle = "#8fa0b5";
    skyContext.fillStyle = "#8fa0b5";
    skyContext.lineWidth = 1;

    const type = object.type;

    if (type === "G") {
        // Galaxy
        skyContext.beginPath();

        skyContext.ellipse(
            x,
            y,
            5,
            3,
            -0.4,
            0,
            Math.PI * 2
        );

        skyContext.stroke();

    } else if (
        type === "OCl" ||
        type === "GCl"
    ) {
        // Open / globular cluster
        skyContext.beginPath();

        skyContext.arc(
            x,
            y,
            4,
            0,
            Math.PI * 2
        );

        skyContext.stroke();

        skyContext.beginPath();

        skyContext.arc(
            x,
            y,
            1,
            0,
            Math.PI * 2
        );

        skyContext.fill();

    } else {
        // Nebula / other DSO
        skyContext.strokeRect(
            x - 3,
            y - 3,
            6,
            6
        );
    }

    const shouldLabel =
        altitude >= 0 &&
        object.messier &&
        (
            object.magnitude <= 5 ||
            skyZoom >= 2
        );

    if (shouldLabel) {
        const name =
            `M${Number(object.messier)}`;

        skyContext.font =
            "10px Helvetica";

        skyContext.fillText(
            name,
            x + 7,
            y - 5
        );
    }

    skyContext.restore();
}


function drawHorizonLine() {
    skyContext.save();

    skyContext.strokeStyle = "rgba(180, 200, 220, 0.35)";
    skyContext.lineWidth = 1.2;

    skyContext.beginPath();

    let started = false;

    for (let azimuth = 0; azimuth <= 360; azimuth += 2) {
        const point = horizonToCanvas(0, azimuth);

        if (!point.visible) {
            started = false;
            continue;
        }

        if (!started) {
            skyContext.moveTo(point.x, point.y);
            started = true;
        } else {
            skyContext.lineTo(point.x, point.y);
        }
    }

    skyContext.stroke();
    skyContext.restore();
}



function getHorizonOpacity(altitude) {
    return altitude < 0 ? 0.3 : 1;
}

function getStarMagnitudeLimit() {
    if (skyZoom < 1) return 3.0;
    if (skyZoom < 1.5) return 4.0;
    if (skyZoom < 2.5) return 5.0;
    if (skyZoom < 4) return 5.8;

    return 6.5;
}

function getDeepSkyMagnitudeLimit() {
    if (skyZoom < 1) return 5.5;
    if (skyZoom < 1.5) return 7;
    if (skyZoom < 2.5) return 8.5;
    if (skyZoom < 4) return 10;

    return 12;
}
