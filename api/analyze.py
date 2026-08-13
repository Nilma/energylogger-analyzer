from io import BytesIO

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile

from api.analyzer import analyze_energy

app = FastAPI()


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
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

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )