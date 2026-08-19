/*
  Pure weather logic, deliberately free of React, network clients and Firebase.

  It lives apart from the dashboard so it can be tested directly: every bug
  this project has actually shipped was in here - day/night read off the
  viewer's clock, wind in m/s labelled km/h, sunrise in the wrong timezone,
  gusts reported below the sustained wind - and all of them are a plain
  function of their inputs. See weather.test.js.
*/

/*
  Forecast timestamps come back as UTC. Shifting a slot by the city's offset
  and then reading it in UTC gives that city's wall clock, which is the only
  clock worth showing - the forecast for Tokyo should read in Tokyo's hours no
  matter where the browser is.

  These live at module scope because both fetch paths (search by name, fetch by
  coordinates) run the same pipeline, and keeping the date logic in one place is
  what stops the two from drifting apart again.
*/
export const cityClock = (unixSeconds, offsetSeconds = 0) =>
  new Date((unixSeconds + offsetSeconds) * 1000);

export const cityTimeLabel = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

export const cityDayOrNight = (date) => {
  const hours = date.getUTCHours();
  return hours >= 6 && hours < 18 ? "day" : "night";
};

// YYYY-MM-DD in the city's own calendar, used to group slots into days.
export const cityDateKey = (date) => date.toISOString().split("T")[0];

// "Friday" rather than "08/14". Noon avoids any edge where a midnight
// timestamp could round to the neighbouring day.
export const weekdayLabel = (dateKey) =>
  new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

export const shiftDateKey = (dateKey, days) => {
  const shifted = new Date(`${dateKey}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return cityDateKey(shifted);
};

// Where "now" sits between sunrise and sunset, 0..1, for the sun arc.
export const sunPosition = (now, sunrise, sunset) => {
  if (!now || !sunrise || !sunset || sunset <= sunrise) return 0;
  return Math.min(1, Math.max(0, (now - sunrise) / (sunset - sunrise)));
};

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export const compassPoint = (degrees) =>
  COMPASS[Math.round((degrees % 360) / 22.5) % 16];

/*
  Everything the conditions grid shows, derived in one place from responses
  both fetch paths already have. Only the UV call is extra.

  Kept at module scope for the same reason as the date helpers: the two fetch
  paths run this pipeline in duplicate, and every bug that's been fixed in one
  and missed in the other started as logic living inside them.
*/
export function buildMetrics({ current, forecastList, uv, units }) {
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

export const tempColor = (value, units) => {
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
