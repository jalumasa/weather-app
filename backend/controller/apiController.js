import dotenv from "dotenv";
import axios from "axios";
dotenv.config({ path: "./config/.env" });

const API_KEY = process.env.API_KEY;
const API_BASE_URL = "https://api.openweathermap.org/data/2.5";
const tzKey = process.env.TZ_KEY;
const API_TZ_BASE_URL = "http://api.timezonedb.com/v2.1/get-time-zone";

//endpoint to get timezone
const timeZone = async (req, res) => {
  const { lat, lon } = req.query;
  const apiUrl = `${API_TZ_BASE_URL}?key=${tzKey}&format=json&by=position&lat=${lat}&lng=${lon}`;
  try {
    const response = await axios.get(apiUrl);
    console.log(response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching timezone data:", error);
    res.status(500).send("Error fetching timezone data");
  }
};

// Endpoint to fetch weather data
const weather = async (req, res) => {
  const { lat, lon, units } = req.query;
  const apiUrl = `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
  //const apiUrl = `${API_BASE_URL}/weather?lat=-1.294336&lon=36.78208&appid=${API_KEY}&units=metric`;

  try {
    const response = await axios.get(apiUrl, {
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching weather:", error);
    res
      .status(error.response.status || 500)
      .json({ error: "Failed to fetch weather data" });
  }
};

// Endpoint to fetch forecast data
const forecast = async (req, res) => {
  const { lat, lon, units } = req.query;
  const apiUrl = `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;

  try {
    const response = await axios.get(apiUrl, {
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    res
      .status(error.response.status || 500)
      .json({ error: "Failed to fetch forecast data" });
  }
};

// Endpoint to fetch weather data by city name
const cityWeather = async (req, res) => {
  const { name, units } = req.query;
  const apiUrl = `${API_BASE_URL}/weather?q=${name}&appid=${API_KEY}&units=${units}`;

  try {
    const response = await axios.get(apiUrl, {
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching weather:", error);
    res
      .status(error.response.status || 500)
      .json({ error: "Failed to fetch weather data" });
  }
};

// Endpoint to fetch forecast data by city name
const cityForecast = async (req, res) => {
  const { name, units } = req.query;
  const apiUrl = `${API_BASE_URL}/forecast?q=${name}&appid=${API_KEY}&units=${units}`;

  try {
    const response = await axios.get(apiUrl, {
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    res
      .status(error.response.status || 500)
      .json({ error: "Failed to fetch forecast data" });
  }
};

export { timeZone, weather, forecast, cityWeather, cityForecast };
