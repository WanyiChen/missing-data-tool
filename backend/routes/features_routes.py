from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi import Body
import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
from scipy import stats
from scipy.stats import chi2_contingency
from scipy.stats import f_oneway

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

def calculate_eta_squared(categorical_series, numerical_series):
    """Calculate Eta-squared (η²) for nominal-by-interval association."""
    try:
        # Remove missing values
        valid_mask = ~(categorical_series.isnull() | numerical_series.isnull())
        cat_valid = categorical_series[valid_mask]
        num_valid = numerical_series[valid_mask]
        
        if len(cat_valid) < 10:  # Need sufficient data
            return None, None
            
        # Group numerical values by categorical values
        groups = [group for name, group in num_valid.groupby(cat_valid)]
        
        if len(groups) < 2:  # Need at least 2 categories
            return None, None
            
        # Perform one-way ANOVA
        f_stat, p_value = f_oneway(*groups)
        
        # Calculate Eta-squared
        # η² = SS_between / SS_total
        # For one-way ANOVA: η² = F / (F + df_within)
        
        # Calculate degrees of freedom
        n_total = len(num_valid)
        k = len(groups)  # number of groups
        df_between = k - 1
        df_within = n_total - k
        
        # Calculate eta-squared
        eta_squared = f_stat / (f_stat + df_within)
        
        return eta_squared, p_value
        
    except Exception as e:
        print(f"Error calculating eta-squared: {str(e)}")
        return None, None

def calculate_feature_correlation(df: pd.DataFrame, feature_name: str) -> Optional[Dict]:
    """Calculate correlation between a feature and other features."""
    try:
        if feature_name not in df.columns:
            return None
            
        correlations = {}
        
        for col in df.columns:
            if col == feature_name:
                continue
                
            # Skip if either feature has no missing values (no variation)
            if df[feature_name].isnull().all() or df[col].isnull().all():
                continue
                
            if df[feature_name].dtype in ['int64', 'float64'] and df[col].dtype in ['int64', 'float64']:
                # Both features are numerical - use Pearson correlation
                valid_mask = ~(df[feature_name].isnull() | df[col].isnull())
                if valid_mask.sum() > 10:  # Need sufficient data
                    corr, p_value = stats.pearsonr(
                        df[feature_name][valid_mask], 
                        df[col][valid_mask]
                    )
                    if not np.isnan(corr):
                        correlations[col] = {
                            "feature_name": col,
                            "correlation_value": round(corr, 3),
                            "correlation_type": "r",
                            "p_value": p_value
                        }
            elif df[feature_name].dtype in ['int64', 'float64'] or df[col].dtype in ['int64', 'float64']:
                # One numerical, one categorical - use Eta-squared
                numerical_col = df[feature_name] if df[feature_name].dtype in ['int64', 'float64'] else df[col]
                categorical_col = df[col] if df[col].dtype not in ['int64', 'float64'] else df[feature_name]
                
                eta_squared, p_value = calculate_eta_squared(categorical_col, numerical_col)
                if eta_squared is not None and not np.isnan(eta_squared):
                    correlations[col] = {
                        "feature_name": col,
                        "correlation_value": round(eta_squared, 3),
                        "correlation_type": "η²",
                        "p_value": p_value
                    }
            else:
                # Both features are categorical - use Cramer's V
                valid_mask = ~(df[feature_name].isnull() | df[col].isnull())
                if valid_mask.sum() > 10:
                    contingency_table = pd.crosstab(df[feature_name][valid_mask], df[col][valid_mask])
                    if contingency_table.shape[0] > 1 and contingency_table.shape[1] > 1:
                        chi2, p_value, dof, expected = chi2_contingency(contingency_table)
                        n = valid_mask.sum()
                        min_dim = min(contingency_table.shape) - 1
                        if min_dim > 0:
                            cramer_v = np.sqrt(chi2 / (n * min_dim))
                            if not np.isnan(cramer_v):
                                correlations[col] = {
                                    "feature_name": col,
                                    "correlation_value": round(cramer_v, 3),
                                    "correlation_type": "V",
                                    "p_value": p_value
                                }
        
        # Return the feature with highest absolute correlation
        if correlations:
            best_corr = max(correlations.values(), key=lambda x: abs(x["correlation_value"]))
            return best_corr
            
        return None
    except Exception as e:
        print(f"Error calculating correlation for {feature_name}: {str(e)}")
        return None

