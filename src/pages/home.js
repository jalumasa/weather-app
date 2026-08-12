import React, { useEffect, useCallback } from "react";
import { useState } from "react";
import axios from "axios";
import { useLocation as useReactRouterLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext.js";
import WeatherIcon from "../weatherIcon.js";
import {
  LineChart,
  Line,
  YAxis,
  XAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";
import "../assets/css/mainPage.css";
import "../assets/css/graph.css";
import {
  HumidityIcon,
  WindIcon,
  SunriseIcon,
  SunsetIcon,
} from "../icons/StatIcons.js";
import WeatherCanvas from "../components/WeatherCanvas.js";
import useCountUp from "../hooks/useCountUp.js";
import CitySearchBox from "../components/CitySearchBox.js";

// Used when geolocation is denied or unavailable, so the app still has
// something to show instead of getting stuck on "Failed to fetch weather data".
const FALLBACK_LOCATION = { latitude: 1.3107, longitude: 36.825 };

function Home({ weatherMain }) {
  const [loading, setLoading] = useState(false);
  let [currentDateTime, setCurrentDateTime] = useState(new Date());
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
  const [weeklyData, setWeeklyData] = useState([]);
  const [dataKey, setDataKey] = useState("Temperature");
  const [units, setUnits] = useState("metric");
  const [unitName, setUnitName] = useState({ temp: "C", speed: "Km/h" });
  const { currentUser } = useAuth();
  const [clickedFavourites, setClickedFavourites] = useState(false);
  const [times, setTimes] = useState([]);
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
        const weatherDescription = currentResponse.weather[0].main.description;

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

        const sunrise = new Date(
          currentResponse.sys.sunrise * 1000
        ).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        const sunset = new Date(
          currentResponse.sys.sunset * 1000
        ).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

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

        const today = new Date();
        const todayDate = new Date().toISOString().split("T")[0];

        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split("T")[0];

        const forecastData = forecastWeatherResponse.data.list.slice(0, 40);

        // Process forecast data for the day
        const processedForecastData = forecastData
          .map((forecast) => {
            const getDayOrNight = (dateString) => {
              const time = new Date(dateString);
              const hours = time.getHours();
              return hours >= 6 && hours < 18 ? "day" : "night";
            };
            const dateString = forecast.dt_txt;
            const timeOfDay = getDayOrNight(dateString);
            const forecastDate = new Date(dateString)
              .toISOString()
              .split("T")[0];
            const convertToDate = new Date(dateString);
            const options = {
              year: "numeric",
              month: "short",
              day: "numeric",
              weekday: "short",
            };

            const optionsTime = {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            };
            let formattedDateString = new Intl.DateTimeFormat(
              "en-GB",
              options
            ).format(convertToDate);
            const formattedTimeString = new Intl.DateTimeFormat(
              "en-GB",
              optionsTime
            ).format(convertToDate);

            const description =
              forecast.weather[0].description.charAt(0).toUpperCase() +
              forecast.weather[0].description.slice(1).toLowerCase();

            const weatherMain = forecast.weather[0].main;
            const weatherDescription = forecast.weather[0].main.description;

            if (forecastDate === todayDate) {
              return {
                celcius: forecast.main.temp,
                name: forecastWeatherResponse.data.city.name,
                humidity: forecast.main.humidity,
                speed: forecast.wind.speed,
                image: (
                  <WeatherIcon
                    weatherMain={weatherMain}
                    weatherDescription={weatherDescription}
                    timeOfDay={timeOfDay}
                  />
                ),
                description: description,
                country: forecastWeatherResponse.data.city.country,
                date: formattedDateString,
                time: formattedTimeString,
              };
            } else {
              return null;
            }
          })
          .filter(Boolean);

        // Process forecast data for the week
        const groupedData = forecastData.reduce((acc, forecast) => {
          if (forecast.dt_txt) {
            const dateString = forecast.dt_txt.split(" ")[0];
            if (!acc[dateString]) {
              acc[dateString] = [];
            }
            acc[dateString].push(forecast);
          }
          return acc;
        }, {});

        const processedForecastData2 = Object.keys(groupedData).map(
          (date) => {
            const dateString = "2024-06-04 12:00:00";
            const getDayOrNight = (dateString) => {
              const time = new Date(dateString);
              const hours = time.getHours();
              return hours >= 6 && hours < 18 ? "day" : "night";
            };
            const timeOfDay = getDayOrNight(dateString);
            const dayForecasts = groupedData[date];
            const total = dayForecasts.reduce(
              (acc, forecast) => {
                acc.temp += forecast.main.temp;
                acc.wind += forecast.wind.speed;
                acc.humidity += forecast.main.humidity;
                return acc;
              },
              { temp: 0, wind: 0, humidity: 0 }
            );

            const averageTemp = total.temp / dayForecasts.length;
            const averageHumidity = total.humidity / dayForecasts.length;
            const averageWind = total.wind / dayForecasts.length;

            let formattedDateString = "";
            if (date === todayDate) {
              formattedDateString = "Today";
            } else if (date === tomorrowDate) {
              formattedDateString = "Tomorrow";
            } else {
              formattedDateString = new Date(date).toLocaleDateString(
                "en-US",
                {
                  month: "2-digit",
                  day: "2-digit",
                }
              );
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
              averageTemp: averageTemp.toFixed(1),
              averageWind: averageWind.toFixed(1),
              averageHumidity: averageHumidity.toFixed(1),
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
        const weatherDescription = response.data.weather[0].main.description;
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

        const today = new Date();
        const todayDate = new Date().toISOString().split("T")[0];

        const tomorrowDate = (() => {
          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          return tomorrow.toISOString().split("T")[0];
        })();

        //forecasted data for the day
        const processedForecastData = forecastWeather
          .map((forecast) => {
            const getDayOrNight = (dateString) => {
              const time = new Date(dateString);
              const hours = time.getHours();
              return hours >= 6 && hours < 18 ? "day" : "night";
            };

            const dateString = forecast.dt_txt;
            const forecastDate = new Date(dateString)
              .toISOString()
              .split("T")[0];
            const timeOfDay = getDayOrNight(dateString);

            let formattedDateString = new Date(dateString).toLocaleDateString(
              "en-GB",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              }
            );

            const formattedTimeString = new Date(
              dateString
            ).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            const description =
              forecast.weather[0].description.charAt(0).toUpperCase() +
              forecast.weather[0].description.slice(1).toLowerCase();

            const weatherMain = forecast.weather[0].main;
            const weatherDescription = forecast.weather[0].main.description;

            if (forecastDate === todayDate) {
              return {
                celcius: forecast.main.temp,
                name: response2.data.city.name,
                humidity: forecast.main.humidity,
                speed: forecast.wind.speed,
                image: (
                  <WeatherIcon
                    weatherMain={weatherMain}
                    weatherDescription={weatherDescription}
                    timeOfDay={timeOfDay}
                  />
                ),
                description: description,
                country: response2.data.city.country,
                date: formattedDateString,
                time: formattedTimeString,
              };
            } else {
              return null;
            }
          })
          .filter(Boolean);

        const groupedData = forecastWeather.reduce((acc, forecast) => {
          if (forecast.dt_txt) {
            // Ensure dt_txt exists
            const dateString = forecast.dt_txt.split(" ")[0];
            if (!acc[dateString]) {
              acc[dateString] = [];
            }
            acc[dateString].push(forecast);
          }
          return acc;
        }, {});

        const processedForecastData2 = Object.keys(groupedData).map(
          (date) => {
            const dateString = "2024-06-04 12:00:00";
            const getDayOrNight = (dateString) => {
              const time = new Date(dateString);
              const hours = time.getHours();
              return hours >= 6 && hours < 18 ? "day" : "night";
            };
            const timeOfDay = getDayOrNight(dateString);
            const dayForecasts = groupedData[date];
            const total = dayForecasts.reduce(
              (acc, forecast) => {
                acc.temp += forecast.main.temp;
                acc.wind += forecast.wind.speed;
                acc.humidity += forecast.main.humidity;
                return acc;
              },
              { temp: 0, wind: 0, humidity: 0 }
            );

            const averageTemp = total.temp / dayForecasts.length;
            const averageHumidity = total.humidity / dayForecasts.length;
            const averageWind = total.wind / dayForecasts.length;

            let formattedDateString = "";
            if (date === todayDate) {
              formattedDateString = "Today";
            } else if (date === tomorrowDate) {
              formattedDateString = "Tomorrow";
            } else {
              formattedDateString = new Date(date).toLocaleDateString(
                "en-US",
                {
                  month: "2-digit",
                  day: "2-digit",
                }
              );
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
              averageTemp: averageTemp.toFixed(1),
              averageWind: averageWind.toFixed(1),
              averageHumidity: averageHumidity.toFixed(1),
              description: description,
            };
          }
        );

        setTodaysData(processedForecastData);
        setData2(processedForecastData2);

        const sunrise = new Date(
          response.data.sys.sunrise * 1000
        ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const sunset = new Date(
          response.data.sys.sunset * 1000
        ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

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

  //the Line Graph for visualization
  const weeklyGraph = useCallback(
    (action) => {
      let key;
      if (action === "temp") {
        key = "Temperature";
      } else if (action === "humidity") {
        key = "Humidity";
      } else if (action === "wind") {
        key = "Wind";
      }

      if (!Array.isArray(data2) || data2.length === 0) {
        console.error("Data is not an array or is empty");
        return;
      }

      const weekWeather = data2.map((dayData) => ({
        day: dayData.day,
        temp: dayData.averageTemp,
        wind: dayData.averageWind,
        humidity: dayData.averageHumidity,
      }));

      const updatedWeeklyWeatherData = weekWeather.map((dayData) => ({
        name: dayData.day,
        Temperature: dayData.temp,
        Humidity: dayData.humidity,
        Wind: dayData.wind,
      }));

      setWeeklyData(updatedWeeklyWeatherData);
      setDataKey(key);
    },
    [data2]
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
    if (currentUser) {
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
    }
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

  //Making sure that the time and date is being refreshed
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  useEffect(() => {
    if (data2.length > 0) {
      weeklyGraph("temp");
    }
  }, [data2, weeklyGraph]);

  //function to display the condition names
  const dataKeyName = (dataKey) => {
    let conditionName = "";
    if (dataKey === "Temperature") {
      conditionName = `Temperature (°${unitName.temp})`;
    } else if (dataKey === "Humidity") {
      conditionName = "Humidity (%)";
    } else {
      conditionName = `Wind (${unitName.speed})`;
    }
    return conditionName;
  };

  const getColor = (key) => {
    switch (key) {
      case "Temperature":
        return "#ec4899"; // pop-500
      case "Humidity":
        return "#0ea5e9"; // sky-500
      case "Wind":
        return "#a5a6f6"; // dusk-300
      default:
        return "#ffffff";
    }
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

  const pillButtonClasses = (active) =>
    `rounded-[9999px] px-4 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-white/20 text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div data-cy="main-div" className="relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
          <div className="spinner-ring" />
        </div>
      )}

      {/* Live condition-driven background: real rain, snow, stars, lightning. */}
      <WeatherCanvas condition={data.condition} timeOfDay={data.timeOfDay} />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-6 text-white">
        {/* Status row */}
        <div className="animate-fade mb-4 flex items-center justify-between text-sm text-white/70">
          {currentUser ? (
            <p>Welcome, {currentUser.email}</p>
          ) : (
            <p>
              <Link to="/login" className="text-sky-300 hover:text-sky-200">
                Log in
              </Link>{" "}
              to save favourite cities
            </p>
          )}
          <p>{formattedTime}</p>
        </div>

        {/* Search + units + favourite chips */}
        {/* Explicit z-index (not just the dropdown's) because the hero card
            below also animates a transform, which makes it its own stacking
            context - without this, its z-index:auto still paints over the
            dropdown's z-20 since that z-20 can't escape this container. */}
        <div className="glass-card animate-rise relative z-20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CitySearchBox
              value={name}
              onChange={setName}
              onSubmit={handleClick}
              onSelect={(match, label) => {
                // Fetch by the match's own coordinates rather than its name:
                // OpenWeatherMap's name lookup ignores the state qualifier
                // for US cities (q=Berlin,Illinois,US quietly resolves to
                // Berlin, Germany), so a name round-trip can silently pick
                // the wrong place even after the user picked the right one.
                setName(label);
                fetchWeatherData(match.lat, match.lon);
                toast.success(label);
              }}
            />
            <div className="flex justify-center gap-2 sm:justify-start">
              <button onClick={metric} className={pillButtonClasses(units === "metric")}>
                Metric
              </button>
              <button onClick={imperial} className={pillButtonClasses(units === "imperial")}>
                Imperial
              </button>
            </div>
          </div>

          {currentUser && favourites.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {favourites.map((favourite, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setName(favourite.name);
                    setClickedFavourites(true);
                  }}
                  className="rounded-[9999px] bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:bg-white/20 hover:text-white"
                >
                  {favourite.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-pop-500/40 bg-pop-500/20 px-3 py-2 text-center text-sm text-pop-400">
            {error}
          </p>
        )}

        {!error && (
          <>
            {/* Hero */}
            <div
              className="glass-card sheen animate-rise mt-6 p-8 text-center"
              style={{ animationDelay: "0.08s" }}
            >
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl font-bold">
                  {data.name}, {data.country}
                </h1>
                <button
                  className="favourites transition hover:scale-110"
                  onClick={() => toggleFavourite(data.name)}
                >
                  {favourites.some((fav) => fav.name === data.name) ? (
                    <i className="fa-solid fa-heart text-2xl text-pop-500"></i>
                  ) : (
                    <i className="fa-regular fa-heart text-2xl text-white"></i>
                  )}
                </button>
              </div>
              {times ? <p className="text-sm text-white/50">{times.time}</p> : null}

              <p className="current-forecast float-gentle mx-auto my-2 flex justify-center">
                {data.image}
              </p>
              <p className="text-7xl font-bold tabular-nums">
                {Math.round(animatedTemp)}°{unitName.temp}
              </p>
              <p className="mt-2 text-lg text-white/80">{data.description}</p>
              <p className="mt-1 text-white/60">
                Feels like {Math.round(animatedFeelsLike)}°{unitName.temp}
              </p>
              <p className="mt-1 text-sm text-white/50">
                High: {Math.round(data.tempMax)}°{unitName.temp} / Low:{" "}
                {Math.round(data.tempMin)}°{unitName.temp}
              </p>
            </div>

            {/* Hourly forecast */}
            <div className="animate-rise mt-6" style={{ animationDelay: "0.16s" }}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
                Today
              </h2>
              <div className="forecast-container flex gap-3 overflow-x-auto pb-2">
                {todaysData.map((forecast, index) => (
                  <div
                    key={index}
                    className="glass-card flex shrink-0 flex-col items-center px-4 py-3 text-center"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <p className="text-sm text-white/60">{forecast.time}</p>
                    <p className="day-forecast my-1 flex justify-center">
                      {forecast.image}
                    </p>
                    <p className="font-semibold">
                      {Math.round(forecast.celcius)}°{unitName.temp}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly forecast */}
            <div className="animate-rise mt-6" style={{ animationDelay: "0.24s" }}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
                7-Day Forecast
              </h2>
              <div className="forecast-container2 flex gap-3 overflow-x-auto pb-2">
                {data2.map((forecast, index) => (
                  <div
                    key={index}
                    className="glass-card flex w-28 shrink-0 flex-col items-center px-4 py-3 text-center"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <p className="text-sm text-white/60">{forecast.day}</p>
                    <p className="week-forecast my-1 flex justify-center">
                      {forecast.image}
                    </p>
                    <p className="font-semibold">
                      {Math.round(forecast.averageTemp)}°{unitName.temp}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {forecast.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail tiles */}
            <div
              className="animate-rise mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
              style={{ animationDelay: "0.32s" }}
            >
              <div className="glass-card p-5 text-center transition hover:-translate-y-0.5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                  Humidity
                </h3>
                <HumidityIcon className="mx-auto my-3 h-14 w-14" />
                <p className="text-2xl font-bold">{data.humidity}%</p>
              </div>

              <div className="glass-card p-5 text-center transition hover:-translate-y-0.5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                  Wind
                </h3>
                <WindIcon className="mx-auto my-3 h-14 w-14" />
                <p className="text-2xl font-bold">
                  {Math.round(data.speed)} {unitName.speed}
                </p>
              </div>

              <div className="glass-card p-5 text-center transition hover:-translate-y-0.5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                  Sunrise
                </h3>
                <SunriseIcon className="mx-auto my-3 h-14 w-14" />
                <p className="text-lg font-bold">{data.sunrise}</p>
              </div>

              <div className="glass-card p-5 text-center transition hover:-translate-y-0.5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                  Sunset
                </h3>
                <SunsetIcon className="mx-auto my-3 h-14 w-14" />
                <p className="text-lg font-bold">{data.sunset}</p>
              </div>
            </div>

            {/* Trend graph */}
            <div
              className="glass-card animate-rise mt-6 p-6"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{dataKeyName(dataKey)}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => weeklyGraph("temp")}
                    className={pillButtonClasses(dataKey === "Temperature")}
                  >
                    Temp
                  </button>
                  <button
                    onClick={() => weeklyGraph("humidity")}
                    className={pillButtonClasses(dataKey === "Humidity")}
                  >
                    Humidity
                  </button>
                  <button
                    onClick={() => weeklyGraph("wind")}
                    className={pillButtonClasses(dataKey === "Wind")}
                  >
                    Wind
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-center overflow-x-auto">
                <LineChart
                  width={600}
                  height={300}
                  data={weeklyData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" />
                  <YAxis
                    label={{
                      value: dataKeyName(dataKey),
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 27, 75, 0.9)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      color: "white",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke={getColor(dataKey)}
                    strokeWidth={2.5}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
