from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io
import math
from pyampute.exploration.mcar_statistical_tests import MCARTest

router = APIRouter()

def get_uploaded_dataframe(request: Request):
    df = getattr(request.app.state, "df", None)
    if df is None:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "No data available."})
    if df.empty:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "Data is empty."})
    
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

def clear_missing_mechanism_cache(request: Request):
    """
    Helper function to clear the cached missing data mechanism.
    Should be called when the dataframe changes.
    """
    if hasattr(request.app.state, "missing_data_mechanism"):
        delattr(request.app.state, "missing_data_mechanism")

def get_cached_missing_mechanism(request: Request):
    """
    Helper function to get cached missing data mechanism or fetch if not available.
    Returns the mechanism data or None if not available/calculable.
    """
    # Check if mechanism is already cached
    cached_mechanism = getattr(request.app.state, "missing_data_mechanism", None)
    if cached_mechanism is not None:
        return cached_mechanism
    
    # If not cached, calculate and cache it
    df, error = get_uploaded_dataframe(request)
    if error:
        return None
    
    try:
        mt = MCARTest(method="little")
        p_value = mt.little_mcar_test(df)
    except Exception as e:
        # Cache the error state to avoid repeated calculations
        request.app.state.missing_data_mechanism = {
            "success": False,
            "message": f"Error running MCAR test: {str(e)}",
            "p_value": None,
            "mechanism_acronym": None,
            "mechanism_full": None
        }
        return request.app.state.missing_data_mechanism
    
    if p_value is None or (isinstance(p_value, float) and (math.isnan(p_value) or math.isinf(p_value))):
        mechanism_data = {
            "success": False,
            "message": "Could not determine missing data mechanism (test returned NaN or invalid value).",
            "p_value": None,
            "mechanism_acronym": None,
            "mechanism_full": None
        }
    else:
        if p_value < 0.05:
            mechanism_acronym = "MAR or MNAR"
            mechanism_full = "(Missing at Random or Missing Not at Random)"
        else:
            mechanism_acronym = "MCAR"
            mechanism_full = "(Missing Completely at Random)"
        
        mechanism_data = {
            "success": True,
            "mechanism_acronym": mechanism_acronym,
            "mechanism_full": mechanism_full,
            "p_value": float(p_value)
        }
    
    # Cache the result
    request.app.state.missing_data_mechanism = mechanism_data
    return mechanism_data

@router.get("/api/missing-mechanism")
def missing_mechanism(request: Request):
    mechanism_data = get_cached_missing_mechanism(request)
    if mechanism_data is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data available."})
    
    if not mechanism_data["success"]:
        return JSONResponse(status_code=200, content=mechanism_data)
    
    return mechanism_data 