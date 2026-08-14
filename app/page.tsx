"use client";

import { FormEvent, useState } from "react";

type MeasurementResult = {
  filename: string;
  duration_s: number;
  average_power_w: number;
  total_energy_j: number;
  energy_by_rail_j: Record<string, number>;
};

type RailComparison = {
  measurement1_j: number;
  measurement2_j: number;
  difference_j: number;
  percentage_change: number;
};

type SingleResult = {
  mode: "single";
  measurement1: MeasurementResult;
};

type ComparisonResult = {
  mode: "comparison";
  measurement1: MeasurementResult;
  measurement2: MeasurementResult;
  comparison: {
    energy_difference_j: number;
    percentage_change: number;
    average_power_difference_w: number;
    rail_comparison: Record<string, RailComparison>;
  };
};

type AnalysisResult = SingleResult | ComparisonResult;

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const [compareMode, setCompareMode] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file1) {
      setError("Choose a CSV log file first.");
      return;
    }

    if (compareMode && !file2) {
      setError("Choose a second CSV log file for comparison.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("file1", file1);

      if (compareMode && file2) {
        formData.append("file2", file2);
      }

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

  function resetComparison() {
    setCompareMode(false);
    setFile2(null);
    setResult(null);
    setError("");
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
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div>
              <p className="eyebrow">
                MEASUREMENT 1
              </p>

              <label className="upload">
                <span>
                  {file1
                    ? file1.name
                    : "Choose a CSV log file"}
                </span>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setFile1(
                      event.target.files?.[0] ?? null
                    );

                    setError("");
                    setResult(null);
                  }}
                />
              </label>
            </div>

            {!compareMode && (
              <button
                type="button"
                onClick={() => {
                  setCompareMode(true);
                  setResult(null);
                  setError("");
                }}
                style={{
                  minHeight: "48px",
                  background: "transparent",
                  color: "#172033",
                  border: "1px solid #d6dce8",
                }}
              >
                + Compare with another log
              </button>
            )}

            {compareMode && (
              <div>
                <p className="eyebrow">
                  MEASUREMENT 2
                </p>

                <label className="upload">
                  <span>
                    {file2
                      ? file2.name
                      : "Choose second CSV log file"}
                  </span>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      setFile2(
                        event.target.files?.[0] ?? null
                      );

                      setError("");
                      setResult(null);
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={resetComparison}
                  style={{
                    marginTop: "12px",
                    background: "transparent",
                    color: "#68748a",
                    padding: 0,
                  }}
                >
                  Remove comparison
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={
                !file1 ||
                loading ||
                (compareMode && !file2)
              }
              style={{
                minHeight: "58px",
              }}
            >
              {loading
                ? "Analyzing..."
                : compareMode
                  ? "Compare logs"
                  : "Analyze log"}
            </button>
          </div>
        </form>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </section>

      {result?.mode === "single" && (
        <SingleAnalysis
          measurement={result.measurement1}
        />
      )}

      {result?.mode === "comparison" && (
        <ComparisonAnalysis
          result={result}
        />
      )}
    </main>
  );
}

function SingleAnalysis({
  measurement,
}: {
  measurement: MeasurementResult;
}) {
  return (
    <>
      <section className="summary">
        <article className="metric">
          <span>Duration</span>
          <strong>
            {measurement.duration_s.toFixed(1)} s
          </strong>
        </article>

        <article className="metric">
          <span>Average power</span>
          <strong>
            {measurement.average_power_w.toFixed(2)} W
          </strong>
        </article>

        <article className="metric">
          <span>Total energy</span>
          <strong>
            {measurement.total_energy_j.toFixed(1)} J
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
            {measurement.filename}
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
                measurement.energy_by_rail_j
              )
                .sort((a, b) => b[1] - a[1])
                .map(([rail, energy]) => (
                  <tr key={rail}>
                    <td>{rail}</td>

                    <td>
                      {energy.toFixed(1)}
                    </td>

                    <td>
                      {measurement.total_energy_j > 0
                        ? (
                            (energy /
                              measurement.total_energy_j) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ComparisonAnalysis({
  result,
}: {
  result: ComparisonResult;
}) {
  const {
    measurement1,
    measurement2,
    comparison,
  } = result;

  const isReduction =
    comparison.energy_difference_j < 0;

  const absoluteDifference = Math.abs(
    comparison.energy_difference_j
  );

  const absolutePercentage = Math.abs(
    comparison.percentage_change
  );

  const railEntries = Object.entries(
    comparison.rail_comparison
  ).sort(
    (a, b) =>
      Math.abs(b[1].difference_j) -
      Math.abs(a[1].difference_j)
  );

  return (
    <>
      <section className="card">
        <p className="eyebrow">
          COMPARISON
        </p>

        <h2>
          {measurement1.filename}
          {" vs "}
          {measurement2.filename}
        </h2>
      </section>

      <section className="summary">
        <article className="metric">
          <span>
            {measurement1.filename}
          </span>

          <strong>
            {measurement1.total_energy_j.toFixed(1)} J
          </strong>

          <p
            style={{
              marginBottom: 0,
              color: "#68748a",
            }}
          >
            {measurement1.average_power_w.toFixed(2)} W
            average
          </p>
        </article>

        <article className="metric">
          <span>
            {measurement2.filename}
          </span>

          <strong>
            {measurement2.total_energy_j.toFixed(1)} J
          </strong>

          <p
            style={{
              marginBottom: 0,
              color: "#68748a",
            }}
          >
            {measurement2.average_power_w.toFixed(2)} W
            average
          </p>
        </article>

        <article className="metric">
          <span>
            Energy change
          </span>

          <strong>
            {comparison.percentage_change > 0
              ? "+"
              : ""}
            {comparison.percentage_change.toFixed(1)}%
          </strong>

          <p
            style={{
              marginBottom: 0,
              color: "#68748a",
            }}
          >
            {comparison.energy_difference_j > 0
              ? "+"
              : ""}
            {comparison.energy_difference_j.toFixed(1)} J
          </p>
        </article>
      </section>

      <section className="card">
        <p className="eyebrow">
          SUMMARY
        </p>

        <h2>
          {isReduction
            ? "Lower energy consumption"
            : comparison.energy_difference_j > 0
              ? "Higher energy consumption"
              : "No energy difference"}
        </h2>

        <p className="intro">
          {measurement2.filename} consumed{" "}
          <strong>
            {absoluteDifference.toFixed(1)} J
          </strong>{" "}
          {isReduction ? "less" : "more"} energy than{" "}
          {measurement1.filename}, corresponding to{" "}
          <strong>
            {absolutePercentage.toFixed(1)}%
          </strong>{" "}
          {isReduction ? "lower" : "higher"} energy
          consumption.
        </p>
      </section>

      <section className="card">
        <div className="resultsHeader">
          <div>
            <p className="eyebrow">
              DETAILED COMPARISON
            </p>

            <h2>Energy by rail</h2>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Rail</th>
                <th>
                  {measurement1.filename}
                </th>
                <th>
                  {measurement2.filename}
                </th>
                <th>Difference</th>
                <th>Change</th>
              </tr>
            </thead>

            <tbody>
              {railEntries.map(
                ([rail, values]) => (
                  <tr key={rail}>
                    <td>{rail}</td>

                    <td>
                      {values.measurement1_j.toFixed(1)} J
                    </td>

                    <td>
                      {values.measurement2_j.toFixed(1)} J
                    </td>

                    <td>
                      {values.difference_j > 0
                        ? "+"
                        : ""}
                      {values.difference_j.toFixed(1)} J
                    </td>

                    <td>
                      {values.percentage_change > 0
                        ? "+"
                        : ""}
                      {values.percentage_change.toFixed(1)}%
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}