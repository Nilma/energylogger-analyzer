from io import BytesIO
import os
import httpx
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from vercel.blob import AsyncBlobClient

from api.analyzer import analyze_energy


app = FastAPI(title="EnergyLogger Analyzer")


class CompareRequest(BaseModel):
    file1_pathname: str
    file2_pathname: str
    file1_name: str
    file2_name: str


async def read_private_blob(
    client: AsyncBlobClient,
    pathname: str,
) -> bytes:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")

    if not token:
        raise ValueError(
            "BLOB_READ_WRITE_TOKEN is not configured."
        )

    # Get the private Blob URL from its metadata
    blob = await client.head(pathname)

    if not blob or not blob.url:
        raise ValueError(
            f"Unable to locate uploaded file: {pathname}"
        )

    async with httpx.AsyncClient(
        timeout=60.0
    ) as http_client:
        response = await http_client.get(
            blob.url,
            headers={
                "Authorization": f"Bearer {token}",
            },
        )

    if response.status_code != 200:
        raise ValueError(
            f"Unable to download uploaded file: "
            f"{pathname}. "
            f"Status code: {response.status_code}"
        )

    if not response.content:
        raise ValueError(
            f"Uploaded file had no content: {pathname}"
        )

    return response.content


@app.get("/api")
def home():
    return {
        "status": "ok",
        "message": "EnergyLogger Analyzer API is running",
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if (
        not file.filename
        or not file.filename.lower().endswith(".csv")
    ):
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
            detail=(
                "The uploaded file could not "
                "be parsed as CSV."
            ),
        ) from exc

    except (
        ValueError,
        TypeError,
        KeyError,
    ) as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@app.post("/api/compare")
async def compare(request: CompareRequest):
    client = AsyncBlobClient()

    try:
        print(
            "Starting comparison:",
            request.file1_pathname,
            request.file2_pathname,
        )

        contents1 = await read_private_blob(
            client,
            request.file1_pathname,
        )

        print(
            "Downloaded measurement 1:",
            len(contents1),
            "bytes",
        )

        contents2 = await read_private_blob(
            client,
            request.file2_pathname,
        )

        print(
            "Downloaded measurement 2:",
            len(contents2),
            "bytes",
        )

        df1 = pd.read_csv(
            BytesIO(contents1)
        )

        df2 = pd.read_csv(
            BytesIO(contents2)
        )

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
            energy1 = result1[
                "energy_by_rail_j"
            ][rail]

            energy2 = result2[
                "energy_by_rail_j"
            ].get(
                rail,
                0,
            )

            difference = (
                energy2 - energy1
            )

            if energy1 != 0:
                rail_percentage_change = (
                    difference / energy1
                ) * 100
            else:
                rail_percentage_change = 0

            rail_comparison[rail] = {
                "measurement1_j": round(
                    energy1,
                    3,
                ),
                "measurement2_j": round(
                    energy2,
                    3,
                ),
                "difference_j": round(
                    difference,
                    3,
                ),
                "percentage_change": round(
                    rail_percentage_change,
                    2,
                ),
            }

        return {
            "measurement1": {
                "filename": request.file1_name,
                **result1,
            },

            "measurement2": {
                "filename": request.file2_name,
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
            detail=(
                "One of the uploaded files "
                "could not be parsed as CSV."
            ),
        ) from exc

    except (
        ValueError,
        TypeError,
        KeyError,
    ) as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        import traceback

        print("COMPARE ERROR:")
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "error": type(exc).__name__,
                "message": str(exc),
            },
        )

    finally:
        try:
            await client.delete(
                [
                    request.file1_pathname,
                    request.file2_pathname,
                ]
            )

            print(
                "Temporary blobs deleted."
            )

        except Exception as delete_error:
            print(
                "Unable to delete temporary blobs:",
                delete_error,
            )