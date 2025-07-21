from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io
import math
from pyampute.exploration.mcar_statistical_tests import MCARTest

router = APIRouter()

def get_uploaded_dataframe(request: Request):
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    if file is None:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(file))
        else:
            df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    if df.empty:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})
    return df, None

@router.get("/api/case-count")
def case_count(request: Request):
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
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
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
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

@router.get("/api/missing-mechanism")
def missing_mechanism(request: Request):
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    try:
        mt = MCARTest(method="little")
        p_value = mt.little_mcar_test(df)
        print(p_value)
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error running MCAR test: {str(e)}"})
    if p_value is None or (isinstance(p_value, float) and (math.isnan(p_value) or math.isinf(p_value))):
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "message": "Could not determine missing data mechanism (test returned NaN or invalid value).",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None
            }
        )
    if p_value < 0.05:
        mechanism_acronym = "MAR or MNAR"
        mechanism_full = "(Missing at Random or Missing Not at Random)"
    else:
        mechanism_acronym = "MCAR"
        mechanism_full = "(Missing Completely at Random)"
    return {"success": True, "mechanism_acronym": mechanism_acronym, "mechanism_full": mechanism_full, "p_value": float(p_value)} 