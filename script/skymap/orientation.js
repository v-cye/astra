let motionModeEnabled = false;

let smoothedForward = null;
let smoothedUp = null;


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

    const qAlpha =
        quaternionFromAxisAngle(
            { x: 0, y: 0, z: 1 },
            alpha
        );

    const qBeta =
        quaternionFromAxisAngle(
            { x: 1, y: 0, z: 0 },
            beta
        );

    const qGamma =
        quaternionFromAxisAngle(
            { x: 0, y: 1, z: 0 },
            gamma
        );

    let q =
        multiplyQuaternions(
            qAlpha,
            multiplyQuaternions(
                qBeta,
                qGamma
            )
        );


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

    const targetForward =
        rotateVectorByQuaternion(
            {
                x: 0,
                y: 0,
                z: -1
            },
            quaternion
        );

    const targetUp =
        rotateVectorByQuaternion(
            {
                x: 0,
                y: 1,
                z: 0
            },
            quaternion
        );

    smoothedForward =
        smoothOrientationVector(
            smoothedForward,
            targetForward
        );

    smoothedUp =
        smoothOrientationVector(
            smoothedUp,
            targetUp
        );

    cameraForward =
        normalize(smoothedForward);

    let right =
        cross(
            cameraForward,
            smoothedUp
        );

    const rightLength =
        Math.sqrt(
            right.x * right.x +
            right.y * right.y +
            right.z * right.z
        );

    if (rightLength > 0.0001) {
        right = normalize(right);

        cameraUp =
            normalize(
                cross(
                    right,
                    cameraForward
                )
            );
    }

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