const API_BASE_URL = "https://api.openweathermap.org/geo/1.0/direct";

export default async function handler(req, res) {
  const { q } = req.query;
  const apiUrl = `${API_BASE_URL}?q=${encodeURIComponent(
    q
  )}&limit=5&appid=${process.env.API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch location matches" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching location matches:", error);
    res.status(500).json({ error: "Failed to fetch location matches" });
  }
}
