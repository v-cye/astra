let motionModeEnabled = false;

let smoothedHeading = null;
let smoothedAltitude = null;

function clampOrientation(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function smoothValue(current, target, amount = 0.18) {
    if (current == null) {
        return target;
    }

    return current + (target - current) * amount;
}


function smoothCompassHeading(current, target, amount = 0.18) {
    if (current == null) {
        return target;
    }

    let difference = ((target - current + 540) % 360) - 180;

    return (current + difference * amount + 360) % 360;
}


function handleDeviceOrientation(event) {
    if (!motionModeEnabled) {
        return;
    }

    let heading = null;

    if (typeof event.webkitCompassHeading === "number") {
        heading = (360 - event.webkitCompassHeading) % 360;
    }

    else if (event.alpha != null) {
        heading = event.alpha;
    }

    if (
        heading == null || event.beta == null
    ) {
        return;
    }


    let altitude = event.beta - 90;

    altitude = clampOrientation(altitude, -90, 90);

    smoothedHeading = smoothCompassHeading(smoothedHeading, heading);

    smoothedAltitude = smoothValue(smoothedAltitude, altitude);

    pointCameraAtHorizon(smoothedAltitude, smoothedHeading);

    requestSkyRedraw();
}

async function enabledMotionMode() {

    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();

            if (permission !== "granted") {
                alert("Motion access is needed to move Sky Map with your phone");

                return;
            }
        } catch (error) {
            console.error("Motion permission error:", error);

            return;
        }
    }

    motionModeEnabled = true;

    smoothedHeading = null;
    smoothedAltitude = null;

    window.addEventListener(
        "deviceorientation", handleDeviceOrientation, true
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

    updateMotionButton();
}


const motionModeButton = document.getElementById("motionModeButton");

if (motionModeButton) {
    motionModeButton.addEventListener(
        "click",
        async () => {
            if (motionModeEnabled) {
                disableMotionMode();
            } else {
                await enabledMotionMode();
            }
        }
    );
}
    


function updateMotionButton() {
    motionModeButton.textContent = motionModeEnabled
        ? "◉ Motion On" : "◉ Motion";

    motionModeButton.classList.toggle("active", motionModeEnabled);
}