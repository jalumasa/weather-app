import axios from "axios";

const API_TZ_BASE_URL = "http://api.timezonedb.com/v2.1/get-time-zone";

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const apiUrl = `${API_TZ_BASE_URL}?key=${process.env.TZ_KEY}&format=json&by=position&lat=${lat}&lng=${lon}`;

  try {
    const response = await axios.get(apiUrl);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching timezone data:", error);
    res.status(500).json({ error: "Error fetching timezone data" });
  }
}
