// Custom weather-stat icons (humidity, wind, sunrise, sunset).
// Plain gradient-filled inline SVGs instead of stock clipart, so they can
// share the app's color tokens and scale crisply at any size.
import React from "react";

export function HumidityIcon({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="humidityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <path
        d="M50 8 C50 8 18 48 18 68 C18 86.5 32 96 50 96 C68 96 82 86.5 82 68 C82 48 50 8 50 8 Z"
        fill="url(#humidityGrad)"
      />
      <ellipse cx="39" cy="64" rx="7" ry="11" fill="white" opacity="0.35" />
    </svg>
  );
}

export function WindIcon({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="windGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a5a6f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M12 34 H56 A11 11 0 1 0 45 23"
        stroke="url(#windGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M12 56 H72 A13 13 0 1 1 59 43"
        stroke="url(#windGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M12 78 H50 A9 9 0 1 0 41 69"
        stroke="url(#windGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SunriseIcon({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="sunriseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <clipPath id="sunriseClip">
          <rect x="0" y="0" width="100" height="75" />
        </clipPath>
      </defs>
      <circle cx="50" cy="75" r="22" fill="url(#sunriseGrad)" clipPath="url(#sunriseClip)" />
      <path
        d="M35 32 L50 17 L65 32"
        stroke="url(#sunriseGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="75"
        x2="88"
        y2="75"
        stroke="url(#sunriseGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SunsetIcon({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <clipPath id="sunsetClip">
          <rect x="0" y="0" width="100" height="75" />
        </clipPath>
      </defs>
      <circle cx="50" cy="75" r="22" fill="url(#sunsetGrad)" clipPath="url(#sunsetClip)" />
      <path
        d="M35 19 L50 34 L65 19"
        stroke="url(#sunsetGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="75"
        x2="88"
        y2="75"
        stroke="url(#sunsetGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
