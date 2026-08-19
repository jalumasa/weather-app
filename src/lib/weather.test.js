import {
  cityClock,
  cityTimeLabel,
  cityDayOrNight,
  cityDateKey,
  weekdayLabel,
  shiftDateKey,
  sunPosition,
  compassPoint,
  buildMetrics,
  tempColor,
} from "./weather";

/*
  These are regression tests. Every case below is a bug this app actually
  shipped and someone had to notice by eye - so each one names the symptom
  rather than the function, and would have failed before the fix.
*/

// 2026-08-14T12:00:00Z
const NOON_UTC = 1786708800;
const PHOENIX = -7 * 3600; // UTC-7
const TOKYO = 9 * 3600; // UTC+9

describe("city clock", () => {
  test("reads the city's wall clock, not the viewer's", () => {
    // Noon UTC is 5am in Phoenix and 9pm in Tokyo, whatever the test machine
    // is set to. This is what broke when the viewer's clock was used instead.
    expect(cityTimeLabel(cityClock(NOON_UTC, PHOENIX))).toBe("05:00 AM");
    expect(cityTimeLabel(cityClock(NOON_UTC, TOKYO))).toBe("09:00 PM");
  });

  test("day/night follows the city, so Phoenix at 1pm is not night", () => {
    // The original symptom: looking up Phoenix at 1pm from Nairobi drew a moon
    // and a starfield over a 37C afternoon.
    const phoenixAfternoon = cityClock(NOON_UTC + 8 * 3600, PHOENIX); // 1pm local
    expect(cityDayOrNight(phoenixAfternoon)).toBe("day");

    const tokyoLateEvening = cityClock(NOON_UTC + 2 * 3600, TOKYO); // 11pm local
    expect(cityDayOrNight(tokyoLateEvening)).toBe("night");
  });

  test("groups a slot into the city's calendar day, not UTC's", () => {
    // 01:00 UTC the next day is still the evening of the 14th in Phoenix.
    const lateEveningInPhoenix = cityClock(NOON_UTC + 13 * 3600, PHOENIX);
    expect(cityDateKey(lateEveningInPhoenix)).toBe("2026-08-14");
    // The same instant is already tomorrow in Tokyo.
    expect(cityDateKey(cityClock(NOON_UTC + 13 * 3600, TOKYO))).toBe("2026-08-15");
  });
});

