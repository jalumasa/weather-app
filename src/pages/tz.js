import { DateTime } from "luxon";
import React from "react";

const cities = [
  { name: "New York", timezone: "America/New_York" },
  { name: "London", timezone: "Europe/London" },
  { name: "Tokyo", timezone: "Asia/Tokyo" },
  { name: "Sydney", timezone: "Australia/Sydney" },
];

function Tz() {
  const getCurrentTime = (timezone) => {
    return DateTime.now()
      .setZone(timezone)
      .toLocaleString(DateTime.DATETIME_FULL);
  };
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Current Time in Different Cities</h1>
      <div style={styles.citiesContainer}>
        {cities.map((city) => (
          <div key={city.name} style={styles.cityCard}>
            <h2>{city.name}</h2>
            <p>{getCurrentTime(city.timezone)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    fontFamily: "Segoe UI, sans-serif",
    background: "#f0f0f0",
    minHeight: "100vh",
  },
  header: {
    marginBottom: "20px",
    color: "#333",
    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.1)",
  },
  citiesContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    justifyContent: "center",
  },
  cityCard: {
    background: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    padding: "20px",
    textAlign: "center",
    width: "200px",
    transition: "transform 0.3s, box-shadow 0.3s",
  }
};

export default Tz;

