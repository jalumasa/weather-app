import React, { useEffect, useState } from "react";
import "../assets/css/favourites.css"
import WeatherIcon from "../weatherIcon";

function FavouriteCard({ city, onClick }) {
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:3001/cityweather?name=${city.name}&units=metric`)
      .then((response) => response.json())
      .then( (data) => {
        setWeatherData(data);
      })
      .catch((error) => console.error("Error fetching weather data:", error));
  }, [city.name]);

  const getWeatherBackgroundClass = () => {
    if (!weatherData) return "default-background";

    const { main, description } = weatherData.weather[0];
    const timeOfDay =
      weatherData.dt > weatherData.sys.sunrise &&
      weatherData.dt < weatherData.sys.sunset
        ? "day"
        : "night";

    if (main === "Clear") {
      return timeOfDay === "day"
        ? "sunny-background"
        : "clear-night-background";
    }

    if (main === "Clouds") {
      switch (description) {
        case "few clouds":
          return timeOfDay === "day"
            ? "few-clouds-background"
            : "cloudy-night-background";
        case "scattered clouds":
          return timeOfDay === "day"
            ? "scattered-clouds-background"
            : "cloudy-night-background";
        case "broken clouds":
          return timeOfDay === "day"
            ? "broken-clouds-background"
            : "cloudy-night-background";
        case "overcast clouds":
          return timeOfDay === "day"
            ? "overcast-clouds-background"
            : "cloudy-night-background";
        default:
          return "cloudy-background";
      }
    }

    if (main === "Rain") {
      switch (description) {
        case "light rain":
          return timeOfDay === "day"
            ? "light-rain-background"
            : "light-rain-night-background";
        case "moderate rain":
          return timeOfDay === "day"
            ? "moderate-rain-background"
            : "moderate-rain-night-background";
        case "heavy intensity rain":
          return timeOfDay === "day"
            ? "heavy-rain-background"
            : "heavy-rain-night-background";
        case "shower rain":
          return timeOfDay === "day"
            ? "shower-rain-background"
            : "shower-rain-night-background";
        default:
          return "rain-background";
      }
    }

    if (main === "Drizzle") {
      return "drizzle-background";
    }

    if (main === "Mist" || main === "Fog") {
      return timeOfDay === "day"
        ? "foggy-background"
        : "foggy-night-background";
    }

    return "default-background";
  };

  if (!weatherData) {
    return (
      <div className="favourite-card default-background" onClick={onClick}>
        <h2>{city.name}</h2>
      </div>
    );
  }

  const timeOfDay =
    weatherData.dt > weatherData.sys.sunrise &&
    weatherData.dt < weatherData.sys.sunset
      ? "day"
      : "night";

  return (
    <div
      className={`favourite-card ${getWeatherBackgroundClass()}`}
      onClick={onClick}
    >
      <h2>{city.name}</h2>
      <WeatherIcon
        weatherMain={weatherData.weather[0].main}
        weatherDescription={weatherData.weather[0].description}
        timeOfDay={timeOfDay}
      />
    </div>
  );
}

export default FavouriteCard;
