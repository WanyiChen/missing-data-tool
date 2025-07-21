from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io

router = APIRouter()

@router.get("/api/case-count")
def case_count(request: Request):
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    print(f"Latest File: {filename}")
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(file))
        else:
            df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})
    total_cases = len(df)
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = df.isnull().sum().sum()
    missing_percentage = (missing_cells / total_cells * 100) if total_cells > 0 else 0
    return {
        "success": True,
        "total_cases": int(total_cases),
        "missing_percentage": round(missing_percentage, 2)
    }

@router.get("/api/feature-count")
def feature_count(request: Request):
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(file))
        else:
            df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})
    total_features = df.shape[1]
    result = df.isnull().any(axis=0)
    if isinstance(result, bool):
        features_with_missing = int(result)
    else:
        features_with_missing = int(result.sum())
    missing_feature_percentage = (features_with_missing / total_features * 100) if total_features > 0 else 0
    return {
        "success": True,
        "features_with_missing": features_with_missing,
        "missing_feature_percentage": round(missing_feature_percentage, 2)
    } 