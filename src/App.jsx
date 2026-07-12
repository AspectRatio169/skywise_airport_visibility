import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const CHECKWX_KEY = import.meta.env.VITE_CHECKWX_API_KEY;
const CHECKWX_BASE = "https://api.checkwx.com/v2";

const EXPERTS = ["RandomForest", "XGBoost"];

// Bands in statute miles (US flight-category thresholds)
const VFR_BANDS = [
  {
    label: "LIFR",
    max: 1,
    active: "border-red-500 bg-red-500/10 text-red-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
  {
    label: "IFR",
    max: 3,
    active: "border-orange-500 bg-orange-500/10 text-orange-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
  {
    label: "MVFR",
    max: 5,
    active: "border-blue-500 bg-blue-500/10 text-blue-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
  {
    label: "VFR",
    max: 14,
    active: "border-green-500 bg-green-500/10 text-green-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
];

function getBand(v) {
  return VFR_BANDS.find((b) => v <= b.max) || VFR_BANDS[3];
}

function useCountUp(target, duration = 1000, decimals = 1) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  useEffect(() => {
    if (target === null) return;
    setValue(0);
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(+(target * eased).toFixed(decimals));
      if (t < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);
  return value;
}

function buildPayload(metar) {
  const now = new Date();
  // Work directly in °F — matches the training data (DRYBULBTEMPF, WETBULBTEMPF, DewPointTempF)
  const tempF = metar?.temperature?.fahrenheit ?? null;
  const dewpointF = metar?.dewpoint?.fahrenheit ?? null;
  const dewDep =
    tempF !== null && dewpointF !== null
      ? +(tempF - dewpointF).toFixed(1)
      : null;
  const wetBulbDep = dewDep !== null ? +(dewDep * 0.6).toFixed(1) : null;

  return {
    StationPressure: metar?.pressure?.hg ?? null, // inHg (matches dataset)
    WindSpeed: metar?.wind?.speed?.mph ?? null, // v2: wind.speed.mph (dataset uses mph)
    WindDirection: metar?.wind?.degrees ?? null, // degrees (0–360)
    Precip: 0.0, // inches
    DewPointDepression: dewDep, // °F
    WetBulbDepression: wetBulbDep, // °F
    RelativeHumidity: metar?.humidity ?? null, // % (v2: plain int)
    Visibility_Lag1: metar?.visibility?.miles_float ?? null, // statute miles
    Visibility_Trend: 0, // miles
    month: now.getUTCMonth() + 1,
    hour: now.getUTCHours(),
  };
}

// helper to build a CheckWX v2 URL with the API key as query param
function cxUrl(path) {
  return `${CHECKWX_BASE}${path}?x-api-key=${CHECKWX_KEY}`;
}

// ─── Hardcoded US airports ────────────────────────────────────────────────────
const US_AIRPORTS = [
  {
    icao: "KATL",
    name: "Hartsfield–Jackson Atlanta International Airport",
    city: "Atlanta, GA",
  },
  {
    icao: "KLAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles, CA",
  },
  { icao: "KORD", name: "O'Hare International Airport", city: "Chicago, IL" },
  {
    icao: "KDFW",
    name: "Dallas/Fort Worth International Airport",
    city: "Dallas–Fort Worth, TX",
  },
  { icao: "KDEN", name: "Denver International Airport", city: "Denver, CO" },
  {
    icao: "KJFK",
    name: "John F. Kennedy International Airport",
    city: "New York, NY",
  },
  { icao: "KLGA", name: "LaGuardia Airport", city: "New York, NY" },
  {
    icao: "KEWR",
    name: "Newark Liberty International Airport",
    city: "Newark, NJ",
  },
  {
    icao: "KSFO",
    name: "San Francisco International Airport",
    city: "San Francisco, CA",
  },
  {
    icao: "KSEA",
    name: "Seattle–Tacoma International Airport",
    city: "Seattle, WA",
  },
  {
    icao: "KLAS",
    name: "Harry Reid International Airport",
    city: "Las Vegas, NV",
  },
  { icao: "KMCO", name: "Orlando International Airport", city: "Orlando, FL" },
  { icao: "KMIA", name: "Miami International Airport", city: "Miami, FL" },
  {
    icao: "KCLT",
    name: "Charlotte Douglas International Airport",
    city: "Charlotte, NC",
  },
  {
    icao: "KPHX",
    name: "Phoenix Sky Harbor International Airport",
    city: "Phoenix, AZ",
  },
  {
    icao: "KIAH",
    name: "George Bush Intercontinental Airport",
    city: "Houston, TX",
  },
  { icao: "KHOU", name: "William P. Hobby Airport", city: "Houston, TX" },
  { icao: "KBOS", name: "Logan International Airport", city: "Boston, MA" },
  {
    icao: "KMSP",
    name: "Minneapolis–Saint Paul International Airport",
    city: "Minneapolis, MN",
  },
  {
    icao: "KDTW",
    name: "Detroit Metropolitan Wayne County Airport",
    city: "Detroit, MI",
  },
  {
    icao: "KPHL",
    name: "Philadelphia International Airport",
    city: "Philadelphia, PA",
  },
  {
    icao: "KIAD",
    name: "Washington Dulles International Airport",
    city: "Washington, DC",
  },
  {
    icao: "KDCA",
    name: "Ronald Reagan Washington National Airport",
    city: "Washington, DC",
  },
  {
    icao: "KBWI",
    name: "Baltimore/Washington International Airport",
    city: "Baltimore, MD",
  },
  {
    icao: "KSLC",
    name: "Salt Lake City International Airport",
    city: "Salt Lake City, UT",
  },
  {
    icao: "KSAN",
    name: "San Diego International Airport",
    city: "San Diego, CA",
  },
  { icao: "KTPA", name: "Tampa International Airport", city: "Tampa, FL" },
  {
    icao: "KFLL",
    name: "Fort Lauderdale–Hollywood International Airport",
    city: "Fort Lauderdale, FL",
  },
  {
    icao: "KAUS",
    name: "Austin–Bergstrom International Airport",
    city: "Austin, TX",
  },
  {
    icao: "KSAT",
    name: "San Antonio International Airport",
    city: "San Antonio, TX",
  },
  {
    icao: "KMDW",
    name: "Chicago Midway International Airport",
    city: "Chicago, IL",
  },
  {
    icao: "KBNA",
    name: "Nashville International Airport",
    city: "Nashville, TN",
  },
  {
    icao: "KSTL",
    name: "St. Louis Lambert International Airport",
    city: "St. Louis, MO",
  },
  {
    icao: "KPDX",
    name: "Portland International Airport",
    city: "Portland, OR",
  },
  { icao: "KOAK", name: "Oakland International Airport", city: "Oakland, CA" },
  {
    icao: "KSJC",
    name: "Norman Y. Mineta San José International Airport",
    city: "San Jose, CA",
  },
  {
    icao: "KSMF",
    name: "Sacramento International Airport",
    city: "Sacramento, CA",
  },
  {
    icao: "KRDU",
    name: "Raleigh–Durham International Airport",
    city: "Raleigh, NC",
  },
  {
    icao: "KCVG",
    name: "Cincinnati/Northern Kentucky International Airport",
    city: "Cincinnati, OH",
  },
  {
    icao: "KCLE",
    name: "Cleveland Hopkins International Airport",
    city: "Cleveland, OH",
  },
  {
    icao: "KCMH",
    name: "John Glenn Columbus International Airport",
    city: "Columbus, OH",
  },
  {
    icao: "KPIT",
    name: "Pittsburgh International Airport",
    city: "Pittsburgh, PA",
  },
  {
    icao: "KIND",
    name: "Indianapolis International Airport",
    city: "Indianapolis, IN",
  },
  {
    icao: "KMCI",
    name: "Kansas City International Airport",
    city: "Kansas City, MO",
  },
  {
    icao: "KMSY",
    name: "Louis Armstrong New Orleans International Airport",
    city: "New Orleans, LA",
  },
  {
    icao: "KANC",
    name: "Ted Stevens Anchorage International Airport",
    city: "Anchorage, AK",
  },
  {
    icao: "PHNL",
    name: "Daniel K. Inouye International Airport",
    city: "Honolulu, HI",
  },
];

// ─── Step 1: Airport selector ─────────────────────────────────────────────────
function AirportSearch({ onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = US_AIRPORTS.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q) ||
      a.icao?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8 pb-6 border-b border-neutral-800">
        <p className="text-xs tracking-widest text-neutral-500 uppercase mb-1">
          Mixture-of-Experts · v1.0
        </p>
        <h1 className="text-2xl font-normal text-white">
          Airport Visibility Predictor
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Select a US airport to fetch live weather and predict visibility.
        </p>
      </div>

      <div className="w-full mb-4">
        <input
          type="text"
          placeholder="Search by city, airport name, or ICAO code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-4 py-3 rounded border border-neutral-700 bg-neutral-900 text-white placeholder-neutral-600 outline-none focus:border-neutral-400 transition-colors duration-200"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        />
      </div>

      <p className="w-full text-xs text-neutral-600 mb-3">
        {filtered.length} airport{filtered.length !== 1 ? "s" : ""} found
      </p>

      <div className="w-full max-h-[480px] overflow-y-auto border border-neutral-800 rounded divide-y divide-neutral-800">
        {filtered.length === 0 ? (
          <p className="text-center text-neutral-500 text-sm py-8">
            No airports match "{search}"
          </p>
        ) : (
          filtered.map((airport) => (
            <button
              key={airport.icao}
              onClick={() => onSelect(airport)}
              className="w-full flex items-center justify-between px-5 py-4 bg-neutral-900 hover:bg-neutral-800 transition-colors duration-150 text-left"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-white">{airport.name}</span>
                <span className="text-xs text-neutral-500">{airport.city}</span>
              </div>
              <span className="text-xs tracking-widest text-neutral-400 border border-neutral-700 rounded px-2 py-1 ml-4 shrink-0">
                {airport.icao}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Parameters review ────────────────────────────────────────────────
function ParamsReview({
  airport,
  payload,
  metarRaw,
  onBack,
  onPredict,
  loading,
}) {
  const PARAM_LABELS = {
    StationPressure: { label: "Station Pressure", unit: "inHg" },
    WindSpeed: { label: "Wind Speed", unit: "mph" },
    WindDirection: { label: "Wind Direction", unit: "°" },
    Precip: { label: "Precipitation", unit: "in" },
    DewPointDepression: { label: "Dew Point Depression", unit: "°F" },
    WetBulbDepression: { label: "Wet Bulb Depression", unit: "°F" },
    RelativeHumidity: { label: "Relative Humidity", unit: "%" },
    Visibility_Lag1: { label: "Current Visibility", unit: "mi" },
    Visibility_Trend: { label: "Visibility Trend", unit: "mi" },
    month: { label: "Month", unit: "1–12" },
    hour: { label: "Hour (UTC)", unit: "0–23" },
  };

  const entries = Object.entries(PARAM_LABELS);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full mb-6 pb-6 border-b border-neutral-800">
        <button
          onClick={onBack}
          className="text-xs text-neutral-500 hover:text-neutral-300 tracking-widest uppercase mb-4 transition-colors duration-150"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          ← Back
        </button>
        <div className="text-center">
          <p className="text-xs tracking-widest text-neutral-500 uppercase mb-1">
            Live METAR · {airport.icao}
          </p>
          <h1 className="text-xl font-normal text-white">{airport.name}</h1>
          <p className="text-sm text-neutral-500 mt-1">{airport.city}</p>
        </div>
      </div>

      {metarRaw && (
        <div className="w-full mb-5 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded">
          <p className="text-xs tracking-widest text-neutral-500 uppercase mb-1">
            Raw METAR
          </p>
          <p className="text-xs text-neutral-300 break-all">{metarRaw}</p>
        </div>
      )}

      <table className="w-full mb-6 border-collapse">
        <tbody>
          {Array.from({ length: Math.ceil(entries.length / 2) }, (_, i) => (
            <tr key={i}>
              {entries.slice(i * 2, i * 2 + 2).map(([key, meta]) => (
                <td
                  key={key}
                  className="w-1/2 border border-neutral-800 bg-neutral-900 p-5 text-center align-top"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs tracking-widest text-neutral-400 uppercase whitespace-nowrap">
                      {meta.label}{" "}
                      <span className="text-neutral-600 normal-case">
                        ({meta.unit})
                      </span>
                    </span>
                    <span
                      className="text-lg text-white"
                      style={{
                        fontFamily: "'Courier New', Courier, monospace",
                      }}
                    >
                      {payload[key] ?? "–"}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={onPredict}
        disabled={loading}
        className="w-full py-3 text-sm tracking-widest uppercase border border-neutral-600 text-neutral-300 rounded hover:bg-neutral-800 hover:border-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {loading ? (
          <div className="w-full flex flex-col items-center justify-center py-6">
            <span
              className="text-2xl animate-bounce"
              style={{ fontFamily: "sans-serif" }}
            >
              ✈
            </span>
            <p className="text-xs tracking-widest text-neutral-500 uppercase mt-2">
              fetching prediction…
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-6">
            <p className="text-xs tracking-widest text-neutral-500 uppercase">
              get prediction
            </p>
          </div>
        )}
      </button>
    </div>
  );
}

// ─── Step 3: Result ───────────────────────────────────────────────────────────
function ResultView({ result, airport, onReset }) {
  const displayed = useCountUp(result?.predicted_visibility ?? null);
  const band = result ? getBand(result.predicted_visibility) : null;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8 pb-6 border-b border-neutral-800">
        <p className="text-xs tracking-widest text-neutral-500 uppercase mb-1">
          {airport.icao} · {airport.city}
        </p>
        <h1 className="text-xl font-normal text-white">{airport.name}</h1>
      </div>

      {band && (
        <div className="w-full border border-neutral-700 rounded-lg overflow-hidden">
          <div className="bg-neutral-900 px-6 py-8 border-b border-neutral-700 text-center">
            <p className="text-xs tracking-widest text-neutral-500 uppercase mb-4">
              Predicted Visibility
            </p>
            <div className="flex items-baseline justify-center gap-3 mb-6">
              <span className="text-8xl font-normal text-white leading-none">
                {displayed.toFixed(1)}
              </span>
              <span className="text-3xl text-neutral-500">mi</span>
            </div>
            <div className="flex justify-center gap-3">
              {VFR_BANDS.map((b) => (
                <div
                  key={b.label}
                  className={`px-5 py-2 border rounded text-sm tracking-widest transition-all duration-300 ${
                    b.label === band.label ? b.active : b.inactive
                  }`}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-neutral-700">
            <div className="px-6 py-6 bg-neutral-950 text-center">
              <p className="text-xs tracking-widest text-neutral-500 uppercase mb-3">
                Cluster
              </p>
              <p className="text-5xl text-white">{result.cluster}</p>
            </div>
            <div className="px-6 py-6 bg-neutral-950 text-center">
              <p className="text-xs tracking-widest text-neutral-500 uppercase mb-4">
                Expert Model
              </p>
              <div className="flex justify-center gap-3">
                {EXPERTS.map((e) => (
                  <span
                    key={e}
                    className={`px-5 py-2 text-sm tracking-wider rounded border transition-all duration-300 ${
                      result.expert_model === e
                        ? "border-neutral-400 bg-white/10 text-white"
                        : "border-neutral-800 bg-transparent text-neutral-600"
                    }`}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full mt-5 py-3 text-xs tracking-widest uppercase border border-neutral-800 text-neutral-500 rounded hover:bg-neutral-800 hover:border-neutral-600 hover:text-neutral-300 transition-all duration-200"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        ← select another airport
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("select");
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [payload, setPayload] = useState(null);
  const [metarRaw, setMetarRaw] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAirportSelect = async (airport) => {
    setError(null);
    setLoading(true);
    setSelectedAirport(airport);
    try {
      const res = await fetch(cxUrl(`/metar/${airport.icao}/decoded`), {
        method: "GET",
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`METAR fetch failed (${res.status})`);
      const data = await res.json();
      const metar = data.data?.[0];
      if (!metar) throw new Error("No METAR data available for this station.");
      setMetarRaw(metar.raw_text || null);
      const built = buildPayload(metar);
      const sanitized = Object.fromEntries(
        Object.entries(built).map(([k, v]) => [
          k,
          v === null || (typeof v === "number" && isNaN(v)) ? 0 : v,
        ]),
      );
      setPayload(sanitized);
      setStep("review");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      setResult(await res.json());
      setStep("result");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("select");
    setSelectedAirport(null);
    setPayload(null);
    setMetarRaw(null);
    setResult(null);
    setError(null);
  };

  return (
    <div
      className="min-h-screen bg-[#1a1a1a] text-neutral-200 px-6 py-10 flex flex-col items-center"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <div className="w-full max-w-2xl flex flex-col items-center">
        {error && (
          <div className="w-full mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === "select" && !loading && (
          <AirportSearch onSelect={handleAirportSelect} />
        )}

        {step === "select" && loading && (
          <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
            <span
              className="text-3xl animate-bounce"
              style={{ fontFamily: "sans-serif" }}
            >
              ✈
            </span>
            <p className="text-xs tracking-widest text-neutral-500 uppercase">
              Fetching METAR for {selectedAirport?.icao}…
            </p>
          </div>
        )}

        {step === "review" && payload && (
          <ParamsReview
            airport={selectedAirport}
            payload={payload}
            metarRaw={metarRaw}
            onBack={handleReset}
            onPredict={handlePredict}
            loading={loading}
          />
        )}

        {step === "result" && result && (
          <ResultView
            result={result}
            airport={selectedAirport}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
