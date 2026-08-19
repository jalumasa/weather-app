import React, { useEffect, useCallback, useRef } from "react";
import { useState } from "react";
import axios from "../lib/api.js";
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
import {
  cityClock,
  cityTimeLabel,
  cityDayOrNight,
  cityDateKey,
  weekdayLabel,
  shiftDateKey,
  sunPosition,
  buildMetrics,
  tempColor,
} from "../lib/weather.js";

/*
  How old a reading has to be before returning to the tab refetches it.
  OpenWeatherMap updates roughly every 10 minutes, so anything under a few
  minutes would spend requests without changing the number on screen.
*/
const STALE_AFTER_MS = 5 * 60 * 1000;

// "just now" / "4 min ago" / "2 hr ago" - deliberately coarse, because the
// exact age of a reading isn't worth a precise number.
const describeAge = (timestamp) => {
  if (!timestamp) return null;
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "updated just now";
  if (minutes < 60) return `updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `updated ${hours} hr ago`;
};

// Used when geolocation is denied or unavailable, so the app still has
// something to show instead of getting stuck on "Failed to fetch weather data".
const FALLBACK_LOCATION = { latitude: 1.3107, longitude: 36.825 };


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
  // What's currently on screen, so a refresh re-fetches the same place, and
  // when it was last fetched. Held in refs as well as state so the focus
  // listener can read them without re-subscribing on every update.
  const lastQueryRef = useRef(null);
  const lastUpdatedRef = useRef(0);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [, setClockTick] = useState(0);
  const reactRouterLocation = useReactRouterLocation();

  /*
    One loader for every way a location can arrive.

    It takes either { city } (typed search, ?city= links, legacy saved rows) or
    { lat, lon } (geolocation, a picked search result, a saved location) and
    differs only in which two endpoints it calls - everything after the fetch
    is identical.

    This used to be two near-identical functions. The same bug had to be found
    and fixed twice in a row three separate times - day/night from the wrong
    clock, wind in m/s labelled km/h, sunrise in the viewer's timezone - and
    each second occurrence was only caught by going looking for it. One body
    means there is no second place left to forget.
  */
  const loadWeather = useCallback(
    async (query, { silent = false } = {}) => {
      const byName = typeof query.city === "string";
      if (byName && !query.city) return;

      const suffix = byName
        ? `name=${encodeURIComponent(query.city)}`
        : `lat=${query.lat}&lon=${query.lon}`;
      const currentUrl = `${byName ? "/cityweather" : "/weather"}?${suffix}&units=${units}`;
      const forecastUrl = `${byName ? "/cityforecast" : "/forecast"}?${suffix}&units=${units}`;

      // A refresh triggered by returning to the tab shouldn't blank the page
      // out behind a spinner - it should just quietly become current.
      if (!silent) setLoading(true);
      try {
        const [currentRes, forecastRes] = await Promise.all([
          axios.get(currentUrl),
          axios.get(forecastUrl),
        ]);

        const current = currentRes.data;
        const forecast = forecastRes.data;
        const weatherMain = current.weather[0].main;
        const weatherDescription = current.weather[0].description;
        const latitude = current.coord.lat;
        const longitude = current.coord.lon;

        /*
          Everything below is on the *city's* clock, not the viewer's -
          otherwise looking up Phoenix at 1pm from Nairobi renders a moon and
          a starfield over a 37C afternoon, and has the sun rising at 3:48pm.

          The offset ships with this response. It used to come from a separate
          timezone API: an extra round trip, an extra key and an extra thing
          that could fail, for a number we were already holding.
        */
        const cityOffset = current.timezone || 0;
        const cityNow = cityClock(current.dt, cityOffset);
        const timeOfDay = cityDayOrNight(cityNow);
        setTimes({ time: cityTimeLabel(cityNow) });

        const sunrise = cityTimeLabel(cityClock(current.sys.sunrise, cityOffset));
        const sunset = cityTimeLabel(cityClock(current.sys.sunset, cityOffset));

        // UV is the one reading OpenWeatherMap's tier doesn't carry; a failure
        // here should cost us that tile, not the whole dashboard.
        const uv = await axios
          .get(`/uv?lat=${latitude}&lon=${longitude}`)
          .then((r) => r.data)
          .catch(() => null);

        setMetrics(
          buildMetrics({ current, forecastList: forecast.list, uv, units })
        );
        setSunProgress(
          sunPosition(current.dt, current.sys.sunrise, current.sys.sunset)
        );

        const description =
          current.weather[0].description.charAt(0).toUpperCase() +
          current.weather[0].description.slice(1).toLowerCase();

        setData({
          celcius: current.main.temp,
          name: current.name,
          humidity: current.main.humidity,
          speed: current.wind.speed,
          image: (
            <WeatherIcon
              weatherMain={weatherMain}
              weatherDescription={weatherDescription}
              timeOfDay={timeOfDay}
            />
          ),
          description,
          country: current.sys.country,
          tempMax: current.main.temp_max,
          tempMin: current.main.temp_min,
          feelsLike: current.main.feels_like,
          sunrise,
          sunset,
          // Saving a location persists these, so it can be re-opened by
          // coordinate rather than by an ambiguous name.
          latitude,
          longitude,
          // Drives the animated background (see components/WeatherCanvas).
          condition: weatherMain,
          timeOfDay,
        });

        // Only a deliberate search deserves a confirmation; geolocation,
        // saved locations and background refreshes load without announcing
        // themselves.
        if (byName && !silent) {
          toast.success(
            query.city.charAt(0).toUpperCase() + query.city.slice(1).toLowerCase()
          );
        }

        const tzOffset = forecast.city.timezone || 0;
        const todayDate = cityDateKey(cityClock(Date.now() / 1000, tzOffset));
        const tomorrowDate = shiftDateKey(todayDate, 1);
        const slots = forecast.list.slice(0, 40);

        // Hourly strip: a rolling 24 hours (eight 3-hourly slots) rather than
        // "everything left in today", which late in the evening was one or two
        // entries and read as broken.
        const hourly = slots.slice(0, 8).map((entry) => {
          const slot = cityClock(entry.dt, tzOffset);
          return {
            celcius: entry.main.temp,
            image: (
              <WeatherIcon
                weatherMain={entry.weather[0].main}
                weatherDescription={entry.weather[0].description}
                timeOfDay={cityDayOrNight(slot)}
              />
            ),
            time: cityTimeLabel(slot),
          };
        });

        // Group by the city's own calendar day, so a slot near midnight lands
        // on the day it belongs to there rather than in UTC.
        const byDay = slots.reduce((acc, entry) => {
          const dayKey = cityDateKey(cityClock(entry.dt, tzOffset));
          if (!acc[dayKey]) acc[dayKey] = [];
          acc[dayKey].push(entry);
          return acc;
        }, {});

        const weekly = Object.keys(byDay).map((date) => {
          const dayForecasts = byDay[date];
          const minTemp = Math.min(...dayForecasts.map((f) => f.main.temp_min));
          const maxTemp = Math.max(...dayForecasts.map((f) => f.main.temp_max));

          let label;
          if (date === todayDate) label = "Today";
          else if (date === tomorrowDate) label = "Tomorrow";
          else label = weekdayLabel(date);

          const dayDescription =
            dayForecasts[0].weather[0].description.charAt(0).toUpperCase() +
            dayForecasts[0].weather[0].description.slice(1).toLowerCase();

          return {
            day: label,
            image: (
              <WeatherIcon
                weatherMain={dayForecasts[0].weather[0].main}
                weatherDescription={dayForecasts[0].weather[0].description}
                // A weekly row stands for a whole day, so it always takes the
                // daytime glyph.
                timeOfDay="day"
              />
            ),
            minTemp,
            maxTemp,
            description: dayDescription,
          };
        });

        setTodaysData(hourly);
        setData2(weekly);
        // Remember what's on screen so a refresh can re-fetch the same place,
        // and when, so it only happens once the reading is actually stale.
        lastQueryRef.current = query;
        lastUpdatedRef.current = Date.now();
        setLastUpdated(lastUpdatedRef.current);
        setLoading(false);
        setError("");
      } catch (err) {
        if (silent) {
          // A failed background refresh leaves the last good reading up
          // rather than replacing it with an error.
          console.error("Background refresh failed:", err);
          return;
        }
        setLoading(false);
        if (err.response && err.response.status === 404) {
          setError("City not found. Please try again.");
        } else {
          setError("Failed to fetch weather data.");
        }
        console.error("Error fetching weather data:", err);
      }
    },
    [units]
  );

  //Search box submit: fetch weather for whatever's in the city name field.
  const handleClick = useCallback(() => {
    loadWeather({ city: name });
  }, [name, loadWeather]);

  //?city= URL navigation, and saved rows with no coordinates on them.
  const fetchWeatherDataByCity = useCallback(
    (city) => loadWeather({ city }),
    [loadWeather]
  );

  const fetchWeatherData = useCallback(
    (lat, lon) => loadWeather({ lat, lon }),
    [loadWeather]
  );

  /*
    Weather goes stale while a tab sits open. Coming back to it should show
    what it's like now, not what it was like whenever the page was first
    loaded - previously a tab left open overnight showed yesterday's
    conditions under a clock that looked live.

    Only refetches once the reading is actually old, so flicking between tabs
    doesn't spend a request each time.
  */
  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible") return;
      if (!lastQueryRef.current) return;
      if (Date.now() - lastUpdatedRef.current < STALE_AFTER_MS) return;
      loadWeather(lastQueryRef.current, { silent: true });
    };

    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [loadWeather]);

  // Keeps the "updated N ago" label honest without re-rendering a hidden tab.
  useEffect(() => {
    if (!lastUpdated) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setClockTick((n) => n + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [lastUpdated]);

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
  /*
    Re-open a saved location by coordinate. Older rows were saved before
    coordinates were persisted, so those still go through the name lookup -
    imprecise, but it's all we have for them, and it's what they've always
    done.
  */
  const openFavourite = (favourite) => {
    setName(favourite.name);
    if (typeof favourite.lat === "number" && typeof favourite.lon === "number") {
      fetchWeatherData(favourite.lat, favourite.lon);
      return;
    }
    setClickedFavourites(true);
  };

  const addToFavourites = (name) => {
    axios
      .post(`/favourites`, {
        userId: currentUser.uid,
        name,
        // Persist where this place actually is. Without it, re-opening the
        // chip re-runs a name lookup, which is ambiguous enough to land in a
        // different state (Ashland, Illinois came back as Ashland, Ohio).
        lat: data.latitude,
        lon: data.longitude,
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
                onClick={() => openFavourite(favourite)}
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

              {/* Quiet, and only once the reading has some age on it - saying
                  "updated just now" on every load would be noise. */}
              {lastUpdated && Date.now() - lastUpdated >= 60000 ? (
                <p className="mt-2 text-micro uppercase tracking-[0.14em] text-ink-500">
                  {describeAge(lastUpdated)}
                </p>
              ) : null}
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
