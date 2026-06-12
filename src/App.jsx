import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const CHECKWX_KEY = import.meta.env.VITE_CHECKWX_API_KEY;
const CHECKWX_BASE = "https://api.checkwx.com/v2";

const EXPERTS = ["RandomForest", "XGBoost"];

const VFR_BANDS = [
  {
    label: "LIFR",
    max: 800,
    active: "border-red-500 bg-red-500/10 text-red-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
  {
    label: "IFR",
    max: 1600,
    active: "border-orange-500 bg-orange-500/10 text-orange-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
  {
    label: "MVFR",
    max: 4800,
    active: "border-blue-500 bg-blue-500/10 text-blue-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
  {
    label: "VFR",
    max: 10000,
    active: "border-green-500 bg-green-500/10 text-green-400",
    inactive: "border-neutral-800 bg-neutral-900 text-neutral-600",
  },
];

function getBand(v) {
  return VFR_BANDS.find((b) => v <= b.max) || VFR_BANDS[3];
}

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  useEffect(() => {
    if (target === null) return;
    setValue(0);
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);
  return value;
}

const celsiusDiffToFahr = (c) => +((c * 9) / 5).toFixed(1);

function buildPayload(metar) {
  const now = new Date();
  const temp = metar?.temperature?.celsius ?? null;
  const dewpoint = metar?.dewpoint?.celsius ?? null;
  const dewDep = temp !== null && dewpoint !== null ? temp - dewpoint : null;
  const wetBulbDep = dewDep !== null ? +(dewDep * 0.6).toFixed(1) : null;

  return {
    StationPressure: metar?.pressure?.hg ?? null, // v2: pressure.hg (already inHg)
    WindSpeed: metar?.wind?.speed?.kts ?? null, // v2: wind.speed.kts
    WindDirection: metar?.wind?.degrees ?? null,
    Precip: 0.0,
    DewPointDepression: dewDep !== null ? celsiusDiffToFahr(dewDep) : null,
    WetBulbDepression:
      wetBulbDep !== null ? celsiusDiffToFahr(wetBulbDep) : null,
    RelativeHumidity: metar?.humidity ?? null, // v2: humidity (plain int)
    Visibility_Lag1: metar?.visibility?.meters ?? null,
    Visibility_Trend: 0,
    month: now.getUTCMonth() + 1,
    hour: now.getUTCHours(),
  };
}

// helper to build a CheckWX v2 URL with the API key as query param
function cxUrl(path) {
  return `${CHECKWX_BASE}${path}?x-api-key=${CHECKWX_KEY}`;
}

// ─── Hardcoded Indian airports ────────────────────────────────────────────────
const INDIAN_AIRPORTS = [
  {
    icao: "VIDP",
    name: "Indira Gandhi International Airport",
    city: "New Delhi",
  },
  {
    icao: "VABB",
    name: "Chhatrapati Shivaji Maharaj International Airport",
    city: "Mumbai",
  },
  { icao: "VOMM", name: "Chennai International Airport", city: "Chennai" },
  { icao: "VOBL", name: "Kempegowda International Airport", city: "Bengaluru" },
  {
    icao: "VECC",
    name: "Netaji Subhas Chandra Bose International Airport",
    city: "Kolkata",
  },
  {
    icao: "VOHY",
    name: "Rajiv Gandhi International Airport",
    city: "Hyderabad",
  },
  {
    icao: "VAAH",
    name: "Sardar Vallabhbhai Patel International Airport",
    city: "Ahmedabad",
  },
  { icao: "VOGO", name: "Dabolim Airport", city: "Goa" },
  { icao: "VOCL", name: "Calicut International Airport", city: "Kozhikode" },
  { icao: "VOCI", name: "Cochin International Airport", city: "Kochi" },
  {
    icao: "VOTV",
    name: "Trivandrum International Airport",
    city: "Thiruvananthapuram",
  },
  { icao: "VOKN", name: "Kannur International Airport", city: "Kannur" },
  { icao: "VOVZ", name: "Visakhapatnam Airport", city: "Visakhapatnam" },
  { icao: "VOBZ", name: "Vijayawada Airport", city: "Vijayawada" },
  {
    icao: "VOTR",
    name: "Tiruchirappalli International Airport",
    city: "Tiruchirappalli",
  },
  {
    icao: "VANP",
    name: "Dr. Babasaheb Ambedkar International Airport",
    city: "Nagpur",
  },
  { icao: "VAPO", name: "Pune Airport", city: "Pune" },
  { icao: "VABP", name: "Raja Bhoj Airport", city: "Bhopal" },
  { icao: "VASU", name: "Surat Airport", city: "Surat" },
  { icao: "VABO", name: "Vadodara Airport", city: "Vadodara" },
  { icao: "VEJP", name: "Jaipur International Airport", city: "Jaipur" },
  {
    icao: "VILK",
    name: "Chaudhary Charan Singh International Airport",
    city: "Lucknow",
  },
  {
    icao: "VIAR",
    name: "Sri Guru Ram Dass Jee International Airport",
    city: "Amritsar",
  },
  { icao: "VICG", name: "Chandigarh Airport", city: "Chandigarh" },
  {
    icao: "VIBN",
    name: "Lal Bahadur Shastri International Airport",
    city: "Varanasi",
  },
  {
    icao: "VIST",
    name: "Sheikh ul-Alam International Airport",
    city: "Srinagar",
  },
  { icao: "VIDN", name: "Jolly Grant Airport", city: "Dehradun" },
  { icao: "VIUD", name: "Maharana Pratap Airport", city: "Udaipur" },
  { icao: "VIJO", name: "Jodhpur Airport", city: "Jodhpur" },
  { icao: "VIAG", name: "Agra Airport", city: "Agra" },
  { icao: "VIAL", name: "Prayagraj Airport", city: "Prayagraj" },
  {
    icao: "VEPT",
    name: "Jay Prakash Narayan International Airport",
    city: "Patna",
  },
  {
    icao: "VEBG",
    name: "Biju Patnaik International Airport",
    city: "Bhubaneswar",
  },
  { icao: "VEBD", name: "Bagdogra Airport", city: "Siliguri" },
  { icao: "VEIM", name: "Imphal Airport", city: "Imphal" },
  { icao: "VEMN", name: "Dibrugarh Airport", city: "Dibrugarh" },
  { icao: "VEPU", name: "Agartala Airport", city: "Agartala" },
  {
    icao: "VEPB",
    name: "Veer Savarkar International Airport",
    city: "Port Blair",
  },
  { icao: "VEGY", name: "Gaya Airport", city: "Gaya" },
  { icao: "VOMY", name: "Mysore Airport", city: "Mysuru" },
  { icao: "VOKU", name: "Hubli Airport", city: "Hubballi" },
  { icao: "VOTX", name: "Tuticorin Airport", city: "Thoothukudi" },
  { icao: "VEMR", name: "Dimapur Airport", city: "Dimapur" },
  { icao: "VEGK", name: "Gorakhpur Airport", city: "Gorakhpur" },
  { icao: "VEJH", name: "Jharsuguda Airport", city: "Jharsuguda" },
];

// ─── Step 1: Airport selector ─────────────────────────────────────────────────
function AirportSearch({ onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = INDIAN_AIRPORTS.filter((a) => {
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
          Select an Indian airport to fetch live weather and predict visibility.
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
    WindSpeed: { label: "Wind Speed", unit: "kts" },
    WindDirection: { label: "Wind Direction", unit: "°" },
    Precip: { label: "Precipitation", unit: "in" },
    DewPointDepression: { label: "Dew Point Depression", unit: "°F" },
    WetBulbDepression: { label: "Wet Bulb Depression", unit: "°F" },
    RelativeHumidity: { label: "Relative Humidity", unit: "%" },
    Visibility_Lag1: { label: "Current Visibility", unit: "m" },
    Visibility_Trend: { label: "Visibility Trend", unit: "m" },
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
                {displayed.toLocaleString()}
              </span>
              <span className="text-3xl text-neutral-500">m</span>
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
