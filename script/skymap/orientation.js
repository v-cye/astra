let motionModeEnabled = false;

let smoothedForward = null;
let smoothedUp = null;
let compassYawOffset = null;


function multiplyQuaternions(a, b) {
    return {
        x:
            a.w * b.x +
            a.x * b.w +
            a.y * b.z -
            a.z * b.y,

        y:
            a.w * b.y -
            a.x * b.z +
            a.y * b.w +
            a.z * b.x,

        z:
            a.w * b.z +
            a.x * b.y -
            a.y * b.x +
            a.z * b.w,

        w:
            a.w * b.w -
            a.x * b.x -
            a.y * b.y -
            a.z * b.z
    };
}


function quaternionFromAxisAngle(axis, angle) {
    const half = angle / 2;
    const sin = Math.sin(half);

    return {
        x: axis.x * sin,
        y: axis.y * sin,
        z: axis.z * sin,
        w: Math.cos(half)
    };
}


function quaternionFromDeviceOrientation(
    alpha,
    beta,
    gamma,
    screenAngle
) {
    const x = beta;
    const y = alpha;
    const z = -gamma;

    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);

    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    let q = {
        x:
            s1 * c2 * c3 +
            c1 * s2 * s3,

        y:
            c1 * s2 * c3 -
            s1 * c2 * s3,

        z:
            c1 * c2 * s3 -
            s1 * s2 * c3,

        w:
            c1 * c2 * c3 +
            s1 * s2 * s3
    };

    const cameraCorrection =
        quaternionFromAxisAngle(
            { x: 1, y: 0, z: 0 },
            -Math.PI / 2
        );

    q =
        multiplyQuaternions(
            q,
            cameraCorrection
        );

    const screenCorrection =
        quaternionFromAxisAngle(
            { x: 0, y: 0, z: 1 },
            -screenAngle
        );

    q =
        multiplyQuaternions(
            q,
            screenCorrection
        );

    return q;
}


function rotateVectorByQuaternion(vector, q) {
    const qVector = {
        x: q.x,
        y: q.y,
        z: q.z
    };

    const uv =
        cross(qVector, vector);

    const uuv =
        cross(qVector, uv);

    return {
        x:
            vector.x +
            2 * (
                uv.x * q.w +
                uuv.x
            ),

        y:
            vector.y +
            2 * (
                uv.y * q.w +
                uuv.y
            ),

        z:
            vector.z +
            2 * (
                uv.z * q.w +
                uuv.z
            )
    };
}



function smoothOrientationVector(
    current,
    target,
    amount = 0.16
) {
    if (!current) {
        return normalize(target);
    }

    return normalize({
        x:
            current.x +
            (target.x - current.x) * amount,

        y:
            current.y +
            (target.y - current.y) * amount,

        z:
            current.z +
            (target.z - current.z) * amount
    });
}

