"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AnalysisResult = {
  filename: string;
  duration_s: number;
  average_power_w: number;
  total_energy_j: number;
  energy_by_rail_j: Record<string, number>;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a CSV log file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Analysis failed.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Analysis failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">
          ENERGY MEASUREMENT TOOL
        </p>

        <h1>EnergyLogger Analyzer</h1>

        <p className="intro">
          Upload an EnergyLogger CSV measurement file to
          calculate duration, average power, total energy,
          and energy consumption for each rail.
        </p>
      </section>

      <section className="card">
        <form onSubmit={handleSubmit}>
          <label className="upload">
            <span>
              {file
                ? file.name
                : "Choose a CSV log file"}
            </span>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(
                  event.target.files?.[0] ?? null
                );

                setError("");
                setResult(null);
              }}
            />
          </label>

          <button
            type="submit"
            disabled={!file || loading}
          >
            {loading
              ? "Analyzing..."
              : "Analyze log"}
          </button>
        </form>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </section>

      <section
        className="card"
        style={{
          textAlign: "center",
        }}
      >
        <p className="eyebrow">
          VERSION 2
        </p>

        <h2>Want to compare measurements?</h2>

        <p
          style={{
            color: "#68748a",
            marginBottom: "20px",
          }}
        >
          Compare two EnergyLogger CSV files side by side.
        </p>

        <Link
          href="/compare"
          style={{
            display: "inline-block",
            padding: "14px 22px",
            background: "#172033",
            color: "white",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Compare two measurements →
        </Link>
      </section>

      {result && (
        <>
          <section className="summary">
            <article className="metric">
              <span>Duration</span>

              <strong>
                {result.duration_s.toFixed(1)} s
              </strong>
            </article>

            <article className="metric">
              <span>Average power</span>

              <strong>
                {result.average_power_w.toFixed(2)} W
              </strong>
            </article>

            <article className="metric">
              <span>Total energy</span>

              <strong>
                {result.total_energy_j.toFixed(1)} J
              </strong>
            </article>
          </section>

          <section className="card">
            <div className="resultsHeader">
              <div>
                <p className="eyebrow">
                  RESULTS
                </p>

                <h2>Energy by rail</h2>
              </div>

              <span className="filename">
                {result.filename}
              </span>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Rail</th>
                    <th>Energy (J)</th>
                    <th>% of total</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(
                    result.energy_by_rail_j
                  )
                    .sort(
                      (a, b) =>
                        b[1] - a[1]
                    )
                    .map(
                      ([rail, energy]) => (
                        <tr key={rail}>
                          <td>{rail}</td>

                          <td>
                            {energy.toFixed(1)}
                          </td>

                          <td>
                            {result.total_energy_j > 0
                              ? (
                                  (energy /
                                    result.total_energy_j) *
                                  100
                                ).toFixed(1)
                              : "0.0"}
                            %
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}