describe("day labels", () => {
  test("names weekdays instead of printing 08/14", () => {
    expect(weekdayLabel("2026-08-14")).toBe("Friday");
    expect(weekdayLabel("2026-08-17")).toBe("Monday");
  });

  test("rolls over month and year boundaries", () => {
    expect(shiftDateKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("sun position", () => {
  test("is 0 at sunrise, 1 at sunset and halfway at midday", () => {
    expect(sunPosition(1000, 1000, 2000)).toBe(0);
    expect(sunPosition(2000, 1000, 2000)).toBe(1);
    expect(sunPosition(1500, 1000, 2000)).toBeCloseTo(0.5);
  });

  test("clamps outside daylight rather than running off the arc", () => {
    expect(sunPosition(500, 1000, 2000)).toBe(0);
    expect(sunPosition(9999, 1000, 2000)).toBe(1);
  });

  test("survives missing or nonsensical times", () => {
    expect(sunPosition(undefined, 1000, 2000)).toBe(0);
    expect(sunPosition(1500, 2000, 1000)).toBe(0);
  });
});

describe("compass", () => {
  test("converts degrees to a point", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(90)).toBe("E");
    expect(compassPoint(180)).toBe("S");
    expect(compassPoint(270)).toBe("W");
    expect(compassPoint(160)).toBe("SSE");
  });

  test("wraps past 360 instead of running off the end of the array", () => {
    expect(compassPoint(360)).toBe("N");
    expect(compassPoint(361)).toBe("N");
  });
});

describe("temperature colour ramp", () => {
  test("means the same thing in either unit", () => {
    // 10C and 50F are the same temperature and must draw the same colour;
    // the ramp is defined in Celsius, so imperial has to convert first.
    expect(tempColor(10, "metric")).toBe(tempColor(50, "imperial"));
    expect(tempColor(30, "metric")).toBe(tempColor(86, "imperial"));
  });

  test("runs cold to hot, and clamps at both ends", () => {
    expect(tempColor(-40, "metric")).toBe(tempColor(-10, "metric"));
    expect(tempColor(60, "metric")).toBe(tempColor(42, "metric"));
    expect(tempColor(-5, "metric")).not.toBe(tempColor(35, "metric"));
  });
});

describe("buildMetrics", () => {
  const current = {
    main: { feels_like: 21.4, humidity: 51, pressure: 1014 },
    wind: { speed: 4.2, deg: 160 },
    visibility: 10000,
    clouds: { all: 99 },
    dt: NOON_UTC,
    sys: { sunrise: NOON_UTC - 6 * 3600, sunset: NOON_UTC + 6 * 3600 },
  };
  const forecastList = [
    { main: { dew_point: 8 }, wind: { gust: 6.1 }, pop: 0.2 },
    { main: {}, wind: { gust: 9.4 }, pop: 0.55, rain: { "3h": 1.2 } },
    { main: {}, wind: {}, pop: 0.1, rain: { "3h": 0.8 } },
  ];

  test("reports metric wind in km/h, not the m/s the API sends", () => {
    // The label said Km/h over an m/s number: 4.2 m/s was shown as "4 Km/h"
    // when it is really 15.
    const m = buildMetrics({ current, forecastList, uv: null, units: "metric" });
    expect(m.windSpeed).toBeCloseTo(15.12);
  });

  test("leaves imperial wind alone, because the API already sends mph", () => {
    const m = buildMetrics({ current, forecastList, uv: null, units: "imperial" });
    expect(m.windSpeed).toBeCloseTo(4.2);
  });

  test("never reports a gust weaker than the sustained wind", () => {
    // Gusts used to be taken from a forecast slot hours away, which produced
    // "gusts 11" beside "wind 15" - impossible.
    const m = buildMetrics({ current, forecastList, uv: null, units: "metric" });
    expect(m.windGust).toBeGreaterThanOrEqual(m.windSpeed);
  });

  test("takes the worst chance of rain over the day, not the average", () => {
    const m = buildMetrics({ current, forecastList, uv: null, units: "metric" });
    expect(m.pop).toBe(55);
  });

  test("totals expected precipitation across the window", () => {
    const m = buildMetrics({ current, forecastList, uv: null, units: "metric" });
    expect(m.precipitation).toBeCloseTo(2.0);
    expect(m.precipitationUnit).toBe("mm");
  });

  test("converts visibility and pressure for imperial", () => {
    const m = buildMetrics({ current, forecastList, uv: null, units: "imperial" });
    expect(m.visibility).toBeCloseTo(6.21, 1);
    expect(m.visibilityUnit).toBe("mi");
    expect(m.pressure).toBeCloseTo(29.94, 1);
    expect(m.pressureUnit).toBe("inHg");
  });

  test("reports daylight from sunrise to sunset", () => {
    const m = buildMetrics({ current, forecastList, uv: null, units: "metric" });
    expect(m.daylight).toBe("12h 0m");
  });

  test("returns nulls rather than guesses when the API omits things", () => {
    // A tile renders a dash for null; inventing a zero would read as real data.
    const m = buildMetrics({
      current: { main: {}, wind: {}, sys: {} },
      forecastList: [],
      uv: null,
      units: "metric",
    });
    expect(m.windSpeed).toBeNull();
    expect(m.windDeg).toBeNull();
    expect(m.visibility).toBeNull();
    expect(m.uvNow).toBeNull();
    expect(m.daylight).toBeNull();
    expect(m.pop).toBeNull();
  });

  test("passes UV through when the separate lookup succeeded", () => {
    const m = buildMetrics({
      current,
      forecastList,
      uv: { now: 4.1, max: 7.2 },
      units: "metric",
    });
    expect(m.uvNow).toBe(4.1);
    expect(m.uvMax).toBe(7.2);
  });
});
