import React from "react";

/*
  The conditions grid.

  Each tile is one reading, with a small drawing only where the drawing says
  something a number can't: which way the wind is blowing, where today's UV
  peaked, how much daylight is left. Everything else is just the figure, large
  and quiet, in keeping with the rest of the app.

  Nothing here is invented. Every value comes from a response the dashboard
  already fetches (see buildMetrics in pages/home.js); a reading the API didn't
  send renders as a dash rather than a guess.
*/

const Tile = ({ label, children, className = "" }) => (
  <div className={`panel-raised flex flex-col p-5 ${className}`}>
    <p className="text-micro uppercase tracking-[0.14em] text-ink-400">
      {label}
    </p>
    {children}
  </div>
);

const Figure = ({ value, unit, note }) => (
  <>
    <p className="tnum mt-3 text-2xl font-light leading-none text-ink-100">
      {value}
      {unit ? (
        <span className="ml-1 text-small text-ink-400">{unit}</span>
      ) : null}
    </p>
    {note ? <p className="mt-auto pt-3 text-tiny text-ink-400">{note}</p> : null}
  </>
);

const missing = (value) => value === null || value === undefined;
const round = (value, places = 0) =>
  missing(value) ? "–" : Number(value).toFixed(places);

// UV bands as published by the WHO. The wording matters more than the number:
// "3 Moderate" tells you whether to care.
const uvBand = (uv) => {
  if (missing(uv)) return "";
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
};

// A dial rather than a number, because "124° SE" is a direction and directions
// are spatial. The needle points the way the wind is going.
function WindDial({ degrees }) {
  if (missing(degrees)) return null;
  const radius = 26;
  const angle = ((degrees - 90) * Math.PI) / 180;
  const x = 32 + radius * Math.cos(angle);
  const y = 32 + radius * Math.sin(angle);

  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      {["N", "E", "S", "W"].map((point, index) => {
        const tickAngle = ((index * 90 - 90) * Math.PI) / 180;
        return (
          <text
            key={point}
            x={32 + (radius + 6) * Math.cos(tickAngle)}
            y={32 + (radius + 6) * Math.sin(tickAngle) + 2.5}
            textAnchor="middle"
            fill="var(--color-ink-400)"
            style={{ fontSize: "7px" }}
          >
            {point}
          </text>
        );
      })}
      <line
        x1="32"
        y1="32"
        x2={x}
        y2={y}
        stroke="var(--color-ink-100)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r="2.5" fill="var(--color-ink-100)" />
    </svg>
  );
}

// The one place a full spectrum is justified: UV *is* a colour scale, and the
// marker's position against it reads faster than the digit does.
function UvScale({ uv }) {
  if (missing(uv)) return null;
  const position = Math.min(100, (Math.min(uv, 12) / 12) * 100);
  return (
    <div className="mt-auto pt-4">
      <div
        className="relative h-[5px] rounded-[9999px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #6ea8d8, #86c49b, #ddc46f, #e0975f, #d8615f, #b070c8)",
        }}
      >
        <span
          className="absolute top-1/2 h-3 w-[3px] -translate-y-1/2 rounded-[9999px]"
          style={{
            left: `calc(${position}% - 1.5px)`,
            backgroundColor: "var(--color-ink-100)",
            boxShadow: "0 0 0 2px var(--surface-raised)",
          }}
        />
      </div>
    </div>
  );
}

/*
  Sun's path, with a marker at the current point between sunrise and sunset -
  the shape carries "how much of the day is left" better than two timestamps.

  The marker is placed by evaluating the same quadratic the path is drawn
  with, so it sits exactly on the curve instead of near it. The aspect ratio
  is left alone: stretching the box to fill the tile turned the sun into an
  ellipse.
*/
const ARC = { x0: 12, x1: 388, y: 40, controlX: 200, controlY: -8 };

const arcPoint = (t) => ({
  x: (1 - t) ** 2 * ARC.x0 + 2 * (1 - t) * t * ARC.controlX + t ** 2 * ARC.x1,
  y: (1 - t) ** 2 * ARC.y + 2 * (1 - t) * t * ARC.controlY + t ** 2 * ARC.y,
});

