from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from scipy.stats import ks_2samp, chi2_contingency
from routes.features_routes import (
    get_uploaded_dataframe, 
    initialize_feature_cache, 
    get_all_features_from_cache, 
    FEATURE_CACHE
)

router = APIRouter()


def perform_ks_test(before_series: pd.Series, after_series: pd.Series) -> float:
    """Perform Kolmogorov-Smirnov test for numerical features."""
    try:
        # Remove missing values for comparison
        before_clean = before_series.dropna()
        after_clean = after_series.dropna()
        
        # Validate data availability
        if len(before_clean) == 0 or len(after_clean) == 0:
            return 1.0  # No significant change if no data
        
        # Need sufficient data for meaningful test
        if len(before_clean) < 10 or len(after_clean) < 10:
            return 1.0  # No significant change if insufficient data
        
        # Check for identical distributions (all same values)
        if before_clean.nunique() == 1 and after_clean.nunique() == 1:
            if before_clean.iloc[0] == after_clean.iloc[0]:
                return 1.0  # Identical constant distributions
        
        # Perform KS test
        statistic, p_value = ks_2samp(before_clean, after_clean)
        
        # Validate p-value result
        if pd.isna(p_value) or not (0 <= p_value <= 1):
            return 1.0  # Return non-significant if invalid p-value
        
        return p_value
        
    except ValueError as e:
        print(f"ValueError in KS test: {str(e)}")
        return 1.0  # Return non-significant p-value on value error
    except Exception as e:
        print(f"Unexpected error in KS test: {str(e)}")
        return 1.0  # Return non-significant p-value on error


def perform_chi_square_test(before_series: pd.Series, after_series: pd.Series) -> float:
    """Perform Chi-square test for categorical features."""
    try:
        # Remove missing values for comparison
        before_clean = before_series.dropna()
        after_clean = after_series.dropna()
        
        # Validate data availability
        if len(before_clean) == 0 or len(after_clean) == 0:
            return 1.0  # No significant change if no data
        
        # Need sufficient data for meaningful test
        if len(before_clean) < 10 or len(after_clean) < 10:
            return 1.0  # No significant change if insufficient data
        
        # Get value counts for both series
        before_counts = before_clean.value_counts()
        after_counts = after_clean.value_counts()
        
        # Get all unique categories
        all_categories = set(before_counts.index) | set(after_counts.index)
        
        # Need at least 2 categories for meaningful comparison
        if len(all_categories) < 2:
            return 1.0  # No significant change if only one category
        
        # Create contingency table
        contingency_data = []
        for category in all_categories:
            before_count = before_counts.get(category, 0)
            after_count = after_counts.get(category, 0)
            contingency_data.append([before_count, after_count])
        
        contingency_table = np.array(contingency_data)
        
        # Validate contingency table
        if contingency_table.shape[0] < 2 or np.sum(contingency_table) == 0:
            return 1.0
        
        # Check for expected frequencies (chi-square assumption)
        # At least 80% of cells should have expected frequency >= 5
        row_totals = np.sum(contingency_table, axis=1)
        col_totals = np.sum(contingency_table, axis=0)
        total = np.sum(contingency_table)
        
        expected_freq = np.outer(row_totals, col_totals) / total
        low_expected = np.sum(expected_freq < 5)
        total_cells = expected_freq.size
        
        if low_expected / total_cells > 0.2:  # More than 20% of cells have expected < 5
            return 1.0  # Chi-square assumptions not met
        
        # Perform chi-square test
        chi2, p_value, dof, expected = chi2_contingency(contingency_table)
        
        # Validate p-value result
        if pd.isna(p_value) or not (0 <= p_value <= 1):
            return 1.0  # Return non-significant if invalid p-value
        
        return p_value
        
    except ValueError as e:
        print(f"ValueError in Chi-square test: {str(e)}")
        return 1.0  # Return non-significant p-value on value error
    except Exception as e:
        print(f"Unexpected error in Chi-square test: {str(e)}")
        return 1.0  # Return non-significant p-value on error


def generate_histogram_data(before_series: pd.Series, after_series: pd.Series) -> Dict[str, Any]:
    """Generate histogram data for numerical features."""
    try:
        before_clean = before_series.dropna()
        after_clean = after_series.dropna()
        
        if len(before_clean) == 0 or len(after_clean) == 0:
            return {"before": {"bins": [], "counts": []}, "after": {"bins": [], "counts": []}}
        
        # Use the same bins for both histograms for comparison
        min_val = min(before_clean.min(), after_clean.min())
        max_val = max(before_clean.max(), after_clean.max())
        
        # Create 10 bins
        bins = np.linspace(min_val, max_val, 11)
        
        # Calculate histograms
        before_counts, _ = np.histogram(before_clean, bins=bins)
        after_counts, _ = np.histogram(after_clean, bins=bins)
        
        return {
            "before": {
                "bins": bins.tolist(),
                "counts": before_counts.tolist()
            },
            "after": {
                "bins": bins.tolist(),
                "counts": after_counts.tolist()
            }
        }
        
    except Exception as e:
        print(f"Error generating histogram data: {str(e)}")
        return {"before": {"bins": [], "counts": []}, "after": {"bins": [], "counts": []}}


