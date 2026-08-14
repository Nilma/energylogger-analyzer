from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile

from api.analyzer import analyze_energy


app = FastAPI(title="EnergyLogger Analyzer")


def read_csv(contents: bytes) -> pd.DataFrame:
    if not contents:
        raise ValueError("The uploaded CSV file is empty.")

    return pd.read_csv(BytesIO(contents))


@app.get("/api/analyze")
def test_api():
    return {
        "status": "ok",
        "message": "EnergyLogger Analyzer API is running",
    }


@app.post("/api/analyze")
async def analyze(
    file1: UploadFile = File(...),
    file2: UploadFile | None = File(None),
):
    try:
        if not file1.filename or not file1.filename.lower().endswith(".csv"):
            raise ValueError("Measurement 1 must be a CSV file.")

        contents1 = await file1.read()
        df1 = read_csv(contents1)
        result1 = analyze_energy(df1)

        response = {
            "mode": "single",
            "measurement1": {
                "filename": file1.filename,
                **result1,
            },
        }

        if file2 is not None:
            if not file2.filename or not file2.filename.lower().endswith(".csv"):
                raise ValueError("Measurement 2 must be a CSV file.")

            contents2 = await file2.read()
            df2 = read_csv(contents2)
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

            rail_comparison = {}

            for rail in result1["energy_by_rail_j"]:
                energy1 = result1["energy_by_rail_j"][rail]
                energy2 = result2["energy_by_rail_j"].get(rail, 0)

                difference = energy2 - energy1

                if energy1 != 0:
                    percent_change = (
                        difference / energy1
                    ) * 100
                else:
                    percent_change = 0

                rail_comparison[rail] = {
                    "measurement1_j": round(energy1, 3),
                    "measurement2_j": round(energy2, 3),
                    "difference_j": round(difference, 3),
                    "percentage_change": round(percent_change, 2),
                }

            response = {
                "mode": "comparison",
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
                    "rail_comparison": rail_comparison,
                },
            }

        return response

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