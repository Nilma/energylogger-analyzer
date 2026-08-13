# EnergyLogger Analyzer

A small Next.js + FastAPI application for uploading an energy measurement CSV
and calculating energy consumption for each measurement rail.

## What the first version does

- Upload a CSV log in the browser
- Keep only rows where `active == 1`
- Calculate instantaneous power as `current × voltage`
- Integrate power over `duration_s` using the trapezoidal rule
- Report:
  - duration in seconds
  - average power in watts
  - total energy in joules
  - energy in joules for each rail
  - each rail's percentage of total energy

## Prerequisites

- Node.js
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

Create and activate a virtual environment if you want one, then run:

```bash
pip install -e .
```

## Run locally exactly like Vercel

From the project root:

```bash
vercel dev
```

Then open:

```text
http://localhost:3000
```

The API health endpoint is:

```text
http://localhost:3000/api
```

The upload endpoint is:

```text
POST http://localhost:3000/api/analyze
```

## Why the code says "Total Power"

Current × voltage produces power in watts. Integrating power over time produces
energy in joules. The original script called the instantaneous sum
`Total Energy`; this version calls it `Total Power` and uses `total_energy_j`
only after numerical integration.

## Next steps

After verifying the calculations against known log files:

1. Add a power-over-time chart.
2. Add a rail energy bar chart.
3. Add CSV/JSON export.
4. Push the project to GitHub.
5. Import the GitHub repository into Vercel and deploy.
