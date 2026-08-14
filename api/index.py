from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile

from api.analyzer import analyze_energy


app = FastAPI(title="EnergyLogger Analyzer")


# --------------------------------
# Test route
# --------------------------------

@app.get("/api")
def home():
    return {
        "status": "ok",
        "message": "EnergyLogger Analyzer API is running",
    }


# --------------------------------
# Version 1 - Single file analysis
# --------------------------------

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was selected.",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file.",
        )

    try:
        contents = await file.read()

        if not contents:
            raise ValueError(
                "The uploaded CSV file is empty."
            )

        df = pd.read_csv(BytesIO(contents))

        result = analyze_energy(df)

        return {
            "filename": file.filename,
            **result,
        }

    except pd.errors.ParserError as exc:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file could not be parsed as CSV.",
        ) from exc

    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

# --------------------------------
# VERSION 2
# Compare TWO measurements
# --------------------------------
@app.post("/api/compare")
async def compare(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
):
    try:
        if not file1.filename or not file1.filename.lower().endswith(".csv"):
            raise ValueError("Measurement 1 must be a CSV file.")

        if not file2.filename or not file2.filename.lower().endswith(".csv"):
            raise ValueError("Measurement 2 must be a CSV file.")

        contents1 = await file1.read()
        contents2 = await file2.read()

        if not contents1:
            raise ValueError("Measurement 1 is empty.")

        if not contents2:
            raise ValueError("Measurement 2 is empty.")

        df1 = pd.read_csv(BytesIO(contents1))
        df2 = pd.read_csv(BytesIO(contents2))

        result1 = analyze_energy(df1)
        result2 = analyze_energy(df2)

        energy_difference = (
            result2["total_energy_j"]
            - result1["total_energy_j"]
        )

        if result1["total_energy_j"] != 0:
            percentage_change = (
                energy_difference
                / result1["total_energy_j"]
            ) * 100
        else:
            percentage_change = 0

        average_power_difference = (
            result2["average_power_w"]
            - result1["average_power_w"]
        )

        duration_difference = (
            result2["duration_s"]
            - result1["duration_s"]
        )

        rail_comparison = {}

        for rail in result1["energy_by_rail_j"]:
            energy1 = result1["energy_by_rail_j"][rail]
            energy2 = result2["energy_by_rail_j"].get(rail, 0)

            difference = energy2 - energy1

            if energy1 != 0:
                rail_percentage_change = (
                    difference / energy1
                ) * 100
            else:
                rail_percentage_change = 0

            rail_comparison[rail] = {
                "measurement1_j": round(energy1, 3),
                "measurement2_j": round(energy2, 3),
                "difference_j": round(difference, 3),
                "percentage_change": round(
                    rail_percentage_change,
                    2,
                ),
            }

        return {
            "measurement1": {
                "filename": file1.filename,
                **result1,
            },

            "measurement2": {
                "filename": file2.filename,
                **result2,
            },

            "comparison": {
                "energy_difference_j": round(
                    energy_difference,
                    3,
                ),
                "percentage_change": round(
                    percentage_change,
                    2,
                ),
                "average_power_difference_w": round(
                    average_power_difference,
                    3,
                ),
                "duration_difference_s": round(
                    duration_difference,
                    3,
                ),
                "rail_comparison": rail_comparison,
            },
        }

    except pd.errors.ParserError as exc:
        raise HTTPException(
            status_code=400,
            detail="One of the uploaded files could not be parsed as CSV.",
        ) from exc

    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc