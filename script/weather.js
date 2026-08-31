async function getWeather(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,cloud_cover,dew_point_2m,wind_speed_10m,wind_direction_10m,surface_pressure,visibility&hourly=cloud_cover,temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();

    const current = data.current;
    const hourly = data.hourly;

    astraData.weather = current;
    astraData.hourly = hourly;


    const currentTime = current.time;
    
    let startIndex = hourly.time.findIndex(time => {
        return time > currentTime;
    });

    if (startIndex === -1) {
        startIndex = 0;
    }

    let forecastHTML = "";

    for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]);
        const hour = time.toLocaleTimeString([], { hour: "numeric" });

        forecastHTML += `
            <div class="hour-card">
                <span class="hour-time">${hour}</span>
                <span class="hour-temp">${Math.round(hourly.temperature_2m[i])}°</span>
                <span class="hour-cloud">☁ ${hourly.cloud_cover[i]}%</span>
            </div>
        `;
    }

    document.getElementById("hourlyForecast").innerHTML = forecastHTML;
    document.getElementById("cloudCover").textContent = current.cloud_cover + "%";
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("temperature").textContent = current.temperature_2m + "°C";
    document.getElementById("dewPoint").textContent = current.dew_point_2m + "°C";
    
    const windDirection = getWindDirection(current.wind_direction_10m);
    document.getElementById("wind").textContent = current.wind_speed_10m + " km/h " + windDirection;
    
    document.getElementById("weatherTemperature").textContent =
    current.temperature_2m + "°C";

    document.getElementById("weatherCloud").textContent =
        current.cloud_cover + "%";

    document.getElementById("weatherHumidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("weatherDewPoint").textContent =
        current.dew_point_2m + "°C";

    document.getElementById("weatherWind").textContent =
        current.wind_speed_10m + " km/h " + windDirection;

    document.getElementById("weatherPressure").textContent =
        Math.round(current.surface_pressure) + " hPa";

    document.getElementById("weatherVisibility").textContent =
        (current.visibility / 1000).toFixed(1) + " km";

    document.getElementById("weatherHourly").innerHTML =
        forecastHTML;

    updateObservingQuality();
    calculateHourlyScores();
}

function getWindDirection(degrees) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees/45) % 8;
    return directions[index];
}