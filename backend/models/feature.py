import math
import pandas as pd
import numpy as np
from typing import List, Optional, Dict
from scipy import stats
from scipy.stats import chi2_contingency
from scipy.stats import f_oneway
from datetime import datetime

# In-memory storage for features
FEATURE_CACHE = {}

class Feature:
    
    def __init__(self, name: str, data_type: str, number_missing: int, percentage_missing: float, original_dtype: str = None):
        self._name = name
        self._data_type = data_type
        self._number_missing = number_missing
        self._percentage_missing = percentage_missing
        self._original_dtype = original_dtype  # Store the original pandas dtype for reference
        self._correlated_features: List[Dict] = []
        self._informative_missingness: Dict = {"is_informative": False, "p_value": 1.0}
        self._correlations_calculated = False
        self._informative_calculated = False
        self._last_thresholds: Dict = {}
        self._last_updated = datetime.now()
        
        self._recommendation: Optional[Dict] = None
        self._recommendation_calculated = False
    
    # Getters
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def data_type(self) -> str:
        return self._data_type
    
    @property
    def number_missing(self) -> int:
        return self._number_missing
    
    @property
    def percentage_missing(self) -> float:
        return self._percentage_missing
    
    @property
    def correlated_features(self) -> List[Dict]:
        return self._correlated_features.copy()  # Return copy to prevent external modification
    
    @property
    def informative_missingness(self) -> Dict:
        return self._informative_missingness.copy()  # Return copy to prevent external modification
    
    @property
    def correlations_calculated(self) -> bool:
        return self._correlations_calculated
    
    @property
    def informative_calculated(self) -> bool:
        return self._informative_calculated
    
    @property
    def last_updated(self) -> datetime:
        return self._last_updated
    
    @property
    def original_dtype(self) -> str:
        return self._original_dtype
    
    @property
    def auto_detected_data_type(self) -> str:
        """Get the auto-detected data type based on the original pandas dtype."""
        if self._original_dtype in ['int64', 'float64']:
            return "N"
        else:
            return "C"
    
    @property
    def is_data_type_manually_set(self) -> bool:
        """Check if the data type has been manually changed from the auto-detected type."""
        return self._data_type != self.auto_detected_data_type
    
    @property
    def recommendation(self) -> Optional[Dict]:
        """Get the recommendation data."""
        return self._recommendation.copy() if self._recommendation else None
    
    @property
    def recommendation_calculated(self) -> bool:
        """Check if recommendation has been calculated."""
        return self._recommendation_calculated
    
    # Setters
    @data_type.setter
    def data_type(self, value: str):
        if value not in ("N", "C"):
            raise ValueError("Data type must be 'N' or 'C'")
        
        # Only update if the value is actually changing
        if self._data_type != value:
            self._data_type = value
            # Clear correlations since data type change might affect correlation calculations
            self.clear_correlations()
            # Clear informative missingness since it might be affected by data type
            self._informative_calculated = False
            self._informative_missingness = {"is_informative": False, "p_value": 1.0}
            # Clear recommendation since data type change affects recommendations
            self._recommendation = None
            self._recommendation_calculated = False
            self._last_updated = datetime.now()
    
    def set_correlated_features(self, correlations: List[Dict]):
        """Set correlated features and mark as calculated."""
        self._correlated_features = correlations
        self._correlations_calculated = True
        # Clear recommendation since correlations affect recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def set_informative_missingness(self, informative_data: Dict):
        """Set informative missingness data and mark as calculated."""
        self._informative_missingness = informative_data
        self._informative_calculated = True
        # Clear recommendation since informative missingness affects recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def set_recommendation(self, recommendation_data: Dict):
        """Set recommendation data and mark as calculated."""
        self._recommendation = recommendation_data.copy()
        self._recommendation_calculated = True
        self._last_updated = datetime.now()
    
    def get_recommendation(self) -> Optional[Dict]:
        """Get recommendation data (alias for recommendation property)."""
        return self.recommendation
    
    def needs_recommendation_recalculation(self) -> bool:
        """Check if recommendation needs recalculation."""
        # Recommendation needs recalculation if:
        # 1. It hasn't been calculated yet
        # 2. Correlations or informative missingness have been recalculated since last recommendation
        return not self._recommendation_calculated
    
    def clear_correlations(self):
        """Clear correlations to force recalculation with new thresholds."""
        self._correlated_features = []
        self._correlations_calculated = False
        self._last_thresholds = {}
        # Clear recommendation since correlations affect recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def set_correlated_features_with_thresholds(self, correlations: List[Dict], thresholds: Dict):
        """Set correlated features with the thresholds used for calculation."""
        self._correlated_features = correlations
        self._correlations_calculated = True
        self._last_thresholds = thresholds.copy()
        # Clear recommendation since correlations affect recommendations
        self._recommendation = None
        self._recommendation_calculated = False
        self._last_updated = datetime.now()
    
    def should_recalculate_correlations(self, new_thresholds: Dict) -> bool:
        """Check if correlations should be recalculated based on threshold changes."""
        if not self._correlations_calculated:
            return True
        
        # Compare thresholds
        for key, value in new_thresholds.items():
            if self._last_thresholds.get(key) != value:
                return True
        
        return False
    
    def reset_to_auto_detected_type(self):
        """Reset the data type to the auto-detected value based on original dtype."""
        auto_type = self.auto_detected_data_type
        if self._data_type != auto_type:
            self.data_type = auto_type  # This will trigger the setter and clear related data
    
    def to_dict(self) -> Dict:
        """Convert feature to dictionary for API response."""
        return {
            "feature_name": self._name,
            "data_type": self._data_type,
            "original_dtype": self._original_dtype,
            "auto_detected_data_type": self.auto_detected_data_type,
            "is_data_type_manually_set": self.is_data_type_manually_set,
            "number_missing": self._number_missing,
            "percentage_missing": self._percentage_missing,
            "correlated_features": self._correlated_features,
            "informative_missingness": self._informative_missingness,
            "correlations_calculated": self._correlations_calculated,
            "informative_calculated": self._informative_calculated,
            "last_thresholds": self._last_thresholds,
            "last_updated": self._last_updated.isoformat(),
            "recommendation": self._recommendation,
            "recommendation_calculated": self._recommendation_calculated
        }
    
    def to_basic_dict(self) -> Dict:
        """Convert feature to basic dictionary for table display."""
        return {
            "feature_name": self._name,
            "data_type": self._data_type,
            "number_missing": self._number_missing,
            "percentage_missing": self._percentage_missing,
        }


