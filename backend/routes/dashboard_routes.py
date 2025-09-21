from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io
import math
from pyampute.exploration.mcar_statistical_tests import MCARTest
from models.feature import FEATURE_CACHE, calculate_all_recommendations, group_recommendations_by_type, initialize_feature_cache

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
    total_rows = df.shape[0]
    rows_with_missing = df.isnull().any(axis=1).sum()
    missing_percentage = (rows_with_missing / total_rows * 100) if total_rows > 0 else 0

    return {
        "success": True,
        "total_missing_cases": int(rows_with_missing),
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
    Includes comprehensive error handling and fallback behavior.
    Returns the mechanism data or error information if not available/calculable.
    """
    import logging
    import traceback
    
    logger = logging.getLogger(__name__)
    
    try:
        # Check if mechanism is already cached
        cached_mechanism = getattr(request.app.state, "missing_data_mechanism", None)
        if cached_mechanism is not None:
            logger.debug("Using cached missing data mechanism")
            return cached_mechanism
        
        # If not cached, calculate and cache it
        df, error = get_uploaded_dataframe(request)
        if error:
            logger.warning("No dataframe available for mechanism calculation")
            error_data = {
                "success": False,
                "message": "No dataset available for missing data mechanism analysis.",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "no_data"
            }
            request.app.state.missing_data_mechanism = error_data
            return error_data
        
        # Validate dataframe has missing data
        if not df.isnull().any().any():
            logger.info("No missing data found in dataset")
            mechanism_data = {
                "success": False,
                "message": "No missing data found in dataset - mechanism analysis not applicable.",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "no_missing_data"
            }
            request.app.state.missing_data_mechanism = mechanism_data
            return mechanism_data
        
        # Check if dataset is too small for reliable testing
        if len(df) < 30:
            logger.warning(f"Dataset too small for reliable MCAR testing: {len(df)} rows")
            mechanism_data = {
                "success": False,
                "message": f"Dataset too small for reliable missing data mechanism testing (only {len(df)} rows). At least 30 rows recommended.",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "insufficient_data"
            }
            request.app.state.missing_data_mechanism = mechanism_data
            return mechanism_data
        
        # Attempt MCAR test with enhanced error handling
        try:
            logger.info("Running MCAR test to determine missing data mechanism")
            mt = MCARTest(method="little")
            p_value = mt.little_mcar_test(df)
            logger.debug(f"MCAR test completed with p-value: {p_value}")
            
        except ImportError as e:
            logger.error(f"Missing required library for MCAR test: {str(e)}")
            mechanism_data = {
                "success": False,
                "message": "Required statistical libraries not available for missing data mechanism testing.",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "library_error"
            }
            request.app.state.missing_data_mechanism = mechanism_data
            return mechanism_data
            
        except ValueError as e:
            logger.error(f"Data validation error in MCAR test: {str(e)}")
            mechanism_data = {
                "success": False,
                "message": f"Dataset format not suitable for missing data mechanism testing: {str(e)}",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "data_format_error"
            }
            request.app.state.missing_data_mechanism = mechanism_data
            return mechanism_data
            
        except Exception as e:
            logger.error(f"Unexpected error running MCAR test: {str(e)}")
            logger.error(traceback.format_exc())
            mechanism_data = {
                "success": False,
                "message": f"Error running missing data mechanism test: {str(e)}. Using conservative fallback recommendations.",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "test_error"
            }
            request.app.state.missing_data_mechanism = mechanism_data
            return mechanism_data
        
        # Validate and process test results
        if p_value is None:
            logger.warning("MCAR test returned None p-value")
            mechanism_data = {
                "success": False,
                "message": "Missing data mechanism test did not produce valid results. This may be due to data characteristics or insufficient variation.",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "invalid_result"
            }
        elif isinstance(p_value, float) and (math.isnan(p_value) or math.isinf(p_value)):
            logger.warning(f"MCAR test returned invalid p-value: {p_value}")
            mechanism_data = {
                "success": False,
                "message": "Missing data mechanism test produced invalid statistical results (NaN or infinite values).",
                "p_value": None,
                "mechanism_acronym": None,
                "mechanism_full": None,
                "error_type": "invalid_result"
            }
        else:
            # Valid result - determine mechanism
            try:
                p_value_float = float(p_value)
                
                if p_value_float < 0.05:
                    mechanism_acronym = "MAR or MNAR"
                    mechanism_full = "(Missing at Random or Missing Not at Random)"
                    logger.info(f"Determined mechanism: {mechanism_acronym} (p-value: {p_value_float:.6f})")
                else:
                    mechanism_acronym = "MCAR"
                    mechanism_full = "(Missing Completely at Random)"
                    logger.info(f"Determined mechanism: {mechanism_acronym} (p-value: {p_value_float:.6f})")
                
                mechanism_data = {
                    "success": True,
                    "mechanism_acronym": mechanism_acronym,
                    "mechanism_full": mechanism_full,
                    "p_value": p_value_float,
                    "confidence": "high" if abs(p_value_float - 0.05) > 0.01 else "moderate"
                }
                
            except (ValueError, TypeError) as e:
                logger.error(f"Error processing p-value {p_value}: {str(e)}")
                mechanism_data = {
                    "success": False,
                    "message": f"Error processing statistical test results: {str(e)}",
                    "p_value": None,
                    "mechanism_acronym": None,
                    "mechanism_full": None,
                    "error_type": "processing_error"
                }
        
        # Cache the result
        request.app.state.missing_data_mechanism = mechanism_data
        logger.debug("Cached missing data mechanism result")
        return mechanism_data
        
    except Exception as e:
        # Catch-all error handler
        logger.error(f"Unexpected error in get_cached_missing_mechanism: {str(e)}")
        logger.error(traceback.format_exc())
        
        error_data = {
            "success": False,
            "message": "Unexpected error during missing data mechanism analysis. Using conservative fallback recommendations.",
            "p_value": None,
            "mechanism_acronym": None,
            "mechanism_full": None,
            "error_type": "unexpected_error"
        }
        
        # Cache the error to avoid repeated failures
        try:
            request.app.state.missing_data_mechanism = error_data
        except Exception:
            pass  # If we can't even cache the error, just return it
            
        return error_data

@router.get("/api/missing-mechanism")
def missing_mechanism(request: Request):
    mechanism_data = get_cached_missing_mechanism(request)
    if mechanism_data is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data available."})
    
    if not mechanism_data["success"]:
        return JSONResponse(status_code=200, content=mechanism_data)
    
    return mechanism_data

@router.get("/api/missing-data-recommendations")
def get_missing_data_recommendations(request: Request):
    """
    Get intelligent recommendations for handling missing data in features.
    
    Returns grouped recommendations based on established data science rules:
    1. Informative missingness -> Missing-indicator method
    2. Strong correlation -> Remove Features
    3. Categorical + no correlation -> Unknown category
    4. MAR/MNAR mechanism -> ML algorithms/imputation
    5. MCAR mechanism -> All methods valid
    """
    import logging
    import traceback
    
    # Set up logging
    logger = logging.getLogger(__name__)
    
    try:
        # Check if we have data available
        df, error = get_uploaded_dataframe(request)
        if error:
            logger.warning("No dataframe available for recommendations")
            return error
        
        # Validate dataframe has features with missing data
        missing_features = df.isnull().any()
        if not missing_features.any():
            logger.info("No features with missing data found")
            return {
                "success": True,
                "recommendations": [],
                "message": "No features with missing data found in the dataset."
            }
        
        # Initialize cache if empty with error handling
        try:
            if not FEATURE_CACHE:
                logger.info("Initializing feature cache")
                initialize_feature_cache(df)
                
            # Verify cache was populated
            if not FEATURE_CACHE:
                logger.error("Feature cache initialization failed - cache is empty")
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "message": "Failed to initialize feature analysis. Please try uploading your data again.",
                        "error_type": "cache_initialization"
                    }
                )
                
        except Exception as cache_error:
            logger.error(f"Error initializing feature cache: {str(cache_error)}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Failed to analyze dataset features. Please ensure your data is properly formatted.",
                    "error_type": "cache_error"
                }
            )
        
        # Get dataset missing data mechanism with fallback handling
        dataset_mechanism = None
        mechanism_error = None
        
        try:
            mechanism_data = get_cached_missing_mechanism(request)
            if mechanism_data and mechanism_data.get("success"):
                dataset_mechanism = mechanism_data.get("mechanism_acronym")
                logger.info(f"Using dataset mechanism: {dataset_mechanism}")
            else:
                mechanism_error = mechanism_data.get("message") if mechanism_data else "Unknown error"
                logger.warning(f"Could not determine dataset mechanism: {mechanism_error}")
                # Continue without mechanism - recommendations will use fallback logic
                
        except Exception as mech_error:
            mechanism_error = str(mech_error)
            logger.warning(f"Error getting dataset mechanism: {mechanism_error}")
            # Continue without mechanism - recommendations will use fallback logic
        
        # Calculate recommendations for all features with missing data
        try:
            logger.info("Calculating recommendations for all features")
            recommendations = calculate_all_recommendations(dataset_mechanism)
            
            # Filter out features with no recommendations and log any failures
            valid_recommendations = {}
            failed_features = []
            
            for name, rec in recommendations.items():
                if rec is not None:
                    valid_recommendations[name] = rec
                else:
                    failed_features.append(name)
                    logger.warning(f"No recommendation calculated for feature: {name}")
            
            # Log summary
            logger.info(f"Successfully calculated recommendations for {len(valid_recommendations)} features")
            if failed_features:
                logger.warning(f"Failed to calculate recommendations for {len(failed_features)} features: {failed_features}")
            
        except Exception as calc_error:
            logger.error(f"Error calculating recommendations: {str(calc_error)}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Failed to calculate recommendations. This may be due to insufficient data or analysis errors.",
                    "error_type": "calculation_error"
                }
            )
        
        # Handle case where no valid recommendations were generated
        if not valid_recommendations:
            logger.warning("No valid recommendations generated")
            return {
                "success": True,
                "recommendations": [],
                "message": "Unable to generate recommendations for the available features. This may be due to insufficient data for analysis."
            }
        
        # Group features by recommendation type with error handling
        try:
            grouped_recommendations = group_recommendations_by_type(valid_recommendations)
            logger.info(f"Successfully grouped recommendations into {len(grouped_recommendations)} categories")
            
        except Exception as group_error:
            logger.error(f"Error grouping recommendations: {str(group_error)}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Failed to format recommendation results. Please try again.",
                    "error_type": "formatting_error"
                }
            )
        
        # Prepare response with additional metadata
        response = {
            "success": True,
            "recommendations": grouped_recommendations,
            "metadata": {
                "total_features_analyzed": len(valid_recommendations),
                "dataset_mechanism": dataset_mechanism,
                "mechanism_available": dataset_mechanism is not None
            }
        }
        
        # Add warning if mechanism couldn't be determined
        if mechanism_error:
            response["warnings"] = [
                f"Dataset missing data mechanism could not be determined: {mechanism_error}. Using conservative fallback recommendations."
            ]
        
        logger.info("Successfully generated recommendations response")
        return response
        
    except Exception as e:
        # Catch-all error handler
        logger.error(f"Unexpected error in get_missing_data_recommendations: {str(e)}")
        logger.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected error occurred while generating recommendations. Please try refreshing the page or contact support if the problem persists.",
                "error_type": "unexpected_error"
            }
        ) 