def generate_pie_chart_data(before_series: pd.Series, after_series: pd.Series) -> Dict[str, Any]:
    """Generate pie chart data for categorical features."""
    try:
        before_clean = before_series.dropna()
        after_clean = after_series.dropna()
        
        if len(before_clean) == 0 or len(after_clean) == 0:
            return {"before": {}, "after": {}}
        
        # Get value counts
        before_counts = before_clean.value_counts().to_dict()
        after_counts = after_clean.value_counts().to_dict()
        
        return {
            "before": before_counts,
            "after": after_counts
        }
        
    except Exception as e:
        print(f"Error generating pie chart data: {str(e)}")
        return {"before": {}, "after": {}}


def analyze_missing_data_impact(df: pd.DataFrame) -> Dict[str, Any]:
    """Main analysis function leveraging existing FEATURE_CACHE."""
    try:
        # Validate input dataframe
        if df is None:
            return {
                'success': False,
                'error': 'No dataset provided for analysis.'
            }
        
        if df.empty:
            return {
                'success': False,
                'error': 'Dataset is empty - cannot perform analysis.'
            }
        
        # Initialize cache if not already done
        try:
            if not FEATURE_CACHE:
                initialize_feature_cache(df)
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to initialize feature cache: {str(e)}'
            }
        
        # Create copy of original dataset
        try:
            original_df = df.copy()
            cleaned_df = df.dropna()
        except MemoryError:
            return {
                'success': False,
                'error': 'Dataset is too large to process - insufficient memory.'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to create dataset copies: {str(e)}'
            }
        
        # Calculate deletion statistics
        rows_deleted = len(original_df) - len(cleaned_df)
        rows_remaining = len(cleaned_df)
        total_original_rows = len(original_df)
        
        # Handle case where no rows have missing data
        if rows_deleted == 0:
            return {
                'success': True,
                'rows_deleted': 0,
                'rows_remaining': rows_remaining,
                'total_original_rows': total_original_rows,
                'affected_features': []
            }
        
        # Handle case where all rows are deleted
        if rows_remaining == 0:
            return {
                'success': False,
                'error': 'All rows contain missing data - no data remaining after deletion.'
            }
        
        # Analyze each cached feature for distribution changes
        affected_features = []
        failed_features = []
        
        try:
            cached_features = get_all_features_from_cache()
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to retrieve cached features: {str(e)}'
            }
        
        for feature in cached_features:
            column = feature.name
            
            try:
                # Skip if column doesn't exist in dataframe
                if column not in original_df.columns:
                    continue
                
                # Skip if column has no valid data in either dataset
                if original_df[column].dropna().empty or cleaned_df[column].dropna().empty:
                    continue
                
                # Determine test type based on cached feature data type
                if feature.data_type == "N":  # Numerical
                    p_value = perform_ks_test(original_df[column], cleaned_df[column])
                else:  # Categorical
                    p_value = perform_chi_square_test(original_df[column], cleaned_df[column])
                
                # Check if change is significant (p < 0.05)
                if p_value < 0.05:
                    # Generate appropriate distribution data
                    try:
                        if feature.data_type == "N":
                            distribution_data = generate_histogram_data(original_df[column], cleaned_df[column])
                        else:
                            distribution_data = generate_pie_chart_data(original_df[column], cleaned_df[column])
                        
                        feature_data = {
                            'feature_name': column,
                            'feature_type': 'numerical' if feature.data_type == "N" else 'categorical',
                            'p_value': round(p_value, 6),
                            'distribution_data': distribution_data
                        }
                        affected_features.append(feature_data)
                        
                    except Exception as e:
                        failed_features.append(f"{column}: {str(e)}")
                        continue
                        
            except Exception as e:
                failed_features.append(f"{column}: {str(e)}")
                continue
        
        # Log failed features but don't fail the entire analysis
        if failed_features:
            print(f"Warning: Failed to analyze features: {failed_features}")
        
        return {
            'success': True,
            'rows_deleted': rows_deleted,
            'rows_remaining': rows_remaining,
            'total_original_rows': total_original_rows,
            'affected_features': affected_features
        }
        
    except MemoryError:
        return {
            'success': False,
            'error': 'Insufficient memory to perform analysis - dataset too large.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Unexpected error during analysis: {str(e)}'
        }


@router.post("/api/delete-missing-data-analysis")
def delete_missing_data_analysis(request: Request):
    """
    Perform missing data deletion and statistical analysis.
    
    This endpoint:
    1. Creates a copy of the original dataset
    2. Removes all rows with missing data
    3. Performs statistical tests to identify features with significant distribution changes
    4. Returns analysis results with visualization data
    """
    try:
        # Get the uploaded dataframe
        df, error = get_uploaded_dataframe(request)
        if error:
            return error
        
        # Additional validation: Check if dataset has any columns
        if len(df.columns) == 0:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Dataset has no columns to analyze."
                }
            )
        
        # Check if dataset has any rows
        if len(df) == 0:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Dataset is empty - no rows to analyze."
                }
            )
        
        # Perform the analysis
        result = analyze_missing_data_impact(df)
        
        if not result.get('success', False):
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": result.get('error', 'Analysis failed due to an internal error.')
                }
            )
        
        return {
            "success": True,
            "rows_deleted": result['rows_deleted'],
            "rows_remaining": result['rows_remaining'],
            "total_original_rows": result['total_original_rows'],
            "affected_features": result['affected_features']
        }
        
    except MemoryError:
        return JSONResponse(
            status_code=413,
            content={
                "success": False,
                "message": "Dataset is too large to process. Please try with a smaller dataset."
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Unexpected error during analysis: {str(e)}"
            }
        )