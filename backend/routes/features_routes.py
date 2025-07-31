from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi import Body
import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any

router = APIRouter()

# In-memory override store for feature data types (for demonstration)
FEATURE_TYPE_OVERRIDES = {}

def get_uploaded_dataframe(request: Request):
    df = getattr(request.app.state, "df", None)
    if df is None:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "No data available."})
    if df.empty:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "Data is empty."})
    
    return df, None

@router.get("/api/missing-features-table")
def get_features_table(request: Request):
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    try:
        features_data = []
        
        for column in df.columns:
            # TODO: Calculate actual statistics
            # - Find most correlated feature with missingness pattern
            # - Test for informative missingness
            
            number_missing = df[column].isnull().sum()
            if number_missing == 0:
                continue
            # Use override if present, otherwise auto-detect
            data_type = FEATURE_TYPE_OVERRIDES.get(column)
            if data_type not in ("N", "C"):
                data_type = "N" if df[column].dtype in ['int64', 'float64'] else "C"
                
            feature_info = {
                "feature_name": column,
                "data_type": data_type,
                "number_missing": int(number_missing),
                "percentage_missing": round((number_missing / len(df)) * 100, 2),
                "most_correlated_with": None,  # TODO: Implement correlation analysis
                "informative_missingness": {
                    "is_informative": False,  # TODO: Implement statistical test
                    "p_value": 0.05  # TODO: Calculate actual p-value
                }
            }
            features_data.append(feature_info)

        request.app.state.features_data = features_data
        
        return {
            "success": True,
            "features": features_data
        }
    except Exception as e:
        return JSONResponse(
            status_code=500, 
            content={"success": False, "message": f"Error processing features: {str(e)}"}
        )

@router.patch("/api/features-table")
def patch_feature_data_type(request: Request, payload: dict = Body(...)):
    feature_name = payload.get("feature_name")
    new_type = payload.get("data_type")
    if new_type not in ("N", "C"):
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid data type. Must be 'N' or 'C'."})
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    if feature_name not in df.columns:
        return JSONResponse(status_code=404, content={"success": False, "message": f"Feature '{feature_name}' not found."})
    # Store override (in-memory for now; replace with persistent storage as needed)
    FEATURE_TYPE_OVERRIDES[feature_name] = new_type
    return {"success": True, "feature_name": feature_name, "data_type": new_type}