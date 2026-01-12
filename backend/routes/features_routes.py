from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi import Body
import pandas as pd
from typing import Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.feature import (
    Feature, 
    FEATURE_CACHE, 
    get_feature_from_cache, 
    get_all_features_from_cache,
    initialize_feature_cache,
    calculate_feature_correlations_with_thresholds,
    calculate_informative_missingness
)

router = APIRouter()
def get_uploaded_dataframe(request: Request):
    df = getattr(request.app.state, "df", None)
    if df is None:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "No data available."})
    if df.empty:
        return None, JSONResponse(status_code=400, content={"success": False, "message": "Data is empty."})
    
    return df, None

@router.get("/api/missing-features-table")
def get_features_table(request: Request, page: int = 0, limit: int = 10):
    """Get paginated list of features with missing data."""
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    try:
        # Initialize cache if empty
        if not FEATURE_CACHE:
            initialize_feature_cache(df)
        
        # Get all features from cache and filter for those with missing data
        all_features = get_all_features_from_cache()
        missing_features = [feature for feature in all_features if feature.number_missing > 0]
        
        # Calculate pagination
        total_features = len(missing_features)
        start_idx = page * limit
        end_idx = start_idx + limit
        paginated_features = [feature.to_basic_dict() for feature in missing_features[start_idx:end_idx]]
        
        return {
            "success": True,
            "features": paginated_features,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_features,
                "total_pages": (total_features + limit - 1) // limit,
                "has_next": end_idx < total_features,
                "has_prev": page > 0
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=500, 
            content={"success": False, "message": f"Error processing features: {str(e)}"}
        )

@router.get("/api/complete-features-table")
def get_complete_features_table(request: Request, page: int = 0, limit: int = 10):
    """Get paginated list of features with complete data (no missing values)."""
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    try:
        # Initialize cache if empty
        if not FEATURE_CACHE:
            initialize_feature_cache(df)
        
        # Get all features from cache and filter for those with no missing data
        all_features = get_all_features_from_cache()
        complete_features = [feature for feature in all_features if feature.number_missing == 0]
        
        # Sort features alphabetically by name for consistent ordering
        complete_features.sort(key=lambda x: x.name)
        
        # Calculate pagination
        total_features = len(complete_features)
        start_idx = page * limit
        end_idx = start_idx + limit
        paginated_features = [feature.to_basic_dict() for feature in complete_features[start_idx:end_idx]]
        
        return {
            "success": True,
            "features": paginated_features,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_features,
                "total_pages": (total_features + limit - 1) // limit,
                "has_next": end_idx < total_features,
                "has_prev": page > 0
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=500, 
            content={"success": False, "message": f"Error processing complete features: {str(e)}"}
        )

@router.get("/api/feature-details/{feature_name}")
def get_feature_details(
    request: Request, 
    feature_name: str,
    pearson_threshold: float = 0.7,
    cramer_v_threshold: float = 0.7,
    eta_threshold: float = 0.7
):
    """Get complete details for a specific feature including correlation and informative missingness."""
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    # Initialize cache if empty
    if not FEATURE_CACHE:
        initialize_feature_cache(df)
    
    # Get feature from cache
    feature = get_feature_from_cache(feature_name)
    if not feature:
        return JSONResponse(
            status_code=404, 
            content={"success": False, "message": f"Feature '{feature_name}' not found."}
        )
    
    try:
        # Check if correlations need to be recalculated based on threshold changes
        current_thresholds = {
            "pearson_threshold": pearson_threshold,
            "cramer_v_threshold": cramer_v_threshold,
            "eta_threshold": eta_threshold
        }
        
        if feature.should_recalculate_correlations(current_thresholds):
            correlations_data = calculate_feature_correlations_with_thresholds(
                df, feature_name, pearson_threshold, cramer_v_threshold, eta_threshold
            )
            feature.set_correlated_features_with_thresholds(correlations_data, current_thresholds)
        
        # Calculate informative missingness if not already calculated
        if not feature.informative_calculated:
            informative_data = calculate_informative_missingness(df, feature_name)
            feature.set_informative_missingness(informative_data)
        
        return {
            "success": True,
            **feature.to_dict()
        }
    except Exception as e:
        return JSONResponse(
            status_code=500, 
            content={"success": False, "message": f"Error analyzing feature {feature_name}: {str(e)}"}
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
    
    # Initialize cache if empty
    if not FEATURE_CACHE:
        initialize_feature_cache(df)
    
    # Get feature from cache
    feature = get_feature_from_cache(feature_name)
    if not feature:
        return JSONResponse(status_code=404, content={"success": False, "message": f"Feature '{feature_name}' not found."})
    
    try:
        # Update the feature's data type - this will trigger the setter and clear related data
        old_type = feature.data_type
        feature.data_type = new_type
        
        return {
            "success": True, 
            "feature_name": feature_name, 
            "data_type": new_type,
            "previous_data_type": old_type,
            "message": f"Data type changed from {old_type} to {new_type}. Correlations and informative missingness data have been cleared and will be recalculated."
        }
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "message": str(e)})

@router.delete("/api/features-cache")
def clear_feature_cache():
    """Clear the feature cache."""
    FEATURE_CACHE.clear()
    return {"success": True, "message": "Feature cache cleared."}

@router.get("/api/features-cache/status")
def get_cache_status():
    """Get the status of the feature cache."""
    return {
        "success": True,
        "cache_size": len(FEATURE_CACHE),
        "cached_features": list(FEATURE_CACHE.keys()),
        "cache_initialized": len(FEATURE_CACHE) > 0
    }

@router.post("/api/features-table/reset-data-type/{feature_name}")
def reset_feature_data_type(request: Request, feature_name: str):
    """Reset a feature's data type to the auto-detected value."""
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    # Initialize cache if empty
    if not FEATURE_CACHE:
        initialize_feature_cache(df)
    
    # Get feature from cache
    feature = get_feature_from_cache(feature_name)
    if not feature:
        return JSONResponse(status_code=404, content={"success": False, "message": f"Feature '{feature_name}' not found."})
    
    try:
        old_type = feature.data_type
        feature.reset_to_auto_detected_type()
        new_type = feature.data_type
        
        return {
            "success": True,
            "feature_name": feature_name,
            "previous_data_type": old_type,
            "new_data_type": new_type,
            "auto_detected_data_type": feature.auto_detected_data_type,
            "message": f"Data type reset from {old_type} to auto-detected value {new_type}. Correlations and informative missingness data have been cleared and will be recalculated."
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error resetting data type: {str(e)}"})