# EnergyLogger Analyzer

EnergyLogger Analyzer is a small Next.js + FastAPI web application for analysing
energy measurements collected with EnergyLogger.

The application can analyse a single EnergyLogger CSV measurement or compare two
measurements to investigate differences in energy consumption, average power,
duration, and energy consumption for individual measurement rails.

## Features

### Analyse a single measurement

Upload an EnergyLogger CSV file in the browser and calculate:

- measurement duration in seconds
- average power in watts
- total energy consumption in joules
- energy consumption in joules for each rail
- each rail's percentage of total energy consumption

The analysis keeps only measurement rows where:

```text
active == 1
```

Instantaneous power is calculated as:

```text
power = current × voltage
```

Energy consumption is calculated by integrating power over time using the
trapezoidal rule.

### Compare two measurements

The comparison page allows two EnergyLogger CSV files to be uploaded and
analysed together.

The comparison reports:

- total energy for each measurement
- difference in total energy
- percentage change in energy consumption
- average power for each measurement
- difference in average power
- duration for each measurement
- difference in duration
- energy consumption for individual rails
- difference and percentage change for each rail

This makes it possible to compare the energy impact of different software,
configurations, workloads, or experiments.

## Architecture

EnergyLogger Analyzer uses:

- **Next.js** for the frontend
- **FastAPI** for the analysis API
- **pandas** for processing measurement data
- **SciPy / NumPy** for numerical analysis
- **Vercel** for deployment
- **Vercel Blob** for temporary storage during two-file comparisons

For single-file analysis, the CSV file is sent directly to the FastAPI analysis
endpoint.

For comparison, the browser uploads the two CSV files temporarily to a private
Vercel Blob store. The FastAPI comparison endpoint retrieves the files,
performs the analysis, returns the comparison results, and removes the
temporary files.

## Prerequisites

- Node.js 20+
- Python 3.12+
- Vercel CLI

Install the Vercel CLI globally:

```bash
npm install -g vercel
```

## Install JavaScript dependencies

From the project root:

```bash
npm install
```

## Install Python dependencies

Create and activate a Python virtual environment if desired, then run:

```bash
pip install -e .
```

## Environment variables

The comparison feature uses Vercel Blob.

The following environment variables are required:

```text
BLOB_STORE_ID
BLOB_READ_WRITE_TOKEN
BLOB_WEBHOOK_PUBLIC_KEY
```

Do not commit the values of these variables to GitHub.

For local development, Vercel environment variables can be pulled into
`.env.local` using:

```bash
vercel env pull .env.local
```

Make sure `.env.local` is included in `.gitignore`.

## Run locally

To run the application using the Vercel development environment:

```bash
vercel dev
```

Then open:

```text
http://localhost:3000
```

### Application pages

Single measurement analysis:

```text
http://localhost:3000
```

Measurement comparison:

```text
http://localhost:3000/compare
```

### API endpoints

Health check:

```text
GET /api
```

Analyse a single CSV measurement:

```text
POST /api/analyze
```

Compare two uploaded measurements:

```text
POST /api/compare
```

## Why the code says "Total Power"

Current × voltage produces power in watts:

```text
P = I × V
```

Integrating power over time produces energy in joules:

```text
E = ∫ P dt
```

The original EnergyLogger analysis script called the instantaneous sum
`Total Energy`.

EnergyLogger Analyzer instead refers to the instantaneous value as
`Total Power` and uses `total_energy_j` only for energy calculated through
numerical integration.

This keeps the terminology consistent with the physical distinction between
power and energy.

## Deployment

The application is deployed on Vercel:

```text
https://energylogger-analyzer.vercel.app
```

The comparison interface is available at:

```text
https://energylogger-analyzer.vercel.app/compare
```

## Privacy and temporary files

Single-file analysis processes the uploaded CSV directly through the API.

Two-file comparison temporarily stores uploaded CSV files in a private Vercel
Blob store so that the FastAPI backend can retrieve both measurements.

The comparison endpoint attempts to delete the temporary Blob files after the
analysis has completed.

Measurement files should therefore not be treated as permanent application
storage.

## Possible future improvements

- Add a power-over-time chart
- Add a rail energy comparison chart
- Add CSV/JSON export of analysis results
- Allow users to assign descriptive names to measurements
- Improve comparison visualisations
- Add automated tests using known EnergyLogger measurements
- Add validation for different EnergyLogger CSV formats
- Add additional statistical comparison metrics