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

@router.get("/api/missing-mechanism")
def missing_mechanism(request: Request):
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    try:
        mt = MCARTest(method="little")
        p_value = mt.little_mcar_test(df)
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

@router.get("/api/missing-data-analysis")
def missing_data_analysis(request: Request):
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    # Analyze missing data patterns
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = df.isnull().sum().sum()
    
    # Count different types of missing values
    empty_strings = 0
    whitespace_only = 0
    null_values = missing_cells  # pandas null values
    
    # Check for empty strings and whitespace-only strings
    for col in df.columns:
        if df[col].dtype == 'object':  # string columns
            empty_strings += (df[col] == '').sum()
            whitespace_only += df[col].astype(str).str.strip().eq('').sum()
    
    # Calculate percentages
    missing_percentage = (missing_cells / total_cells * 100) if total_cells > 0 else 0
    empty_string_percentage = (empty_strings / total_cells * 100) if total_cells > 0 else 0
    whitespace_percentage = (whitespace_only / total_cells * 100) if total_cells > 0 else 0
    
    # Find columns with most missing data
    missing_by_column = df.isnull().sum().to_dict()
    columns_with_missing = {col: count for col, count in missing_by_column.items() if count > 0}
    
    # Sort columns by missing count
    sorted_columns = sorted(columns_with_missing.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "success": True,
        "total_cells": int(total_cells),
        "missing_cells": int(missing_cells),
        "missing_percentage": round(missing_percentage, 2),
        "missing_patterns": {
            "null_values": int(null_values),
            "empty_strings": int(empty_strings),
            "whitespace_only": int(whitespace_only)
        },
        "pattern_percentages": {
            "null_percentage": round((null_values / total_cells * 100) if total_cells > 0 else 0, 2),
            "empty_string_percentage": round(empty_string_percentage, 2),
            "whitespace_percentage": round(whitespace_percentage, 2)
        },
        "columns_with_missing": dict(sorted_columns[:10]),  # Top 10 columns with missing data
        "total_columns_with_missing": len(columns_with_missing)
    } 