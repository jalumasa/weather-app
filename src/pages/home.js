import React, { useEffect, useCallback } from "react";
import { useState } from "react";
import axios from "axios";
import { useLocation as useReactRouterLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import WeatherIcon from "../weatherIcon.js";
import "../assets/css/mainPage.css";
import WeatherCanvas from "../components/WeatherCanvas.js";
import useCountUp from "../hooks/useCountUp.js";
import CitySearchBox from "../components/CitySearchBox.js";
import ConditionsGrid from "../components/ConditionsGrid.js";

// Used when geolocation is denied or unavailable, so the app still has
// something to show instead of getting stuck on "Failed to fetch weather data".
const FALLBACK_LOCATION = { latitude: 1.3107, longitude: 36.825 };

/*
  Forecast timestamps come back as UTC. Shifting a slot by the city's offset
  and then reading it in UTC gives that city's wall clock, which is the only
  clock worth showing - the forecast for Tokyo should read in Tokyo's hours no
  matter where the browser is.

  These live at module scope because both fetch paths (search by name, fetch by
  coordinates) run the same pipeline, and keeping the date logic in one place is
  what stops the two from drifting apart again.
*/
const cityClock = (unixSeconds, offsetSeconds = 0) =>
  new Date((unixSeconds + offsetSeconds) * 1000);

const cityTimeLabel = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

const cityDayOrNight = (date) => {
  const hours = date.getUTCHours();
  return hours >= 6 && hours < 18 ? "day" : "night";
};

// YYYY-MM-DD in the city's own calendar, used to group slots into days.
const cityDateKey = (date) => date.toISOString().split("T")[0];

// "Friday" rather than "08/14". Noon avoids any edge where a midnight
// timestamp could round to the neighbouring day.
const weekdayLabel = (dateKey) =>
  new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

const shiftDateKey = (dateKey, days) => {
  const shifted = new Date(`${dateKey}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return cityDateKey(shifted);
};

// Where "now" sits between sunrise and sunset, 0..1, for the sun arc.
const sunPosition = (now, sunrise, sunset) => {
  if (!now || !sunrise || !sunset || sunset <= sunrise) return 0;
  return Math.min(1, Math.max(0, (now - sunrise) / (sunset - sunrise)));
};

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

const compassPoint = (degrees) =>
  COMPASS[Math.round((degrees % 360) / 22.5) % 16];

/*
  Everything the conditions grid shows, derived in one place from responses
  both fetch paths already have. Only the UV call is extra.

  Kept at module scope for the same reason as the date helpers: the two fetch
  paths run this pipeline in duplicate, and every bug that's been fixed in one
  and missed in the other started as logic living inside them.
*/
function buildMetrics({ current, forecastList, uv, units }) {
  const imperial = units === "imperial";
  const next24h = (forecastList || []).slice(0, 8);

  // OpenWeatherMap reports metric wind in m/s, not km/h - the label has been
  // saying Km/h over an m/s number, under-reporting by a factor of 3.6.
  const toWindUnit = (value) =>
    value == null ? null : imperial ? value : value * 3.6;

  /*
    The current reading usually omits gusts - OpenWeatherMap only sends the
    field when there's something to report. Falling back to the first forecast
    slot produced nonsense: a gust from three hours away, printed next to the
    wind right now, and sometimes *lower* than it, which a gust can never be.

    Taking the strongest across now and the next day is both truthful and
    always >= the sustained wind, so the pair can't contradict itself.
  */
  const gustCandidates = [
    current.wind?.gust,
    current.wind?.speed,
    ...next24h.map((slot) => slot.wind?.gust),
  ].filter((value) => typeof value === "number");
  const gustSource = gustCandidates.length ? Math.max(...gustCandidates) : null;

  // Chance of rain is the worst it gets over the next day, not an average -
  // "40% at some point" is the thing worth planning around.
  const pop = next24h.length
    ? Math.max(...next24h.map((slot) => slot.pop || 0))
    : null;

  const rainVolume = next24h.reduce(
    (total, slot) => total + (slot.rain?.["3h"] || 0) + (slot.snow?.["3h"] || 0),
    0
  );

  const daylightSeconds =
    current.sys?.sunset && current.sys?.sunrise
      ? current.sys.sunset - current.sys.sunrise
      : null;

  return {
    feelsLike: current.main?.feels_like ?? null,
    windSpeed: toWindUnit(current.wind?.speed),
    windGust: toWindUnit(gustSource),
    windDeg: current.wind?.deg ?? null,
    windPoint: current.wind?.deg == null ? null : compassPoint(current.wind.deg),
    humidity: current.main?.humidity ?? null,
    dewPoint: next24h[0]?.main?.dew_point ?? null,
    pressure: imperial
      ? (current.main?.pressure ?? 0) * 0.02953
      : current.main?.pressure ?? null,
    pressureUnit: imperial ? "inHg" : "hPa",
    visibility:
      current.visibility == null
        ? null
        : imperial
        ? current.visibility / 1609.34
        : current.visibility / 1000,
    visibilityUnit: imperial ? "mi" : "km",
    cloudCover: current.clouds?.all ?? null,
    pop: pop == null ? null : Math.round(pop * 100),
    precipitation: imperial ? rainVolume / 25.4 : rainVolume,
    precipitationUnit: imperial ? "in" : "mm",
    uvNow: uv?.now ?? null,
    uvMax: uv?.max ?? null,
    daylight:
      daylightSeconds == null
        ? null
        : `${Math.floor(daylightSeconds / 3600)}h ${Math.round(
            (daylightSeconds % 3600) / 60
          )}m`,
  };
}

/*
  Temperature ramp for the 7-day range bars. This is the one place colour is
  allowed into the interface, because here it *is* the data - the bar tells you
  how hot a day is, not just where it sits. Stops are in Celsius and deliberately
  muted; anything more saturated fights the near-black stage.
*/
const TEMP_STOPS = [
  [-10, [110, 170, 225]],
  [0, [128, 196, 228]],
  [10, [150, 200, 175]],
  [18, [222, 202, 128]],
  [26, [230, 160, 100]],
  [34, [226, 118, 95]],
  [42, [214, 84, 84]],
];

const tempColor = (value, units) => {
  // The ramp is defined in Celsius, so imperial readings convert first -
  // otherwise 70F would be read as scorching.
  const celsius = units === "imperial" ? ((value - 32) * 5) / 9 : value;

  if (celsius <= TEMP_STOPS[0][0]) return `rgb(${TEMP_STOPS[0][1].join(",")})`;
  const last = TEMP_STOPS[TEMP_STOPS.length - 1];
  if (celsius >= last[0]) return `rgb(${last[1].join(",")})`;

  for (let i = 0; i < TEMP_STOPS.length - 1; i += 1) {
    const [lowTemp, lowRgb] = TEMP_STOPS[i];
    const [highTemp, highRgb] = TEMP_STOPS[i + 1];
    if (celsius >= lowTemp && celsius <= highTemp) {
      const t = (celsius - lowTemp) / (highTemp - lowTemp);
      const mixed = lowRgb.map((channel, c) =>
        Math.round(channel + (highRgb[c] - channel) * t)
      );
      return `rgb(${mixed.join(",")})`;
    }
  }
  return `rgb(${last[1].join(",")})`;
};

function Home({ weatherMain }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [data2, setData2] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [favourites, setFavourites] = useState([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [todaysData, setTodaysData] = useState([]);
  const [location, setLocation] = useState({
    latitude: "",
    longitude: "",
  });
  const [units, setUnits] = useState("metric");
  const [unitName, setUnitName] = useState({ temp: "C", speed: "Km/h" });
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [clickedFavourites, setClickedFavourites] = useState(false);
  const [times, setTimes] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [sunProgress, setSunProgress] = useState(0);
  const reactRouterLocation = useReactRouterLocation();

  //Fetch + process weather/forecast/timezone for a given city name, then
  //set all the derived state. Shared by the search box and by anything that
  //navigates to /home?city=<name> (favourites, direct links).
  const fetchAndSetWeatherByCity = useCallback(
    async (cityName) => {
      if (!cityName) return;
      setLoading(true);
      const apiUrl = `/cityweather?name=${encodeURIComponent(
        cityName
      )}&units=${units}`;
      const apiForecast = `/cityforecast?name=${encodeURIComponent(
        cityName
      )}&units=${units}`;

      try {
        const [currentWeatherResponse, forecastWeatherResponse] =
          await Promise.all([axios.get(apiUrl), axios.get(apiForecast)]);

        const currentResponse = currentWeatherResponse.data;
        const weatherMain = currentResponse.weather[0].main;
        const weatherDescription = currentResponse.weather[0].description;

        const latitude = currentResponse.coord.lat;
        const longitude = currentResponse.coord.lon;

        // Day vs night has to come from the searched city's own clock, not the
        // viewer's - otherwise looking up Phoenix at 1pm from Nairobi renders a
        // moon and a starfield over a 37C afternoon.
        const tzResponse = await axios.get(
          `/timeZone?lat=${latitude}&lon=${longitude}`
        );
        const cityNow = new Date(tzResponse.data.formatted);
        const cityHour = cityNow.getHours();
        const timeOfDay = cityHour >= 6 && cityHour < 18 ? "day" : "night";

        const timeRefined = cityNow.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        setTimes({ time: timeRefined });

        // Sunrise/sunset are unix UTC; without shifting by the city's offset
        // they render in the viewer's zone, which had Phoenix rising at 3:48pm.
        const cityOffset = currentResponse.timezone || 0;
        const sunrise = cityTimeLabel(
          cityClock(currentResponse.sys.sunrise, cityOffset)
        );
        const sunset = cityTimeLabel(
          cityClock(currentResponse.sys.sunset, cityOffset)
        );

        // UV is the one reading OpenWeatherMap's tier doesn't carry; a failure
        // here should cost us that tile, not the whole dashboard.
        const uv = await axios
          .get(`/uv?lat=${latitude}&lon=${longitude}`)
          .then((r) => r.data)
          .catch(() => null);

        setMetrics(
          buildMetrics({
            current: currentResponse,
            forecastList: forecastWeatherResponse.data.list,
            uv,
            units,
          })
        );
        setSunProgress(
          sunPosition(
            currentResponse.dt,
            currentResponse.sys.sunrise,
            currentResponse.sys.sunset
          )
        );

        const description =
          currentResponse.weather[0].description.charAt(0).toUpperCase() +
          currentResponse.weather[0].description.slice(1).toLowerCase();

        setData({
          celcius: currentResponse.main.temp,
          name: currentResponse.name,
          humidity: currentResponse.main.humidity,
          speed: currentResponse.wind.speed,
          image: (
            <WeatherIcon
              weatherMain={weatherMain}
              weatherDescription={weatherDescription}
              timeOfDay={timeOfDay}
            />
          ),
          description: description,
          country: currentResponse.sys.country,
          tempMax: currentResponse.main.temp_max,
          tempMin: currentResponse.main.temp_min,
          feelsLike: currentResponse.main.feels_like,
          sunrise: sunrise,
          sunset: sunset,
          latitude: currentResponse.coord.lat,
          longitude: currentResponse.coord.lon,
          // Drives the animated background (see components/WeatherCanvas).
          condition: weatherMain,
          timeOfDay: timeOfDay,
        });

        const word =
          cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
        toast.success(word);

        const tzOffset = forecastWeatherResponse.data.city.timezone || 0;
        const todayDate = cityDateKey(cityClock(Date.now() / 1000, tzOffset));
        const tomorrowDate = shiftDateKey(todayDate, 1);

        const forecastData = forecastWeatherResponse.data.list.slice(0, 40);

        // Hourly strip: a rolling 24 hours (eight 3-hourly slots) rather than
        // "everything left in today", which late in the evening was one or two
        // entries and read as broken.
        const processedForecastData = forecastData.slice(0, 8).map((forecast) => {
          const slot = cityClock(forecast.dt, tzOffset);
          return {
            celcius: forecast.main.temp,
            image: (
              <WeatherIcon
                weatherMain={forecast.weather[0].main}
                weatherDescription={forecast.weather[0].description}
                timeOfDay={cityDayOrNight(slot)}
              />
            ),
            time: cityTimeLabel(slot),
          };
        });

        // Process forecast data for the week
        // Group by the city's own calendar day, so a slot near midnight lands
        // on the day it belongs to there rather than in UTC.
        const groupedData = forecastData.reduce((acc, forecast) => {
          const dayKey = cityDateKey(cityClock(forecast.dt, tzOffset));
          if (!acc[dayKey]) {
            acc[dayKey] = [];
          }
          acc[dayKey].push(forecast);
          return acc;
        }, {});

        const processedForecastData2 = Object.keys(groupedData).map(
          (date) => {
            // A weekly row stands for a whole day, so it always takes the
            // daytime glyph (this used to be derived from a hardcoded date).
            const timeOfDay = "day";
            const dayForecasts = groupedData[date];
            const minTemp = Math.min(
              ...dayForecasts.map((f) => f.main.temp_min)
            );
            const maxTemp = Math.max(
              ...dayForecasts.map((f) => f.main.temp_max)
            );

            let formattedDateString = "";
            if (date === todayDate) {
              formattedDateString = "Today";
            } else if (date === tomorrowDate) {
              formattedDateString = "Tomorrow";
            } else {
              formattedDateString = weekdayLabel(date);
            }

            const description =
              dayForecasts[0].weather[0].description.charAt(0).toUpperCase() +
              dayForecasts[0].weather[0].description.slice(1).toLowerCase();

            const weatherMain = dayForecasts[0].weather[0].main;
            const weatherDescription = dayForecasts[0].weather[0].description;

            return {
              day: formattedDateString,
              image: (
                <WeatherIcon
                  weatherMain={weatherMain}
                  weatherDescription={weatherDescription}
                  timeOfDay={timeOfDay}
                />
              ),
              minTemp,
              maxTemp,
              description: description,
            };
          }
        );

        setTodaysData(processedForecastData);
        setData2(processedForecastData2);
        setLoading(false);
        setError("");
      } catch (error) {
        setLoading(false);
        if (error.response && error.response.status === 404) {
          setError("City not found. Please try again.");
        } else {
          setError("Failed to fetch weather data.");
        }
        console.error("Error fetching weather data:", error);
      }
    },
    [units]
  );

  //Search box submit: fetch weather for whatever's in the city name field.
  const handleClick = useCallback(() => {
    fetchAndSetWeatherByCity(name);
  }, [name, fetchAndSetWeatherByCity]);

  //Fetch weather for an arbitrary city name (used by ?city= URL navigation,
  //e.g. clicking a favourite from the Favourites page).
  const fetchWeatherDataByCity = useCallback(
    (city) => {
      fetchAndSetWeatherByCity(city);
    },
    [fetchAndSetWeatherByCity]
  );

  //Data from the API being processed
  const fetchWeatherData = useCallback(
    async (lat, long) => {
      try {
        setLoading(true);
        const apiUrl = `/weather?lat=${lat}&lon=${long}&units=${units}`;
        const apiUrl2 = `/forecast?lat=${lat}&lon=${long}&units=${units}`;

        const [response, response2] = await Promise.all([
          axios.get(apiUrl),
          axios.get(apiUrl2),
        ]);

        console.log(response);
        console.log(response2);

        const weatherMain = response.data.weather[0].main;
        const weatherDescription = response.data.weather[0].description;
        const forecastWeather = response2.data.list.slice(0, 40);

        // Day vs night from this location's own clock, not the viewer's -
        // matters once this function is used for more than "wherever the
        // browser's geolocation says I am" (see the search dropdown, which
        // fetches by coordinates for exact, unambiguous matches).
        const tzResponse = await axios.get(`/timeZone?lat=${lat}&lon=${long}`);
        const cityNow = new Date(tzResponse.data.formatted);
        const cityHour = cityNow.getHours();
        const timeOfDay = cityHour >= 6 && cityHour < 18 ? "day" : "night";
        const timeRefined = cityNow.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        setTimes({ time: timeRefined });

        const tzOffset = response2.data.city.timezone || 0;
        const todayDate = cityDateKey(cityClock(Date.now() / 1000, tzOffset));
        const tomorrowDate = shiftDateKey(todayDate, 1);

        // Hourly strip: a rolling 24 hours (eight 3-hourly slots) rather than
        // "everything left in today", which late in the evening was one or two
        // entries and read as broken.
        const processedForecastData = forecastWeather.slice(0, 8).map((forecast) => {
          const slot = cityClock(forecast.dt, tzOffset);
          return {
            celcius: forecast.main.temp,
            image: (
              <WeatherIcon
                weatherMain={forecast.weather[0].main}
                weatherDescription={forecast.weather[0].description}
                timeOfDay={cityDayOrNight(slot)}
              />
            ),
            time: cityTimeLabel(slot),
          };
        });

        // Group by the city's own calendar day, so a slot near midnight lands
        // on the day it belongs to there rather than in UTC.
        const groupedData = forecastWeather.reduce((acc, forecast) => {
          const dayKey = cityDateKey(cityClock(forecast.dt, tzOffset));
          if (!acc[dayKey]) {
            acc[dayKey] = [];
          }
          acc[dayKey].push(forecast);
          return acc;
        }, {});

        const processedForecastData2 = Object.keys(groupedData).map(
          (date) => {
            // A weekly row stands for a whole day, so it always takes the
            // daytime glyph (this used to be derived from a hardcoded date).
            const timeOfDay = "day";
            const dayForecasts = groupedData[date];
            const minTemp = Math.min(
              ...dayForecasts.map((f) => f.main.temp_min)
            );
            const maxTemp = Math.max(
              ...dayForecasts.map((f) => f.main.temp_max)
            );

            let formattedDateString = "";
            if (date === todayDate) {
              formattedDateString = "Today";
            } else if (date === tomorrowDate) {
              formattedDateString = "Tomorrow";
            } else {
              formattedDateString = weekdayLabel(date);
            }

            const description =
              dayForecasts[0].weather[0].description.charAt(0).toUpperCase() +
              dayForecasts[0].weather[0].description.slice(1).toLowerCase();

            const weatherMain = dayForecasts[0].weather[0].main;
            const weatherDescription = dayForecasts[0].weather[0].description;

            return {
              day: formattedDateString,
              image: (
                <WeatherIcon
                  weatherMain={weatherMain}
                  weatherDescription={weatherDescription}
                  timeOfDay={timeOfDay}
                />
              ),
              minTemp,
              maxTemp,
              description: description,
            };
          }
        );

        setTodaysData(processedForecastData);
        setData2(processedForecastData2);

        // Same shift as the search path - these are unix UTC timestamps.
        const cityOffset = response.data.timezone || 0;
        const sunrise = cityTimeLabel(
          cityClock(response.data.sys.sunrise, cityOffset)
        );
        const sunset = cityTimeLabel(
          cityClock(response.data.sys.sunset, cityOffset)
        );

        const uv = await axios
          .get(`/uv?lat=${lat}&lon=${long}`)
          .then((r) => r.data)
          .catch(() => null);

        setMetrics(
          buildMetrics({
            current: response.data,
            forecastList: response2.data.list,
            uv,
            units,
          })
        );
        setSunProgress(
          sunPosition(
            response.data.dt,
            response.data.sys.sunrise,
            response.data.sys.sunset
          )
        );

        const description =
          response.data.weather[0].description.charAt(0).toUpperCase() +
          response.data.weather[0].description.slice(1).toLowerCase();

        setData({
          celcius: response.data.main.temp,
          name: response.data.name,
          humidity: response.data.main.humidity,
          speed: response.data.wind.speed,
          image: (
            <WeatherIcon
              weatherMain={weatherMain}
              weatherDescription={weatherDescription}
              timeOfDay={timeOfDay}
            />
          ),
          description: description,
          country: response.data.sys.country,
          tempMax: response.data.main.temp_max,
          tempMin: response.data.main.temp_min,
          feelsLike: response.data.main.feels_like,
          sunrise: sunrise,
          sunset: sunset,
          // Drives the animated background (see components/WeatherCanvas).
          condition: weatherMain,
          timeOfDay: timeOfDay,
        });
        setLoading(false);
        setError("");
      } catch (error) {
        setLoading(false);
        if (error.response && error.response.status === 404) {
          setError("City not found. Please try again.");
        } else {
          setError("Failed to fetch weather data.");
        }
        console.error("Error fetching weather data:", error);
      }
    },
    [units]
  );

  //Read ?city= from the URL, or fall back to geolocation (and if that's
  //denied or unavailable, fall back further to a default city).
  useEffect(() => {
    const params = new URLSearchParams(reactRouterLocation.search);
    const city = params.get("city");

    if (city) {
      fetchWeatherDataByCity(city);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setLocation(FALLBACK_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geoError) => {
        setError(geoError.message);
        setLocation(FALLBACK_LOCATION);
      }
    );
  }, [reactRouterLocation.search, fetchWeatherDataByCity]);

  //Fetch the weather whenever the location or the chosen units change.
  useEffect(() => {
    if (location.latitude && location.longitude) {
      fetchWeatherData(location.latitude, location.longitude);
    }
  }, [location, units, fetchWeatherData]);

  useEffect(() => {
    // Signing out has to clear the list, not just stop fetching it. Leaving it
    // behind kept the bookmark showing "saved" for a signed-out visitor, and
    // left one account's locations readable by whoever used the browser next.
    if (!currentUser) {
      setFavourites([]);
      return;
    }

    axios
      .get(`/favourites?userId=${currentUser.uid}`)
      .then((result) => {
        const sortedFavourites = result.data.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
        setFavourites(sortedFavourites);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [currentUser]);

  useEffect(() => {
    if (clickedFavourites) {
      handleClick();
      setClickedFavourites(false);
    }
  }, [clickedFavourites, handleClick]);

  //changing units to metric
  const metric = () => {
    setUnits("metric");
    setUnitName({ temp: "C", speed: "Km/h" });
  };

  //changing units to imperial
  const imperial = () => {
    setUnits("imperial");
    setUnitName({ temp: "F", speed: "Mph" });
  };

  //Adding a favourite city to the db
  const addToFavourites = (name) => {
    axios
      .post(`/favourites`, {
        userId: currentUser.uid,
        name,
      })
      .then((result) => {
        const newFavourite = result.data;
        setFavourites((prevFavourites) => [...prevFavourites, newFavourite]);
        console.log(isFavourite);
        setIsFavourite(true);

        toast.success(`Added '${name}' to favourites`);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  //Removing a favourite city from the db
  const removeFromFavourites = async (id) => {
    try {
      await axios.delete(`/favourites?id=${id}`);
      setFavourites((prevFavourites) =>
        prevFavourites.filter((fav) => fav._id !== id)
      );
      setIsFavourite(false);
      toast.error(`Removed '${name}' from favourites`);
    } catch (error) {
      console.log(error);
    }
  };

  //Toggling the icon for favourites
  const toggleFavourite = (name) => {
    if (!currentUser) {
      toast.error("Log in to save favourite cities");
      return;
    }
    const existingFavourite = favourites.find((fav) => fav.name === name);
    if (existingFavourite) {
      removeFromFavourites(existingFavourite._id);
    } else {
      addToFavourites(name);
    }
  };

  // Temperatures roll to their new value on each fetch rather than snapping.
  const animatedTemp = useCountUp(data.celcius);
  const animatedFeelsLike = useCountUp(data.feelsLike);

  const pillClasses = (active) => `pill ${active ? "pill-active" : ""}`;

  // Shared scale for the 7-day range bars, so every row is measured against
  // the same week - that's what makes the bars comparable at a glance.
  const weekLow = data2.length
    ? Math.min(...data2.map((day) => day.minTemp))
    : 0;
  const weekHigh = data2.length
    ? Math.max(...data2.map((day) => day.maxTemp))
    : 0;
  const weekSpan = weekHigh - weekLow || 1;

  const isSaved = favourites.some((fav) => fav.name === data.name);

  return (
    <div data-cy="main-div" className="relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="spinner-ring" />
        </div>
      )}

      {/* Live condition-driven background: rain, snow, stars, lightning. */}
      <WeatherCanvas
        condition={data.condition}
        timeOfDay={data.timeOfDay}
        theme={theme}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 pb-24">
        {/*
          The command row is the app's real navigation - searching and
          switching saved locations is all the moving around there is to do,
          so it sits with the content rather than in the chrome. Explicit
          z-index because the hero below animates a transform, which makes it
          its own stacking context that the dropdown's z-index can't escape.
        */}
        <div className="animate-fade relative z-20 flex items-center gap-2">
          <CitySearchBox
            value={name}
            onChange={setName}
            onSubmit={handleClick}
            onSelect={(match, label) => {
              // Fetch by the match's own coordinates rather than its name:
              // OpenWeatherMap's name lookup ignores the state qualifier for
              // US cities (q=Berlin,Illinois,US quietly resolves to Berlin,
              // Germany), so a name round-trip can silently pick the wrong
              // place even after the user picked the right one.
              setName(label);
              fetchWeatherData(match.lat, match.lon);
              toast.success(label);
            }}
          />
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={metric}
              className={pillClasses(units === "metric")}
            >
              °C
            </button>
            <button
              onClick={imperial}
              className={pillClasses(units === "imperial")}
            >
              °F
            </button>
          </div>
        </div>

        {/* Saved locations, inline - this is what the old Favourites page was. */}
        {currentUser && favourites.length > 0 && (
          <div className="animate-fade forecast-container mt-2 flex gap-0.5 overflow-x-auto">
            {favourites.map((favourite) => (
              <button
                key={favourite._id}
                onClick={() => {
                  setName(favourite.name);
                  setClickedFavourites(true);
                }}
                className={`${pillClasses(
                  favourite.name === data.name
                )} shrink-0 whitespace-nowrap`}
              >
                {favourite.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-20 text-center text-small text-ink-400">{error}</p>
        )}

        {!error && (
          <>
            {/*
              The hero sits directly on the stage rather than in a card. The
              temperature is the largest thing in the app on purpose - it's
              the one number anyone actually opened this to read.
            */}
            <header className="animate-rise mt-14 text-center">
              <div className="flex items-center justify-center gap-2.5">
                <h1 className="text-tiny uppercase tracking-[0.2em] text-ink-300">
                  {data.name}
                  {data.country ? `, ${data.country}` : ""}
                </h1>
                <button
                  onClick={() => toggleFavourite(data.name)}
                  aria-label={isSaved ? "Remove from saved" : "Save location"}
                  className="text-tiny text-ink-500 transition-colors hover:text-ink-100"
                >
                  <i
                    className={`${isSaved ? "fa-solid text-ink-100" : "fa-regular"} fa-bookmark`}
                  ></i>
                </button>
              </div>

              <div className="current-forecast float-gentle mt-10 flex justify-center">
                {data.image}
              </div>

              <p className="tnum mt-8 text-[6.5rem] font-extralight leading-[0.85] tracking-tighter text-ink-100">
                {Math.round(animatedTemp)}°
              </p>

              <p className="mt-6 text-body text-ink-200">{data.description}</p>

              <p className="tnum mt-2 text-small text-ink-400">
                Feels {Math.round(animatedFeelsLike)}° &nbsp;·&nbsp; H{" "}
                {Math.round(data.tempMax)}° &nbsp;·&nbsp; L{" "}
                {Math.round(data.tempMin)}°
                {times && times.time ? (
                  <>
                    {" "}
                    &nbsp;·&nbsp; {times.time} local
                  </>
                ) : null}
              </p>
            </header>

            {/* Hourly */}
            <section
              className="animate-rise mt-16"
              style={{ animationDelay: "0.08s" }}
            >
              <h2 className="mb-5 text-micro uppercase tracking-[0.18em] text-ink-400">
                Next 24 hours
              </h2>
              <div className="forecast-container flex gap-7 overflow-x-auto pb-1">
                {todaysData.map((forecast, index) => (
                  <div
                    key={index}
                    className="flex shrink-0 flex-col items-center gap-2.5"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <span className="tnum text-tiny text-ink-400">
                      {forecast.time}
                    </span>
                    <span className="day-forecast flex justify-center">
                      {forecast.image}
                    </span>
                    <span className="tnum text-small text-ink-100">
                      {Math.round(forecast.celcius)}°
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/*
              Seven-day as rows with range bars rather than a card per day.
              A single averaged number hid the day's actual spread; the bar
              shows where each day sits against the whole week.
            */}
            <section
              className="animate-rise mt-14"
              style={{ animationDelay: "0.16s" }}
            >
              <h2 className="mb-5 text-micro uppercase tracking-[0.18em] text-ink-400">
                Next 7 days
              </h2>
              <div className="panel px-5">
                {data2.map((forecast, index) => {
                  const offset =
                    ((forecast.minTemp - weekLow) / weekSpan) * 100;
                  const width =
                    ((forecast.maxTemp - forecast.minTemp) / weekSpan) * 100;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 border-t border-[var(--hairline)] py-3.5 first:border-t-0 sm:gap-4"
                    >
                      <span className="w-[4.5rem] shrink-0 truncate text-small text-ink-300 sm:w-24">
                        {forecast.day}
                      </span>
                      <span className="week-forecast flex w-7 shrink-0 justify-center">
                        {forecast.image}
                      </span>
                      <span className="tnum w-9 shrink-0 text-right text-small text-ink-400">
                        {Math.round(forecast.minTemp)}°
                      </span>
                      <div className="relative h-[5px] flex-1 rounded-[9999px] bg-[var(--track)]">
                        <div
                          className="absolute h-[5px] rounded-[9999px]"
                          style={{
                            left: `${offset}%`,
                            width: `${Math.max(width, 6)}%`,
                            backgroundImage: `linear-gradient(90deg, ${tempColor(
                              forecast.minTemp,
                              units
                            )}, ${tempColor(forecast.maxTemp, units)})`,
                          }}
                        />
                      </div>
                      <span className="tnum w-9 shrink-0 text-small text-ink-100">
                        {Math.round(forecast.maxTemp)}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Conditions. Numbers carry these - no icons competing with them. */}
            <section
              className="animate-rise mt-14"
              style={{ animationDelay: "0.24s" }}
            >
              <h2 className="mb-5 text-micro uppercase tracking-[0.18em] text-ink-400">
                Conditions
              </h2>
              <ConditionsGrid
                metrics={metrics}
                data={data}
                unitName={unitName}
                sunProgress={sunProgress}
              />
            </section>

          </>
        )}
      </div>
    </div>
  );
}

export default Home;
