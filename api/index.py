from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile

from api.analyzer import analyze_energy


app = FastAPI(title="EnergyLogger Analyzer")


@app.get("/api")
def home():
    return {
        "status": "ok",
        "message": "EnergyLogger Analyzer API is running",
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file.",
        )

    try:
        contents = await file.read()

        if not contents:
            raise ValueError("The uploaded CSV file is empty.")

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