def calculate_feature_correlations_with_thresholds(
    df: pd.DataFrame, 
    feature_name: str, 
    pearson_threshold: float = 0.7,
    cramer_v_threshold: float = 0.7,
    eta_squared_threshold: float = 0.7
) -> List[Dict]:
    """Calculate correlations between a feature and other features, returning those that meet thresholds."""
    try:
        if feature_name not in df.columns:
            return []
            
        correlations = []
        
        for col in df.columns:
            if col == feature_name:
                continue
                
            # Skip if either feature has no missing values (no variation)
            if df[feature_name].isnull().all() or df[col].isnull().all():
                continue
                
            if df[feature_name].dtype in ['int64', 'float64'] and df[col].dtype in ['int64', 'float64']:
                # Both features are numerical - use Pearson correlation
                valid_mask = ~(df[feature_name].isnull() | df[col].isnull())
                if valid_mask.sum() > 10:  # Need sufficient data
                    corr, p_value = stats.pearsonr(
                        df[feature_name][valid_mask], 
                        df[col][valid_mask]
                    )
                    if not np.isnan(corr) and abs(corr) >= pearson_threshold:
                        correlations.append({
                            "feature_name": col,
                            "correlation_value": round(corr, 3),
                            "correlation_type": "r",
                            "p_value": p_value
                        })
            elif df[feature_name].dtype in ['int64', 'float64'] or df[col].dtype in ['int64', 'float64']:
                # One numerical, one categorical - use Eta-squared
                numerical_col = df[feature_name] if df[feature_name].dtype in ['int64', 'float64'] else df[col]
                categorical_col = df[col] if df[col].dtype not in ['int64', 'float64'] else df[feature_name]
                
                eta_squared, p_value = calculate_eta_squared(categorical_col, numerical_col)
                if eta_squared is not None and not np.isnan(eta_squared) and eta_squared >= eta_squared_threshold:
                    correlations.append({
                        "feature_name": col,
                        "correlation_value": round(eta_squared, 3),
                        "correlation_type": "η²",
                        "p_value": p_value
                    })
            else:
                # Both features are categorical - use Cramer's V
                valid_mask = ~(df[feature_name].isnull() | df[col].isnull())
                if valid_mask.sum() > 10:
                    contingency_table = pd.crosstab(df[feature_name][valid_mask], df[col][valid_mask])
                    if contingency_table.shape[0] > 1 and contingency_table.shape[1] > 1:
                        chi2, p_value, dof, expected = chi2_contingency(contingency_table)
                        n = valid_mask.sum()
                        min_dim = min(contingency_table.shape) - 1
                        if min_dim > 0:
                            cramer_v = np.sqrt(chi2 / (n * min_dim))
                            if not np.isnan(cramer_v) and cramer_v >= cramer_v_threshold:
                                correlations.append({
                                    "feature_name": col,
                                    "correlation_value": round(cramer_v, 3),
                                    "correlation_type": "V",
                                    "p_value": p_value
                                })
        
        # Sort by absolute correlation value (descending)
        correlations.sort(key=lambda x: abs(x["correlation_value"]), reverse=True)
        
        return correlations
    except Exception as e:
        print(f"Error calculating correlations for {feature_name}: {str(e)}")
        return []

def calculate_informative_missingness(df: pd.DataFrame, feature_name: str) -> Dict:
    """Calculate whether missingness of a feature is informative (placeholder implementation)."""
    # TODO: Implement proper informative missingness calculation
    # For now, return placeholder values
    return {
        "is_informative": False,  # Placeholder
        "p_value": 1.0  # Placeholder
    }

@router.get("/api/missing-features-table")
def get_features_table(request: Request, page: int = 0, limit: int = 10):
    """Get paginated list of features with missing data."""
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    try:
        # Get all features with missing data
        features_with_missing = []
        
        for column in df.columns:
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
            }
            features_with_missing.append(feature_info)
        
        # Sort by percentage missing (descending)
        features_with_missing.sort(key=lambda x: x["percentage_missing"], reverse=True)
        
        # Calculate pagination
        total_features = len(features_with_missing)
        start_idx = page * limit
        end_idx = start_idx + limit
        paginated_features = features_with_missing[start_idx:end_idx]
        
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

@router.get("/api/feature-details/{feature_name}")
def get_feature_details(
    request: Request, 
    feature_name: str,
    pearson_threshold: float = 0.7,
    cramer_v_threshold: float = 0.7,
    eta_squared_threshold: float = 0.7
):
    """Get complete details for a specific feature including correlation and informative missingness."""
    df, error = get_uploaded_dataframe(request)
    if error:
        return error
    
    if feature_name not in df.columns:
        return JSONResponse(
            status_code=404, 
            content={"success": False, "message": f"Feature '{feature_name}' not found."}
        )
    
    try:
        # Calculate basic statistics
        number_missing = df[feature_name].isnull().sum()
        percentage_missing = round((number_missing / len(df)) * 100, 2)
        
        # Use override if present, otherwise auto-detect
        data_type = FEATURE_TYPE_OVERRIDES.get(feature_name)
        if data_type not in ("N", "C"):
            data_type = "N" if df[feature_name].dtype in ['int64', 'float64'] else "C"
        
        # Calculate correlations with other features using thresholds
        correlations_data = calculate_feature_correlations_with_thresholds(
            df, feature_name, pearson_threshold, cramer_v_threshold, eta_squared_threshold
        )
        
        # Calculate informative missingness (placeholder)
        informative_data = calculate_informative_missingness(df, feature_name)
        
        return {
            "success": True,
            "feature_name": feature_name,
            "data_type": data_type,
            "number_missing": int(number_missing),
            "percentage_missing": percentage_missing,
            "correlated_features": correlations_data,
            "informative_missingness": informative_data
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
    if feature_name not in df.columns:
        return JSONResponse(status_code=404, content={"success": False, "message": f"Feature '{feature_name}' not found."})
    # Store override (in-memory for now; replace with persistent storage as needed)
    FEATURE_TYPE_OVERRIDES[feature_name] = new_type
    return {"success": True, "feature_name": feature_name, "data_type": new_type}