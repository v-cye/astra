// Cloud Score
function calculateCloudScore(cloudCover) {
    return 100 - cloudCover;
}


// Humidity Score
function calculateHumidityScore(humidity) {
    if (humidity<50) {
        return 100;
    } else if (humidity < 70) {
        return 85;
    } else if (humidity < 80) {
        return 65;
    } else if (humidity < 90) {
        return 40;
    } else {
        return 15;
    }
}


// Wind Score
function calculateWindScore(windSpeed) {
    if (windSpeed < 5) {
        return 100;
    } else if (windSpeed < 10) {
        return 90;
    } else if (windSpeed < 20) {
        return 70;
    } else if (windSpeed < 30) {
        return 40;
    } else {
        return 10;
    }
}

// Moon Score
function calculateMoonScore(moonIllumination) {
    if (moonIllumination < 10) {
        return 100;
    } else if (moonIllumination < 30) {
        return 90;
    } else if (moonIllumination < 50) {
        return 75;
    } else if (moonIllumination < 75) {
        return 55;
    } else {
        return 30;
    }
}

// Total Score
function calculateObservingQuality(cloudCover, humidity, windSpeed, moonIllumination) {
    const cloudScore = calculateCloudScore(cloudCover);
    const humidityScore = calculateHumidityScore(humidity);
    const windScore = calculateWindScore(windSpeed);
    const moonScore = calculateMoonScore(moonIllumination);

    const score =
        cloudScore * .50 + 
        moonScore * .20 +
        humidityScore * .15 +
        windScore * 0.15;

    return Math.round(score);
}

function updateObservingQuality() {
    if (astraData.weather && astraData.astronomy) {
        const weather = astraData.weather;
        const astronomy = astraData.astronomy;

        const score = calculateObservingQuality(
            weather.cloud_cover,
            weather.relative_humidity_2m,
            weather.wind_speed_10m,
            astronomy.moon_illumination
        );

        astraData.observingScore = score;

        document.getElementById("observingQuality").textContent = 
            score + " / 100";

        document.getElementById("conditionsScore").textContent =
            score + " / 100";

        const label = getObservingLabel(score);

        document.getElementById("conditionsExplanation").textContent = getObservingExplanation(weather, astronomy);

        document.getElementById("conditionsScoreLabel").textContent = label;

        document.getElementById("conditionsCloud").textContent =
            weather.cloud_cover + "%";

        document.getElementById("conditionsHumidity").textContent =
            weather.relative_humidity_2m + "%";

        document.getElementById("conditionsWind").textContent =
            weather.wind_speed_10m + " km/h";

        document.getElementById("conditionsMoon").textContent =
            astronomy.moon_illumination + "%";
    }
}

function getObservingLabel(score) {
    if (score >= 80) {
        return "Excellent";
    } else if (score >= 65) {
        return "Good";
    } else if (score >=50) {
        return "Fair";
    } else if (score >=30) {
        return "Poor";
    } else {
        return "Very Poor";
    }
}

function calculateHourlyScores() {
    if (
        !astraData.hourly || 
        !astraData.astronomy ||
        !astraData.tomorrowAstronomy 
    ) {
        return;
    }

    const hourly = astraData.hourly;
    const moonIllumination = astraData.astronomy.moon_illumination;

    const darknessStart =
        new Date(astraData.astronomy.astronomical_twilight_end);
    
    const darknessEnd =
        new Date(astraData.tomorrowAstronomy.astronomical_twilight_begin);

    const nighttimeScores = [];

    for (let i = 0; i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]);

        if (time >= darknessStart && time <= darknessEnd) {
            const score = calculateObservingQuality(
                hourly.cloud_cover[i],
                hourly.relative_humidity_2m[i],
                hourly.wind_speed_10m[i],
                moonIllumination
            );

            nighttimeScores.push({
                time: hourly.time[i],
                score: score
            });
        }
    }

    const bestWindow = findBestObservingWindow(nighttimeScores);

    if(bestWindow) {
        astraData.bestWindow = bestWindow;

        const startTime = formatTime(bestWindow.start);
        const endTime = formatTime(bestWindow.end);

        document.getElementById("bestWindow").textContent = startTime + " - " + endTime;
    
        document.getElementById("bestWindowScore").textContent = bestWindow.score + " / 100";
  
    } else {
        document.getElementById("bestWindow").textContent = "No good window tonight";

        document.getElementById("bestWindowScore").textContent = "Conditions remain unfavorable throughout the night.";
    }
}

function findBestObservingWindow(nighttimeScores) {
    if (nighttimeScores.length < 3) {
        return null;
    }

    let bestAverage = -1;
    let bestStart = null;
    let bestEnd = null;

    for (let i =0; i < nighttimeScores.length - 2; i++) {
        const firstScore = nighttimeScores[i].score;
        const secondScore = nighttimeScores[i + 1].score;
        const thirdScore = nighttimeScores[i + 2].score;

        const average = (firstScore + secondScore + thirdScore) / 3;

        const minimum = Math.min(
            firstScore,
            secondScore,
            thirdScore
        );

        if (minimum >= 40 && average > bestAverage) {
            bestAverage = average;
            bestStart = nighttimeScores[i].time;
            bestEnd = nighttimeScores[i + 2].time;
        }
    }

    if (bestStart === null) {
        return null;
    }

    return {
        start: bestStart,
        end: bestEnd,
        score: Math.round(bestAverage)
    };
}

window.addEventListener("load", () => {
    getLocation();
});


function getObservingExplanation(weather, astronomy) {
    const problems = [];

    if (weather.cloud_cover >= 70) {
        problems.push("Heavy cloud cover will make observing difficult.");
    } else if (weather.cloud_cover >= 40) {
        problems.push("Cloud cover may interrupt observing.");
    }

    if (astronomy.moon_illumination >= 75) {
        problems.push("Bright moonlight may wash out faint deep-sky objects.");
    }

    if (weather.relative_humidity_2m >= 80) {
        problems.push("High humidity may reduce sky clarity.");
    }

    if (weather.wind_speed_10m >= 20) {
        problems.push("Strong wind may make observing less comfortable.");
    }

    if (problems.length === 0) {
        return "Conditions are favorable for observing tonight.";
    }

    return problems.slice(0, 2).join(" ");
}