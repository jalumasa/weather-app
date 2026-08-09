import React from "react";
import sunIcon from "./img/icons/sun.png";
import fogIcon from "./img/icons/foggy-day.png";
import drizzleIcon from "./img/icons/drizzle.png";
import moderateRainIcon from "./img/icons/moderate-rain.png";
import lightRainIcon from "./img/icons/light rain.png";
import showerRainIcon from "./img/icons/shower.png";
import fewCloudsIcon from "./img/icons/cloud and sun.png";
import scatteredCloudsIcon from "./img/icons/sun and scattered clouds.png";
import brokenCloudsIcon from "./img/icons/broken clouds.png";
import overcastCloudsIcon from "./img/icons/overcast clouds.png";
import heavyIntensityRain from "./img/icons/heavy-intensity-rain.png";
import clearNight from "./img/icons/calm night.png";
import foggyNight from "./img/icons/foggy-night.png";
import moderateRainyNight from "./img/icons/rainy night.png";
import lightRainyNight from "./img/icons/night-rain.png";
import cloudyNight from "./img/icons/night-cloud.png";
import showerRainyNight from "./img/icons/heavy-rainy-night.png";

function WeatherIcon({ weatherMain, weatherDescription, timeOfDay }) {
  if (timeOfDay === "day") {
    if (weatherMain === "Clear") {
      return <img src={sunIcon} className="colored-svg" alt="Clear sky" />;
    }

    if (weatherMain === "Clouds") {
      switch (weatherDescription) {
        case "few clouds":
          return <img src={fewCloudsIcon} alt="Few clouds" />;
        case "scattered clouds":
          return <img src={scatteredCloudsIcon} alt="Scattered clouds" />;
        case "broken clouds":
          return <img src={brokenCloudsIcon} alt="Broken clouds" />;
        case "overcast clouds":
          return <img src={overcastCloudsIcon} alt="Overcast clouds" />;
        case "haze":
          return <img src={overcastCloudsIcon} alt="Overcast clouds" />;
        default:
          return <img src={overcastCloudsIcon} alt="Cloudy" />;
      }
    }

    if (weatherMain === "Clouds") {
      switch (weatherDescription) {
        case "haze":
          return <img src={overcastCloudsIcon} alt="Overcast clouds" />;
        default:
          return <img src={overcastCloudsIcon} alt="Cloudy" />;
      }
    }

    if (weatherMain === "Rain") {
      switch (weatherDescription) {
        case "light rain":
          return <img src={lightRainIcon} alt="Light rain" />;
        case "moderate rain":
          return <img src={moderateRainIcon} alt="Moderate rain" />;
        case "heavy intensity rain":
          return <img src={heavyIntensityRain} alt="Heavy rain" />;
        case "shower rain":
          return <img src={showerRainIcon} alt="Shower rain" />;
        default:
          return <img src={moderateRainIcon} alt="Rain" />;
      }
    }

    if (weatherMain === "Drizzle") {
      return <img src={drizzleIcon} alt="Drizzle" />;
    }

    if (weatherMain === "Mist") {
      return <img src={fogIcon} alt="Mist" />;
    }
  } else if (timeOfDay === "night") {
    if (weatherMain === "Clear") {
      return <img src={clearNight} alt="Clear night" />;
    }

    if (weatherMain === "Clouds") {
      switch (weatherDescription) {
        case "few clouds":
          return <img src={cloudyNight} alt="Few clouds night" />;
        case "scattered clouds":
          return <img src={cloudyNight} alt="Scattered clouds night" />;
        case "broken clouds":
          return <img src={cloudyNight} alt="Broken clouds night" />;
        case "overcast clouds":
          return <img src={cloudyNight} alt="Overcast clouds night" />;
        default:
          return <img src={cloudyNight} alt="Cloudy night" />;
      }
    }

    if (weatherMain === "Rain") {
      switch (weatherDescription) {
        case "light rain":
          return <img src={lightRainyNight} alt="Light rain night" />;
        case "moderate rain":
          return <img src={moderateRainyNight} alt="Moderate rain night" />;
        case "heavy intensity rain":
          return <img src={showerRainyNight} alt="Heavy rain night" />;
        case "shower rain":
          return <img src={showerRainyNight} alt="Shower rain night" />;
        default:
          return <img src={moderateRainyNight} alt="Rain night" />;
      }
    }

    if (weatherMain === "Drizzle") {
      return <img src={drizzleIcon} alt="Drizzle night" />;
    }

    if (weatherMain === "Mist") {
      return <img src={foggyNight} alt="Mist night" />;
    }
  }

  return <div>No Specific display</div>;
}

export default WeatherIcon;
