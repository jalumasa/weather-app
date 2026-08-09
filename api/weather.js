const API_BASE_URL = "https://api.openweathermap.org/data/2.5";

export default async function handler(req, res) {
  const { lat, lon, units } = req.query;
  const apiUrl = `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${process.env.API_KEY}&units=${units}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch weather data" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching weather:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
}
