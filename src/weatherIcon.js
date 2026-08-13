import React from "react";

/*
  Weather glyphs as monochrome line art.

  These inherit currentColor rather than carrying their own palette, so the
  forecast reads as one typographic system with the numbers beside it. The
  colour in the app comes from the condition wash behind the page, not from
  seventeen separate pieces of clip art.

  Sizing is handled by the .current-forecast / .day-forecast / .week-forecast
  wrappers in assets/css/mainPage.css.
*/

const CLOUD =
  "M6.6 18.2a4.3 4.3 0 0 1-.4-8.58 5.8 5.8 0 0 1 11.2 1.01 3.6 3.6 0 0 1-.35 7.14z";

// A smaller cloud sitting low and right, leaving the upper left clear for the
// sun or moon to peek out from behind it.
const CLOUD_SM =
  "M10 19.4a3.4 3.4 0 0 1-.32-6.78 4.6 4.6 0 0 1 8.9.8 2.95 2.95 0 0 1-.28 5.98z";

// Rays around a small sun. The angle list is configurable because the
// partly-cloudy glyph has to drop the rays that would otherwise be drawn
// straight through the cloud (0deg is east, 90deg is south in SVG space).
const ALL_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

const SunRays = ({ cx = 12, cy = 12, r = 6.4, len = 2.2, angles = ALL_RAYS }) =>
  angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return (
      <line
        key={deg}
        x1={cx + Math.cos(rad) * r}
        y1={cy + Math.sin(rad) * r}
        x2={cx + Math.cos(rad) * (r + len)}
        y2={cy + Math.sin(rad) * (r + len)}
      />
    );
  });

function Glyph({ label, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.05"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

const ClearDay = () => (
  <Glyph label="Clear sky">
    <circle cx="12" cy="12" r="4.2" />
    <SunRays />
  </Glyph>
);

const ClearNight = () => (
  <Glyph label="Clear night">
    <path d="M19.3 15.2A7.6 7.6 0 0 1 9.1 5a7.6 7.6 0 1 0 10.2 10.2z" />
  </Glyph>
);

const Cloudy = ({ label = "Cloudy" }) => (
  <Glyph label={label}>
    <path d={CLOUD} />
  </Glyph>
);

const SunCloud = () => (
  <Glyph label="Partly cloudy">
    <circle cx="8.2" cy="7.6" r="2.5" />
    <SunRays
      cx={8.2}
      cy={7.6}
      r={4.3}
      len={1.5}
      angles={[135, 180, 225, 270, 315]}
    />
    <path d={CLOUD_SM} />
  </Glyph>
);

const MoonCloud = () => (
  <Glyph label="Partly cloudy night">
    {/* Same crescent as the clear-night glyph, scaled down and tucked above
        the cloud. non-scaling-stroke keeps its line weight matching the
        cloud's rather than shrinking with the transform. */}
    <g transform="translate(3.2 1.5) scale(0.42)">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        vectorEffect="non-scaling-stroke"
      />
    </g>
    <path d={CLOUD_SM} />
  </Glyph>
);

// Rain intensity is expressed by how many strokes fall and how long they are.
const Rain = ({ drops = 3, long = false, label = "Rain" }) => (
  <Glyph label={label}>
    <path d={CLOUD} />
    {Array.from({ length: drops }, (_, i) => {
      const x = 8.5 + i * (7 / Math.max(drops - 1, 1));
      return (
        <line
          key={i}
          x1={x}
          y1="20"
          x2={x - (long ? 1.4 : 0.9)}
          y2={long ? 23 : 22.2}
        />
      );
    })}
  </Glyph>
);

const Drizzle = () => (
  <Glyph label="Drizzle">
    <path d={CLOUD} />
    {[9, 12, 15].map((x) => (
      <line key={x} x1={x} y1="20.4" x2={x - 0.4} y2="21.4" />
    ))}
  </Glyph>
);

// Six-pointed flakes rather than a plus sign - three crossing strokes read as
// snow at hero size and blur down to a soft dot at strip size, which is fine.
const Snow = () => {
  const r = 0.95;
  const dx = r * 0.866;
  const dy = r * 0.5;
  return (
    <Glyph label="Snow">
      <path d={CLOUD} />
      {[9, 12, 15].map((x) => (
        <g key={x}>
          <line x1={x} y1={21.4 - r} x2={x} y2={21.4 + r} />
          <line x1={x - dx} y1={21.4 - dy} x2={x + dx} y2={21.4 + dy} />
          <line x1={x - dx} y1={21.4 + dy} x2={x + dx} y2={21.4 - dy} />
        </g>
      ))}
    </Glyph>
  );
};

const Storm = () => (
  <Glyph label="Thunderstorm">
    <path d={CLOUD} />
    <path d="M12.8 19 11.3 21.2h2.1l-1.9 2.4" />
  </Glyph>
);

const Fog = ({ label = "Mist" }) => (
  <Glyph label={label}>
    <path d={CLOUD} />
    <line x1="5.5" y1="21.2" x2="14" y2="21.2" />
    <line x1="16.4" y1="21.2" x2="18.8" y2="21.2" />
  </Glyph>
);

function WeatherIcon({ weatherMain, weatherDescription, timeOfDay }) {
  const night = timeOfDay === "night";
  const description = (weatherDescription || "").toLowerCase();

  switch (weatherMain) {
    case "Clear":
      return night ? <ClearNight /> : <ClearDay />;

    case "Clouds":
      // Thin cloud cover still lets the sun or moon through; thick cover
      // doesn't, so only the broken/overcast cases drop the celestial body.
      if (description === "few clouds" || description === "scattered clouds") {
        return night ? <MoonCloud /> : <SunCloud />;
      }
      return <Cloudy label={weatherDescription || "Cloudy"} />;

    case "Rain":
      if (description === "light rain") return <Rain drops={2} label="Light rain" />;
      if (description === "heavy intensity rain" || description === "shower rain") {
        return <Rain drops={4} long label="Heavy rain" />;
      }
      return <Rain drops={3} label="Rain" />;

    case "Drizzle":
      return <Drizzle />;

    case "Thunderstorm":
      return <Storm />;

    case "Snow":
      return <Snow />;

    case "Mist":
    case "Fog":
    case "Haze":
    case "Smoke":
    case "Dust":
    case "Sand":
      return <Fog label={weatherMain} />;

    default:
      return night ? <ClearNight /> : <ClearDay />;
  }
}

export default WeatherIcon;
