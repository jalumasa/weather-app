const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/*
  UV index.

  OpenWeatherMap only exposes UV through One Call, which is a separate paid
  subscription from the endpoints the rest of this app uses. Open-Meteo gives
  it away without a key, and we already depend on them for geocoding, so this
  is the one metric that comes from somewhere else.

  Returns the reading right now plus today's peak, because "0" at dusk is only
  meaningful next to "it reached 9 today".
*/
export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "uv_index",
    daily: "uv_index_max",
    timezone: "auto",
    forecast_days: "1",
  });

  try {
    const response = await fetch(`${FORECAST_URL}?${params}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch UV" });
    }
    const data = await response.json();
    res.status(200).json({
      now: data.current?.uv_index ?? null,
      max: data.daily?.uv_index_max?.[0] ?? null,
    });
  } catch (error) {
    console.error("Error fetching UV index:", error);
    res.status(500).json({ error: "Failed to fetch UV" });
  }
}
