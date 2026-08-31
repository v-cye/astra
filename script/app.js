const astraData = {
    weather: null,
    hourly: null,
    astronomy: null,
    tomorrowAstronomy: null,
    observingScore: null,

    latitude: null,
    longitude: null
};

// location
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showLocation);
    } else {
        document.getElementById("location").innerHTML = 
            "Geolocation is not supported.";
    }
}

function showLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    astraData.latitude = latitude;
    astraData.longitude = longitude;

    
    if (typeof drawSky === "function") {
        drawSky();
    }

    const latDirection = latitude >= 0? "N" : "S";
    const lonDirection = longitude >= 0? "E" : "W";

    document.getElementById("location").innerHTML =
        "<h3>📍 Your Location</h3>" +
        Math.abs(latitude).toFixed(2) + "°" + latDirection + ", " + 
        Math.abs(longitude).toFixed(2) + "°" + lonDirection;

    getWeather(latitude, longitude);
    getSunData(latitude, longitude);

}

function showPage(pageId, navButton) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
    });

    navButton.classList.add("active");

    // Important for the Sky Map canvas
    if (pageId === "skyMapPage") {
        resizeSkyCanvas();
    }

    if (pageId === "savedPage") {
        displaySavedObjects();
    }
}

function showConditionTab(tabId, tabButton) {
    document.querySelectorAll(".condition-tab-content").forEach(tab => {
        tab.classList.remove("active");
    });

    document.getElementById(tabId).classList.add("active");

    document.querySelectorAll(".condition-tab").forEach(button => {
        button.classList.remove("active");
    });

    tabButton.classList.add("active");
}