function SunArc({ progress }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const { x, y } = arcPoint(clamped);

  return (
    <svg
      viewBox="0 0 400 52"
      className="mt-auto w-full pt-3"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1={ARC.y}
        x2="400"
        y2={ARC.y}
        stroke="var(--hairline)"
        strokeWidth="1.5"
      />
      <path
        d={`M${ARC.x0} ${ARC.y} Q ${ARC.controlX} ${ARC.controlY} ${ARC.x1} ${ARC.y}`}
        fill="none"
        stroke="var(--hairline)"
        strokeWidth="1.5"
      />
      <circle
        cx={x}
        cy={y}
        r="5"
        fill="var(--color-ink-100)"
        stroke="var(--surface-raised)"
        strokeWidth="2"
      />
    </svg>
  );
}

function ConditionsGrid({ metrics, data, unitName, sunProgress }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Tile label="Wind" className="col-span-2">
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="tnum text-2xl font-light leading-none text-ink-100">
              {round(metrics.windSpeed)}
              <span className="ml-1 text-small text-ink-400">
                {unitName.speed}
              </span>
            </p>
            <dl className="mt-3 space-y-1 text-tiny text-ink-400">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0">Peak gusts</dt>
                <dd className="tnum text-ink-200">
                  {missing(metrics.windGust)
                    ? "–"
                    : `${round(metrics.windGust)} ${unitName.speed}`}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0">Direction</dt>
                <dd className="tnum text-ink-200">
                  {missing(metrics.windDeg)
                    ? "–"
                    : `${Math.round(metrics.windDeg)}° ${metrics.windPoint}`}
                </dd>
              </div>
            </dl>
          </div>
          <WindDial degrees={metrics.windDeg} />
        </div>
      </Tile>

      <Tile label="Feels like">
        <Figure
          value={round(metrics.feelsLike)}
          unit={`°${unitName.temp}`}
          note={
            missing(metrics.feelsLike) || missing(data.celcius)
              ? null
              : Math.abs(metrics.feelsLike - data.celcius) < 1
              ? "Close to the actual temperature."
              : metrics.feelsLike > data.celcius
              ? "Humidity is making it feel warmer."
              : "Wind is making it feel cooler."
          }
        />
      </Tile>

      <Tile label="UV index">
        <Figure
          value={round(metrics.uvNow)}
          note={
            missing(metrics.uvMax)
              ? uvBand(metrics.uvNow)
              : `${uvBand(metrics.uvNow)} · peaked at ${round(metrics.uvMax)}`
          }
        />
        <UvScale uv={metrics.uvNow} />
      </Tile>

      <Tile label="Humidity">
        <Figure
          value={round(metrics.humidity)}
          unit="%"
          note={
            missing(metrics.dewPoint)
              ? null
              : `Dew point ${round(metrics.dewPoint)}°${unitName.temp}`
          }
        />
      </Tile>

      <Tile label="Rain">
        <Figure
          value={round(metrics.pop)}
          unit="%"
          note={
            metrics.precipitation > 0.05
              ? `${round(metrics.precipitation, 1)} ${
                  metrics.precipitationUnit
                } expected in 24h`
              : "None expected in the next 24h"
          }
        />
      </Tile>

      <Tile label="Visibility">
        <Figure
          value={round(metrics.visibility, metrics.visibility >= 10 ? 0 : 1)}
          unit={metrics.visibilityUnit}
          note={
            missing(metrics.cloudCover)
              ? null
              : `${Math.round(metrics.cloudCover)}% cloud cover`
          }
        />
      </Tile>

      <Tile label="Pressure">
        <Figure
          value={round(metrics.pressure, metrics.pressureUnit === "inHg" ? 2 : 0)}
          unit={metrics.pressureUnit}
        />
      </Tile>

      <Tile label="Sun" className="col-span-2 lg:col-span-4">
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="tnum text-2xl font-light leading-none text-ink-100">
            {data.sunrise || "–"}
          </p>
          <p className="tnum text-small text-ink-400">
            Sets {data.sunset || "–"}
          </p>
        </div>
        {metrics.daylight ? (
          <p className="mt-2 text-tiny text-ink-400">
            {metrics.daylight} of daylight
          </p>
        ) : null}
        <SunArc progress={sunProgress} />
      </Tile>
    </div>
  );
}

export default ConditionsGrid;