def get_feature_from_cache(feature_name: str) -> Optional[Feature]:
    """Get a feature from the cache."""
    return FEATURE_CACHE.get(feature_name)


def get_all_features_from_cache() -> List[Feature]:
    """Get all features from the cache, sorted by percentage missing."""
    features = list(FEATURE_CACHE.values())
    features.sort(key=lambda x: x.percentage_missing, reverse=True)
    return features


def initialize_feature_cache(df: pd.DataFrame):
    """Initialize the feature cache with all features that have missing data."""
    global FEATURE_CACHE
    FEATURE_CACHE.clear()
    
    for column in df.columns:
        number_missing = df[column].isnull().sum()
        if number_missing == 0:
            continue
            
        # Auto-detect data type based on pandas dtype
        data_type = "N" if df[column].dtype in ['int64', 'float64'] else "C"
        percentage_missing = round((number_missing / len(df)) * 100, 2)
        
        feature = Feature(
            name=column,
            data_type=data_type,
            number_missing=int(number_missing),
            percentage_missing=percentage_missing,
            original_dtype=str(df[column].dtype)
        )
        
        FEATURE_CACHE[column] = feature


def calculate_eta(categorical_series, numerical_series):
    """Calculate Eta (η) for nominal-by-interval association."""
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

        eta = math.sqrt(eta_squared)
        
        return eta, p_value
        
    except Exception as e:
        print(f"Error calculating eta: {str(e)}")
        return None, None


def calculate_feature_correlations_with_thresholds(
    df: pd.DataFrame, 
    feature_name: str, 
    pearson_threshold: float = 0.7,
    cramer_v_threshold: float = 0.7,
    eta_threshold: float = 0.7
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
                
                eta, p_value = calculate_eta(categorical_col, numerical_col)
                if eta is not None and not np.isnan(eta) and eta >= eta_threshold:
                    correlations.append({
                        "feature_name": col,
                        "correlation_value": round(eta, 3),
                        "correlation_type": "η",
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