function handleDeviceOrientation(event) {
    if (!motionModeEnabled) {
        return;
    }

    if (
        event.alpha == null ||
        event.beta == null ||
        event.gamma == null
    ) {
        return;
    }

    const alpha =
        event.alpha * Math.PI / 180;

    const beta =
        event.beta * Math.PI / 180;

    const gamma =
        event.gamma * Math.PI / 180;

    const screenAngle =
        (
            screen.orientation?.angle ??
            window.orientation ??
            0
        ) * Math.PI / 180;

    const quaternion =
        quaternionFromDeviceOrientation(
            alpha,
            beta,
            gamma,
            screenAngle
        );

    let targetForward =
        normalize(
            rotateVectorByQuaternion(
                { x: 0, y: 0, z: -1 },
                quaternion
            )
        );

    let targetUp =
        normalize(
            rotateVectorByQuaternion(
                { x: 0, y: 1, z: 0 },
                quaternion
            )
        );

    let compassHeading = null;

    if (
        typeof event.webkitCompassHeading === "number"
    ) {
        compassHeading =
            event.webkitCompassHeading;
    }
    else if (
        event.absolute &&
        event.alpha != null
    ) {
        compassHeading =
            (360 - event.alpha) % 360;
    }

    const horizontalLength =
        Math.sqrt(
            targetForward.x * targetForward.x +
            targetForward.z * targetForward.z
        );

    if (
        compassHeading != null &&
        horizontalLength > 0.35
    ) {
        let rawAzimuth =
            Math.atan2(
                targetForward.x,
                targetForward.z
            ) * 180 / Math.PI;

        rawAzimuth =
            (rawAzimuth + 360) % 360;

        let desiredOffset =
            compassHeading - rawAzimuth;

        desiredOffset =
            (
                desiredOffset +
                540
            ) % 360 - 180;

        if (compassYawOffset == null) {
            compassYawOffset =
                desiredOffset;
        }
        else {
            let difference =
                desiredOffset -
                compassYawOffset;

            difference =
                (
                    difference +
                    540
                ) % 360 - 180;

            compassYawOffset +=
                difference * 0.04;
        }
    }

    if (compassYawOffset != null) {
        const correction =
            compassYawOffset *
            Math.PI / 180;

        targetForward =
            normalize(
                rotateVector(
                    targetForward,
                    { x: 0, y: 1, z: 0 },
                    correction
                )
            );

        targetUp =
            normalize(
                rotateVector(
                    targetUp,
                    { x: 0, y: 1, z: 0 },
                    correction
                )
            );
    }

    smoothedForward =
        smoothOrientationVector(
            smoothedForward,
            targetForward,
            0.18
        );

    smoothedUp =
        smoothOrientationVector(
            smoothedUp,
            targetUp,
            0.18
        );

    cameraForward =
        normalize(smoothedForward);

    const upDotForward =
        dot(
            smoothedUp,
            cameraForward
        );

    const correctedUp = {
        x:
            smoothedUp.x -
            cameraForward.x *
            upDotForward,

        y:
            smoothedUp.y -
            cameraForward.y *
            upDotForward,

        z:
            smoothedUp.z -
            cameraForward.z *
            upDotForward
    };

    cameraUp =
        normalize(correctedUp);

    requestSkyRedraw();
}


async function enableMotionMode() {
    if (
        typeof DeviceOrientationEvent !==
            "undefined" &&
        typeof DeviceOrientationEvent
            .requestPermission === "function"
    ) {
        try {
            const permission =
                await DeviceOrientationEvent
                    .requestPermission();

            if (permission !== "granted") {
                alert(
                    "Motion access is needed to move the Sky Map with your phone."
                );

                return;
            }

        } catch (error) {
            console.error(
                "Motion permission error:",
                error
            );

            alert(
                "Could not enable motion controls."
            );

            return;
        }
    }

    motionModeEnabled = true;

    smoothedForward = null;
    smoothedUp = null;
    compassYawOffset = null;
    

    window.addEventListener(
        "deviceorientation",
        handleDeviceOrientation,
        true
    );

    updateMotionButton();
}


function disableMotionMode() {
    motionModeEnabled = false;

    window.removeEventListener(
        "deviceorientation",
        handleDeviceOrientation,
        true
    );

    smoothedForward = null;
    smoothedUp = null;
    compassYawOffset = null;

    updateMotionButton();
}


const motionModeButton =
    document.getElementById(
        "motionModeButton"
    );


if (motionModeButton) {
    motionModeButton.addEventListener(
        "click",
        async () => {
            if (motionModeEnabled) {
                disableMotionMode();
            } else {
                await enableMotionMode();
            }
        }
    );
}


function updateMotionButton() {
    if (!motionModeButton) {
        return;
    }

    motionModeButton.textContent =
        motionModeEnabled
            ? "◉ Motion On"
            : "◉ Motion";

    motionModeButton.classList.toggle(
        "active",
        motionModeEnabled
    );
}