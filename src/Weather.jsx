import { useEffect, useState } from "react";
import "./Weather.css";

const WEATHER_API_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=54.6872&longitude=25.2797&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=Europe%2FVilnius";

function getWeatherDescription(code) {
  if (code === 0) return "Giedra";
  if (code === 1) return "Daugiausia giedra";
  if (code === 2) return "Iš dalies debesuota";
  if (code === 3) return "Debesuota";
  if ([45, 48].includes(code)) return "Rūkas";
  if ([51, 53, 55, 56, 57].includes(code)) return "Dulksna";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Lietus";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Sninga";
  if ([95, 96, 99].includes(code)) return "Perkūnija";
  return "Orai";
}

function Weather({ compact = false }) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather() {
      try {
        const response = await fetch(WEATHER_API_URL, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Orų duomenys nepasiekiami.");
        const result = await response.json();
        setWeather(result.current);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("Nepavyko įkelti orų duomenų.");
        }
      }
    }

    loadWeather();
    return () => controller.abort();
  }, []);

  return (
    <section className={`weather-card${compact ? " weather-card--compact" : ""}`} aria-label="Vilniaus orai">
      <div className="weather-card__heading">
        <div>
          <p className="weather-card__eyebrow">DABAR · VILNIUS</p>
        </div>
        <span className="weather-card__icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="42" cy="22" r="11" fill="currentColor" />
            <path d="M17 47h29a9 9 0 0 0 0-18 14 14 0 0 0-27-2 10 10 0 0 0-2 20Z" fill="white" fillOpacity=".92" />
          </svg>
        </span>
      </div>

      {error ? (
        <p className="weather-card__message" role="status">{error}</p>
      ) : weather ? (
        <>
          <div className="weather-card__current">
            <strong>{Math.round(weather.temperature_2m)}°</strong>
            <div>
              <span>{getWeatherDescription(weather.weather_code)}</span>
              <small>Jaučiama kaip {Math.round(weather.apparent_temperature)}°</small>
            </div>
          </div>
          <div className="weather-card__details">
            <p><span>Vėjas</span><strong>{Math.round(weather.wind_speed_10m)} km/h</strong></p>
            <p><span>Krituliai</span><strong>{weather.precipitation} mm</strong></p>
          </div>
        </>
      ) : (
        <p className="weather-card__message" role="status">Įkeliami orai...</p>
      )}
    </section>
  );
}

export default Weather;
