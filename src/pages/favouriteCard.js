import React, { useEffect, useState } from "react";
import "../assets/css/mainPage.css";
import WeatherIcon from "../weatherIcon";

function FavouriteCard({ city, onClick, onRemove }) {
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    fetch(`/api/cityweather?name=${city.name}&units=metric`)
      .then((response) => response.json())
      .then((data) => {
        setWeatherData(data);
      })
      .catch((error) => console.error("Error fetching weather data:", error));
  }, [city.name]);

  const timeOfDay =
    weatherData &&
    weatherData.dt > weatherData.sys.sunrise &&
    weatherData.dt < weatherData.sys.sunset
      ? "day"
      : "night";

  return (
    <div
      onClick={onClick}
      className="glass-card group relative cursor-pointer p-5 text-center transition hover:-translate-y-0.5"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove from favourites"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-[9999px] bg-white/10 text-white/60 opacity-0 transition hover:bg-pop-500/80 hover:text-white group-hover:opacity-100"
      >
        <i className="fa-solid fa-xmark text-xs"></i>
      </button>

      <h2 className="text-lg font-semibold">{city.name}</h2>

      {weatherData ? (
        <>
          <p className="day-forecast my-2 flex justify-center">
            <WeatherIcon
              weatherMain={weatherData.weather[0].main}
              weatherDescription={weatherData.weather[0].description}
              timeOfDay={timeOfDay}
            />
          </p>
          <p className="text-3xl font-bold">
            {Math.round(weatherData.main.temp)}°C
          </p>
          <p className="mt-1 text-sm capitalize text-white/60">
            {weatherData.weather[0].description}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-white/50">Loading...</p>
      )}
    </div>
  );
}

export default FavouriteCard;
