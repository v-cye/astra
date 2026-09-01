function dot(a, b) {
    return (
        a.x * b.x +
        a.y * b.y +
        a.z * b.z
    );
}


function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}


function normalize(v) {
    const length = Math.sqrt(
        v.x * v.x +
        v.y * v.y +
        v.z * v.z
    );

    return {
        x: v.x / length,
        y: v.y / length,
        z: v.z / length
    };
}


function rotateVector(v, axis, angle) {
    axis = normalize(axis);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const axisCrossV = cross(axis, v);
    const axisDotV = dot(axis, v);

    return {
        x:
            v.x * cos +
            axisCrossV.x * sin +
            axis.x * axisDotV * (1 - cos),

        y:
            v.y * cos +
            axisCrossV.y * sin +
            axis.y * axisDotV * (1 - cos),

        z:
            v.z * cos +
            axisCrossV.z * sin +
            axis.z * axisDotV * (1 - cos)
    };
}


function horizonToCanvas(altitude, azimuth) {
    const altRad =
        altitude * Math.PI / 180;

    const azRad =
        azimuth * Math.PI / 180;

    const objectVector = {
        x: Math.cos(altRad) * Math.sin(azRad),
        y: Math.sin(altRad),
        z: Math.cos(altRad) * Math.cos(azRad)
    };

    const forward =
        normalize(cameraForward);

    const up =
        normalize(cameraUp);

    const right =
        normalize(cross(up, forward));

    const cameraX =
        dot(objectVector, right);

    const cameraY =
        dot(objectVector, up);

    const cameraZ =
        dot(objectVector, forward);

    if (cameraZ <= 0) {
        return {
            visible: false
        };
    }

    const fieldOfView =
        90 / skyZoom;

    const focalLength =
        (skyCanvas.width / 2) /
        Math.tan(
            fieldOfView *
            Math.PI / 360
        );

    const x =
        skyCanvas.width / 2 -
        (cameraX / cameraZ) *
        focalLength;

    const y =
        skyCanvas.height / 2 -
        (cameraY / cameraZ) *
        focalLength;

    return {
        x,
        y,

        visible:
            x >= 0 &&
            x <= skyCanvas.width &&
            y >= 0 &&
            y <= skyCanvas.height
    };
}


function getDirectionLabel(azimuth) {
    const directions = [
        "N", "NE", "E", "SE",
        "S", "SW", "W", "NW"
    ];

    const index =
        Math.round(azimuth / 45) % 8;

    return directions[index];
}


function updateSkyDirection() {
    const element =
        document.getElementById("skyDirection");

    if (!element) return;

    const altitude =
        Math.asin(cameraForward.y) *
        180 / Math.PI;

    let azimuth =
        Math.atan2(
            cameraForward.x,
            cameraForward.z
        ) * 180 / Math.PI;

    azimuth =
        (azimuth + 360) % 360;

    const direction =
        getDirectionLabel(azimuth);

    if (altitude >= 0) {
        element.textContent =
            `Looking ${direction} · ${Math.round(altitude)}°`;
    } else {
        element.textContent =
            `Looking ${direction} · ${Math.abs(Math.round(altitude))}° Below horizon`;
    }
}


function pointCameraAtHorizon(altitude, azimuth) {
    const altRad = altitude * Math.PI / 180;
    const azRad = azimuth * Math.PI / 180;

    cameraForward = normalize({
        x: Math.cos(altRad) * Math.sin(azRad),
        y: Math.sin(altRad),
        z: Math.cos(altRad) * Math.cos(azRad)
    });

    const worldUp = {
        x: 0,
        y: 1,
        z: 0
    };

    let right = cross(cameraForward, worldUp);

    if (
        Math.abs(right.x) < 0.0001 &&
        Math.abs(right.y) < 0.0001 &&
        Math.abs(right.z) < 0.0001
    ) {
        right = {
            x: 1,
            y: 0,
            z: 0
        };
    }

    right = normalize(right);

    cameraUp = normalize(cross(right, cameraForward));

    updateSkyDirection();
}