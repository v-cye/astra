let skyZoom = 1;

let cameraForward = {
    x: 0,
    y: Math.sin(45 * Math.PI / 180),
    z: -Math.cos(45 * Math.PI / 180)
};

let cameraUp = {
    x: 0,
    y: Math.cos(45 * Math.PI / 180),
    z: Math.sin(45 * Math.PI / 180)
};

let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

let constellationData = [];
let constellationPromise = null;

const skyCanvas = document.getElementById("skyCanvas");
const skyContext = skyCanvas.getContext("2d");

loadConstellations();


function loadConstellations() {
    if (!constellationPromise) {
        constellationPromise = fetch("data/constellations.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Could not load constellation data");
                }

                return response.json();
            })
            .then(data => {
                constellationData = data;

                if (typeof drawSky === "function") {
                    drawSky();
                }

                return data;
            })
            .catch(error => {
                console.error("Constellation error:", error);
                throw error;
            });
    }

    return constellationPromise;
}


function drawSky() {
    skyObjectsOnScreen = [];
    
    skyContext.clearRect(
        0,
        0,
        skyCanvas.width,
        skyCanvas.height
    );

    skyContext.fillStyle = "#02050a";

    skyContext.fillRect(
        0,
        0,
        skyCanvas.width,
        skyCanvas.height
    );

    drawHorizonLine();
    drawConstellationLines();
    
    drawStars();
    drawDeepSkyObjects();

    drawPlanets();
    drawSunAndMoon();

    updateSkyDirection();
}


function resizeSkyCanvas() {
    const rect = skyCanvas.getBoundingClientRect();

    skyCanvas.width = rect.width;
    skyCanvas.height = rect.height;

    drawSky();
}

window.addEventListener("resize", resizeSkyCanvas);
resizeSkyCanvas();


function getStarByHip(hip) {
    return starByHip.get(Number(hip)) || null;
}