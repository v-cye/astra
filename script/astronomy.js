async function getSunData(latitude, longitude) {
    const url = `https://api.sunrise-sunset.org/v2?lat=${latitude}&lng=${longitude}`;

    const response = await fetch(url);
    const data = await response.json();
    astraData.astronomy = data;

    const today = new Date();
    const tomorrow = new Date(today);

    tomorrow.setDate(today.getDate() + 1);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");

    const tomorrowDate = `${year}-${month}-${day}`;
    

    const tomorrowUrl = `https://api.sunrise-sunset.org/v2?lat=${latitude}&lng=${longitude}&date=${tomorrowDate}`;
    
    const tomorrowResponse = await fetch(tomorrowUrl);
    const tomorrowData = await tomorrowResponse.json();

    const darknessStart = new Date(data.astronomical_twilight_end);
    const darknessEnd = new Date(tomorrowData.astronomical_twilight_begin);

    document.getElementById("darknessRange").textContent =
        formatTime(data.astronomical_twilight_end) +
        " - " +
        formatTime(tomorrowData.astronomical_twilight_begin);

    const darknessMilliseconds = darknessEnd - darknessStart;
    const darknessMinutes = Math.floor(darknessMilliseconds / 60000);

    const darknessHours = Math.floor(darknessMinutes / 60);
    const remainingMinutes = darknessMinutes % 60;

    document.getElementById("darknessDuration").textContent =
        darknessHours + "h " + remainingMinutes + "m";

    astraData.tomorrowAstronomy = tomorrowData;

    document.getElementById("astronomyMoonPhase").textContent =
        data.moon_phase;

    document.getElementById("astronomyMoonIllumination").textContent =
        data.moon_illumination + "%";

    document.getElementById("astronomySunset").textContent =
        formatTime(data.sunset);

    document.getElementById("astronomyCivilEnd").textContent =
        formatTime(data.civil_twilight_end);

    document.getElementById("astronomyNauticalEnd").textContent =
        formatTime(data.nautical_twilight_end);

    document.getElementById("astronomyDarknessStart").textContent =
        formatTime(data.astronomical_twilight_end);

    document.getElementById("astronomyDarknessEnd").textContent =
        formatTime(tomorrowData.astronomical_twilight_begin);

    document.getElementById("astronomySunrise").textContent =
        formatTime(tomorrowData.sunrise);

    document.getElementById("moonPhase").textContent = data.moon_phase;
    document.getElementById("sunset").textContent = formatTime(data.sunset);
    document.getElementById("darkness").textContent = formatTime(data.astronomical_twilight_end);

    updateObservingQuality();
    calculateHourlyScores();

    getPlanetsTonight(latitude, longitude);
    getStarsTonight(latitude, longitude);
    getDeepSkyTonight(latitude, longitude);
}

function formatTime(dateTimeString) {
    const date = new Date(dateTimeString);

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}