import React, { useEffect } from "react";
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
import "../assets/css/loader.css";
import "../assets/css/mainPage.css";
import "../assets/css/comfortPage.css";
import "../assets/css/graph.css";
import Login from "./login.js";
import humidity from "../img/icons/humidity.png";
import wind from "../img/icons/wind-turbine.png";
import sunrise from "../img/icons/sunrise.png";
import sunset from "../img/icons/sunset.png";

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
  const [bgClass, setBgClass] = useState("");
  const [units, setUnits] = useState("metric");
  const [unitName, setUnitName] = useState({ temp: "C", speed: "Km/h" });
  const { currentUser } = useAuth();
  const [clickedFavourites, setClickedFavourites] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [times, setTimes] = useState([]);
  const reactRouterLocation = useReactRouterLocation();

  useEffect(() => {
    const params = new URLSearchParams(reactRouterLocation.search);
    const city = params.get("city");

    if (city) {
      fetchWeatherDataByCity(city);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setError(error.message);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, [reactRouterLocation.search]);

  useEffect(() => {
    if (location.latitude && location.longitude) {
      fetchWeatherData(location.latitude, location.longitude);
    }
  }, [location]);

  const fetchWeatherDataByCity = async (city) => {
    try {
      setLoading(true);
      const apiUrl = `/cityweather?name=${city}&units=${units}`;
      await axios.get(apiUrl);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      axios
        .get(`/favourites/${currentUser.uid}`)
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
      handleClick(name);
      setClickedFavourites(false);
    }
  }, [clickedFavourites]);

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

  //Getting the user's Location with permision ofc
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setError(error.message);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setLocation({
        latitude: 1.3107,
        longitude: 36.825,
      });
    }
  }, []);

  //Proceeding to fetch the data from the API if granted permission
  useEffect(() => {
    if (location) {
      fetchWeatherData(location.latitude, location.longitude);
    }
  }, [location, units]);

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

  const currentDayTime = () => {
    let dayTime = new Date();
    const currentDate = dayTime.toISOString().slice(0, 10);
    const currentTime = dayTime.toTimeString().slice(0, 8);
    return `${currentDate} ${currentTime}`;
  };

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 18) {
      setBgClass("morning-bg");
    } else {
      setBgClass("night-bg");
    }
  }, []);

  //Data from the API being processed
  const fetchWeatherData = async (lat, long) => {
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

      const timeDay = currentDayTime();
      const getDayOrNight = (timeDay) => {
        const time = new Date(timeDay);
        const hours = time.getHours();
        return hours >= 6 && hours < 18 ? "day" : "night";
      };
      const timeOfDay = getDayOrNight(timeDay);

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
          const forecastDate = new Date(dateString).toISOString().split("T")[0];
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

          const formattedTimeString = new Date(dateString).toLocaleTimeString(
            "en-GB",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }
          );

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

      const processedForecastData2 = Object.keys(groupedData).map((date) => {
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
          formattedDateString = new Date(date).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
          });
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
      });

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
  };

  //Adjusting the UI according to the user's search input
  const handleClick = async () => {
    if (name !== "") {
      setLoading(true);
      const apiUrl = `/cityweather?name=${encodeURIComponent(
        name
      )}&units=metric`;
      const apiForecast = `/cityforecast?name=${encodeURIComponent(
        name
      )}&units=metric`;

      try {
        const [currentWeatherResponse, forecastWeatherResponse] =
          await Promise.all([axios.get(apiUrl), axios.get(apiForecast)]);

        const currentResponse = currentWeatherResponse.data;
        const weatherMain = currentResponse.weather[0].main;
        const weatherDescription = currentResponse.weather[0].main.description;

        const timeDay = currentDayTime();
        const getDayOrNight = (timeDay) => {
          const time = new Date(timeDay);
          const hours = time.getHours();
          return hours >= 6 && hours < 18 ? "day" : "night";
        };
        const timeOfDay = getDayOrNight(timeDay);

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
        });

        const latitude = currentResponse.coord.lat;
        const longitude = currentResponse.coord.lon;

        const tzResponse = await axios.get(
          `/timeZone?lat=${latitude}&lon=${longitude}`
        );
        setShowTime(true);
        console.log(showTime);
        console.log("Timezone data:", tzResponse.data);
        const timeRefined = new Date(
          tzResponse.data.formatted
        ).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        setTimes({ time: timeRefined });

        const word = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        if (!loading) {
          toast.success(word);
        }

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

        const processedForecastData2 = Object.keys(groupedData).map((date) => {
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
            formattedDateString = new Date(date).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
            });
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
        });

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
    }
  };

  //the Line Graph for visualization
  const weeklyGraph = (action) => {
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
  };

  useEffect(() => {
    if (data2.length > 0) {
      weeklyGraph("temp");
    }
  }, [data2]);

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
        return "red";
      case "Humidity":
        return "blue";
      case "Wind":
        return "green";
      default:
        return "black"; // Default color
    }
  };

  //Adding a favourite city to the db
  const addToFavourites = (name) => {
    axios
      .post(`/addFavourite`, {
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
      await axios.delete(`/removeFavourite/${id}`);
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
    const existingFavourite = favourites.find((fav) => fav.name === name);
    if (existingFavourite) {
      removeFromFavourites(existingFavourite._id);
    } else {
      addToFavourites(name);
    }
  };

  return (
    <div data-cy="main-div">
      {currentUser ? (
        <div id="left">
          <div className="details">
            <div className="col-humidity">
              <h3>Comfort Level</h3>
              <div className="humidity">
                <img src={humidity} alt="Humidity" className="icon-image" />
                <p className="humidity-value">{data.humidity}%</p>
                <p>Humidity</p>
                <p>
                  Feels like: {Math.round(data.feelsLike)}°{unitName.temp}
                </p>
              </div>
            </div>

            <div className="col-wind">
              <h3>Wind</h3>
              <div className="wind">
                <img src={wind} alt="Wind Speed" className="icon-image" />
                <p className="wind-speed">
                  {Math.round(data.speed)} {unitName.speed}
                </p>
                <p>Wind Speed</p>
              </div>
            </div>

            <div className="col-sunrise-sunset">
              <h3>Sunrise & Sunset</h3>
              <div className="sunrise-sunset">
                <img src={sunset} alt="Sunrise" className="icon-image" />
                <p>Sunrise: {data.sunrise}</p>
                <img src={sunrise} alt="Sunset" className="icon-image" />
                <p>Sunset: {data.sunset}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Login />
        </div>
      )}
      <div id="middle">
        <div className="container2">
          {currentUser ? (
            <div id="middle">
              <div className="weather">
                <div
                  className={`container ${bgClass}`}
                  style={{ borderRadius: "35px", padding: "20px" }}
                >
                  {currentUser ? <p>Welcome, {currentUser.email}</p> : null}
                  <p>{formattedTime}</p>
                  <button onClick={metric} class="unit-button metric-button">
                    Metric
                  </button>
                  <button
                    onClick={imperial}
                    class="unit-button imperial-button"
                  >
                    Imperial
                  </button>
                  <br />
                  <div className="search">
                    <input
                      type="text"
                      placeholder="Enter City name"
                      onChange={(e) => setName(e.target.value)}
                    />
                    <button onClick={handleClick}>
                      <i className="material-icons">search</i>
                    </button>
                  </div>
                  <div className="error">
                    <p>{error}</p>
                  </div>
                  {!error && (
                    <div className="winfo">
                      <div className="weather-info">
                        <div className="description">
                          <h3>{data.description}</h3>
                          <br />
                          <p className="current-forecast">{data.image}</p>
                        </div>
                        <span>
                          <h1>
                            <span className="current">
                              {Math.round(data.celcius)}°{unitName.temp}
                            </span>
                          </h1>
                          <h4>
                            Feels like {Math.round(data.feelsLike)}°
                            {unitName.temp}
                          </h4>
                        </span>
                        <div className="temperature">
                          <p>
                            <span className="high">
                              High: {Math.round(data.tempMax)}°{unitName.temp}/
                            </span>
                            {""}
                            <span className="low">
                              Low: {Math.round(data.tempMin)}°{unitName.temp}
                            </span>
                          </p>
                        </div>
                      </div>
                      <h4>
                        <span
                          style={{ display: "inline-block", fontSize: "45px" }}
                        >
                          {data.name}, {data.country}
                        </span>
                        <button
                          className="favourites"
                          onClick={() => toggleFavourite(data.name)}
                        >
                          {favourites.some((fav) => fav.name === data.name) ? (
                            <i
                              className="fa-solid fa-heart"
                              style={{ color: "red", fontSize: "50px" }}
                            ></i>
                          ) : (
                            <i
                              className="fa-regular fa-heart"
                              style={{ color: "white", fontSize: "50px" }}
                            ></i>
                          )}
                        </button>
                        {times ? <p>{times.time}</p> : null}
                      </h4>
                      <hr />
                      <p>
                        <u>All day, today</u>
                      </p>
                      {/* Forecast for the day */}
                      <div className="forecast-container">
                        {todaysData.map((forecast, index) => {
                          return (
                            <div className="mini-weather">
                              <div className="forecasted">
                                <div key={index}>
                                  <p>{forecast.time}</p>
                                  <p className="day-forecast">
                                    {forecast.image}
                                  </p>
                                  <p>
                                    {Math.round(forecast.celcius)}°
                                    {unitName.temp}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <hr />
                      {/* Forecast for the week */}
                      <div className="forecast-container2">
                        {data2.map((forecast, index) => (
                          <div className="mini-weather2">
                            <div className="forecasted2">
                              <div key={index}>
                                <p>{forecast.day}</p>
                                <p className="week-forecast">
                                  {forecast.image}
                                </p>
                                <p>
                                  {Math.round(forecast.averageTemp)}°
                                  {unitName.temp}
                                </p>
                                <p>{forecast.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <hr />
                      {/* Graph goes here */}
                      <div className="graph-container">
                        <div className="button-container">
                          <button
                            className="graph-button-temp"
                            onClick={() => weeklyGraph("temp")}
                          >
                            Temp
                          </button>
                          <button
                            className="graph-button-humidity"
                            onClick={() => weeklyGraph("humidity")}
                          >
                            Humidity
                          </button>
                          <button
                            className="graph-button-wind"
                            onClick={() => weeklyGraph("wind")}
                          >
                            Wind
                          </button>
                        </div>
                        <h2 className="graph-title">{dataKeyName(dataKey)}</h2>
                        <div className="chart-container">
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
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              label={{
                                value: "",
                                position: "insideBottomRight",
                                offset: -5,
                              }}
                            />
                            <YAxis
                              label={{
                                value: dataKeyName(dataKey),
                                angle: -90,
                                position: "insideLeft",
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: "10px",
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
                      <hr />
                    </div>
                  )}
                </div>

                {loading && (
                  <div className="loader">
                    <div className="loader__circle"></div>
                    <div className="loader__circle"></div>
                    <div className="loader__circle"></div>
                    <div className="loader__circle"></div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Login />
            </div>
          )}
        </div>
      </div>
      {currentUser ? (
        <div id="right">
          <h2 className="listed-header">My favourite Cities</h2>
          {favourites.length
            ? favourites.map((favourite, index) => (
                <div key={index}>
                  <ul>
                    <li
                      className="listed"
                      onClick={() => {
                        setName(favourite.name);
                        setClickedFavourites(true);
                      }}
                    >
                      {favourite.name}
                    </li>
                  </ul>
                </div>
              ))
            : null}
        </div>
      ) : (
        <div>
          <Login />
        </div>
      )}
    </div>
  );
}

export default Home;
