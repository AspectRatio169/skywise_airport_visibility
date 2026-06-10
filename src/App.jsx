import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const FIELDS = [
  {
    key: "StationPressure",
    label: "Station Pressure",
    unit: "inHg",
    placeholder: "29.92",
    step: 0.01,
  },
  {
    key: "WindSpeed",
    label: "Wind Speed",
    unit: "kts",
    placeholder: "10",
    step: 0.1,
  },
  {
    key: "WindDirection",
    label: "Wind Direction",
    unit: "°",
    placeholder: "180",
    step: 1,
  },
  {
    key: "Precip",
    label: "Precipitation",
    unit: "in",
    placeholder: "0.00",
    step: 0.01,
  },
  {
    key: "DewPointDepression",
    label: "Dew Point Depression",
    unit: "°F",
    placeholder: "5.0",
    step: 0.1,
  },
  {
    key: "WetBulbDepression",
    label: "Wet Bulb Depression",
    unit: "°F",
    placeholder: "3.0",
    step: 0.1,
  },
  {
    key: "RelativeHumidity",
    label: "Relative Humidity",
    unit: "%",
    placeholder: "75",
    step: 1,
  },
  {
    key: "Visibility_Lag1",
    label: "Previous Visibility",
    unit: "m",
    placeholder: "5000",
    step: 1,
  },
  {
    key: "Visibility_Trend",
    label: "Visibility Trend",
    unit: "m",
    placeholder: "100",
    step: 1,
  },
  { key: "month", label: "Month", unit: "1–12", placeholder: "6", step: 1 },
  {
    key: "hour",
    label: "Hour (UTC)",
    unit: "0–23",
    placeholder: "14",
    step: 1,
  },
];

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

export default function App() {
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const displayed = useCountUp(result?.predicted_visibility ?? null);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setError(null);
    const payload = {};
    for (const f of FIELDS) {
      const v = ["month", "hour"].includes(f.key)
        ? parseInt(form[f.key])
        : parseFloat(form[f.key]);
      if (isNaN(v)) {
        setError(`"${f.label}" is required.`);
        return;
      }
      payload[f.key] = v;
    }
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const allFilled = FIELDS.every(
    (f) => form[f.key] !== undefined && form[f.key] !== "",
  );
  const band = result ? getBand(result.predicted_visibility) : null;

  return (
    <div
      className="min-h-screen bg-[#1a1a1a] text-neutral-200 px-6 py-10 flex flex-col items-center"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Header */}
        <div className="w-full text-center mb-8 pb-6 border-b border-neutral-800">
          <p className="text-xs tracking-widest text-neutral-500 uppercase mb-1">
            Mixture-of-Experts · v1.0
          </p>
          <h1 className="text-2xl font-normal text-white">
            Airport Visibility Predictor
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Enter observed weather conditions to predict runway visibility.
          </p>
        </div>

        {/* Table */}
        <table className="w-full mb-6 border-collapse">
          <tbody>
            {Array.from({ length: Math.ceil(FIELDS.length / 2) }, (_, i) => (
              <tr key={i}>
                {FIELDS.slice(i * 2, i * 2 + 2).map((f) => (
                  <td
                    key={f.key}
                    className="w-1/2 border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition-colors duration-200 p-6 text-center align-top"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <label className="text-xs tracking-widest text-neutral-400 uppercase whitespace-nowrap">
                        {f.label}{" "}
                        <span className="text-neutral-600 normal-case">
                          ({f.unit})
                        </span>
                      </label>
                      <input
                        type="number"
                        step={f.step}
                        placeholder={f.placeholder}
                        value={form[f.key] ?? ""}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className={`w-4/5 text-sm text-center px-3 py-2 rounded border outline-none placeholder-neutral-600 transition-all duration-200 ${
                          form[f.key]
                            ? "bg-neutral-950 border-neutral-500 text-white"
                            : "bg-neutral-800 border-neutral-700 text-neutral-300"
                        }`}
                        style={{
                          fontFamily: "'Courier New', Courier, monospace",
                        }}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Error */}
        {error && (
          <div className="w-full mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !allFilled}
          className="w-full py-3 text-sm tracking-widest uppercase border border-neutral-600 text-neutral-300 rounded hover:bg-neutral-800 hover:border-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {loading ? (
            <div className="w-full flex flex-col items-center justify-center py-8 overflow-hidden">
              <div className="relative w-full flex items-center justify-center h-12">
                <span
                  className="plane-fly text-2xl absolute"
                  style={{ fontFamily: "sans-serif" }}
                >
                  ✈
                </span>
              </div>
              <p className="text-xs tracking-widest text-neutral-500 uppercase mt-2">
                fetching prediction…
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-8 overflow-hidden">
              <p className="text-xs tracking-widest text-neutral-500 uppercase mt-2">
                get prediction
              </p>
            </div>
          )}
        </button>

        {/* Result */}
        {result && band && (
          <div className="w-full mt-6 border border-neutral-700 rounded-lg overflow-hidden">
            {/* Visibility readout */}
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

              {/* VFR band boxes */}
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

            {/* Cluster + Expert */}
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
      </div>
    </div>
  );
}
