"use client";

import Link from "next/link";
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

type ComparisonResult = {
  measurement1: MeasurementResult;
  measurement2: MeasurementResult;

  comparison: {
    energy_difference_j: number;
    percentage_change: number;
    average_power_difference_w: number;
    duration_difference_s: number;
    rail_comparison: Record<string, RailComparison>;
  };
};

export default function ComparePage() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const [result, setResult] =
    useState<ComparisonResult | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!file1 || !file2) {
      setError("Choose two CSV log files to compare.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("file1", file1);
      formData.append("file2", file2);

      const response = await fetch("/api/compare", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          text || `Server error (${response.status})`
        );
      }

      if (!text) {
        throw new Error(
          "The server returned an empty response."
        );
      }

      const data = JSON.parse(text);

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Comparison failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">
          ENERGYLOGGER ANALYZER
        </p>

        <h1>Compare measurements</h1>

        <p className="intro">
          Upload two EnergyLogger CSV files to compare
          total energy, average power, duration, and
          energy consumption for each rail.
        </p>
      </section>

      <section className="card">
        <form onSubmit={handleSubmit}>
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
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
                    : "Choose first CSV log"}
                </span>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setFile1(
                      event.target.files?.[0] ?? null
                    );

                    setResult(null);
                    setError("");
                  }}
                />
              </label>
            </div>

            <div>
              <p className="eyebrow">
                MEASUREMENT 2
              </p>

              <label className="upload">
                <span>
                  {file2
                    ? file2.name
                    : "Choose second CSV log"}
                </span>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setFile2(
                      event.target.files?.[0] ?? null
                    );

                    setResult(null);
                    setError("");
                  }}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!file1 || !file2 || loading}
              style={{
                minHeight: "58px",
              }}
            >
              {loading
                ? "Comparing..."
                : "Compare measurements"}
            </button>
          </div>
        </form>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </section>

      <p
        style={{
          margin: "24px 0",
        }}
      >
        <Link href="/">
          ← Back to single analysis
        </Link>
      </p>

      {result && (
        <ComparisonResults result={result} />
      )}
    </main>
  );
}

function ComparisonResults({
  result,
}: {
  result: ComparisonResult;
}) {
  const {
    measurement1,
    measurement2,
    comparison,
  } = result;

  const difference =
    comparison.energy_difference_j;

  const percentage =
    comparison.percentage_change;

  const railEntries = Object.entries(
    comparison.rail_comparison
  ).sort(
    (a, b) =>
      Math.abs(b[1].difference_j) -
      Math.abs(a[1].difference_j)
  );

  const largestRailDifference =
    railEntries.length > 0
      ? railEntries[0]
      : null;

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

          <p>
            {measurement1.average_power_w.toFixed(2)} W
            average
          </p>

          <p>
            {measurement1.duration_s.toFixed(1)} s
          </p>
        </article>

        <article className="metric">
          <span>
            {measurement2.filename}
          </span>

          <strong>
            {measurement2.total_energy_j.toFixed(1)} J
          </strong>

          <p>
            {measurement2.average_power_w.toFixed(2)} W
            average
          </p>

          <p>
            {measurement2.duration_s.toFixed(1)} s
          </p>
        </article>

        <article className="metric">
          <span>Energy change</span>

          <strong>
            {percentage > 0 ? "+" : ""}
            {percentage.toFixed(1)}%
          </strong>

          <p>
            {difference > 0 ? "+" : ""}
            {difference.toFixed(1)} J
          </p>
        </article>
      </section>

      <section className="card">
        <p className="eyebrow">
          SUMMARY
        </p>

        <h2>
          {difference < 0
            ? "Measurement 2 consumed less energy"
            : difference > 0
              ? "Measurement 2 consumed more energy"
              : "Both measurements consumed the same energy"}
        </h2>

        {difference !== 0 && (
          <p className="intro">
            {measurement2.filename} consumed{" "}
            <strong>
              {Math.abs(difference).toFixed(1)} J
            </strong>{" "}
            {difference < 0 ? "less" : "more"} energy
            than {measurement1.filename}. This is a{" "}
            <strong>
              {Math.abs(percentage).toFixed(1)}%
            </strong>{" "}
            {difference < 0 ? "reduction" : "increase"}.
          </p>
        )}

        {largestRailDifference && (
          <p
            style={{
              marginTop: "18px",
              color: "#68748a",
            }}
          >
            Largest rail difference:{" "}
            <strong>
              {largestRailDifference[0]}
            </strong>{" "}
            (
            {largestRailDifference[1].difference_j > 0
              ? "+"
              : ""}
            {largestRailDifference[1].difference_j.toFixed(
              1
            )}{" "}
            J)
          </p>
        )}
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
                      {values.percentage_change.toFixed(
                        1
                      )}
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
  );
}