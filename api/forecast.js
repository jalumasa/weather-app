import axios from "axios";

const API_BASE_URL = "https://api.openweathermap.org/data/2.5";

export default async function handler(req, res) {
  const { lat, lon, units } = req.query;
  const apiUrl = `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${process.env.API_KEY}&units=${units}`;

  try {
    const response = await axios.get(apiUrl);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    res
      .status(error.response?.status || 500)
      .json({ error: "Failed to fetch forecast data" });
  }
}
